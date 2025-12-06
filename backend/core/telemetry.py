"""OpenTelemetry and Prometheus configuration for Django application.

This module configures the application to send telemetry data to an
LGTM stack (Loki, Grafana, Tempo, Mimir).

Telemetry includes:
- Logs → Loki (pushed via python-logging-loki)
- Traces → Tempo (pushed via OpenTelemetry OTLP)
- Metrics → Mimir (scraped via Prometheus /metrics endpoint)
"""

import logging
import socket
import urllib.parse

import requests
from django.conf import settings

# Get logger for this module
logger = logging.getLogger(__name__)


def configure_telemetry():
    """Configure OpenTelemetry to send traces to LGTM stack.

    Note: Metrics are handled separately via Prometheus (see django-prometheus middleware).
    This function only configures distributed tracing.

    This function should be called early in application startup.
    """
    # Only configure if monitoring is enabled
    if not getattr(settings, "ENABLE_MONITORING", False):
        logger.info("Monitoring disabled - skipping telemetry configuration")
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.celery import CeleryInstrumentor
    from opentelemetry.instrumentation.django import DjangoInstrumentor
    from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    tempo_endpoint = getattr(settings, "TEMPO_ENDPOINT", "http://tempo:4317")
    service_name = getattr(settings, "SERVICE_NAME", "life-app-backend")
    environment = getattr(settings, "ENVIRONMENT", "development")

    # Create resource attributes (labels for filtering in Grafana)
    resource = Resource.create(
        {
            "service.name": service_name,
            "deployment.environment": environment,
            "service.version": "1.0.0",
            "service.namespace": "life-app",
            "app": service_name,  # For Loki/Grafana filtering
            "env": environment,  # For Loki/Grafana filtering
        }
    )

    # Configure distributed tracing → Tempo
    trace_provider = TracerProvider(resource=resource)
    trace_exporter = OTLPSpanExporter(endpoint=tempo_endpoint, insecure=True)
    trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(trace_provider)

    # Auto-instrument Django, PostgreSQL, Redis, Requests, and Celery for tracing
    DjangoInstrumentor().instrument()
    PsycopgInstrumentor().instrument()
    RedisInstrumentor().instrument()
    RequestsInstrumentor().instrument()
    CeleryInstrumentor().instrument()

    logger.info(f"OpenTelemetry configured: service={service_name}, env={environment}, tempo={tempo_endpoint}")


def configure_loki_logging():
    """Configure Python logging to send logs to Loki.

    This adds a Loki handler to the root logger with appropriate labels
    for filtering in Grafana.
    """
    # Only configure if monitoring is enabled
    if not getattr(settings, "ENABLE_MONITORING", False):
        return

    try:
        import logging_loki

        loki_url = getattr(settings, "LOKI_URL", "http://loki:3100/loki/api/v1/push")
        service_name = getattr(settings, "SERVICE_NAME", "life-app-backend")
        environment = getattr(settings, "ENVIRONMENT", "development")

        handler = logging_loki.LokiHandler(
            url=loki_url,
            tags={
                "app": service_name,
                "env": environment,
                "framework": "django",
                "service": service_name,
            },
            version="1",
        )

        # Add Loki handler to root logger
        logging.root.addHandler(handler)
        logger.info(f"Loki logging configured: url={loki_url}, app={service_name}, env={environment}")

    except ImportError:
        logger.warning("python-logging-loki not installed - skipping Loki configuration")
    except Exception as e:
        logger.error(f"Failed to configure Loki logging: {e}")


def check_lgtm_connectivity() -> dict[str, bool]:
    """Check connectivity to LGTM stack endpoints.

    Tests network connectivity to Loki, Tempo, and Mimir to help diagnose
    monitoring configuration issues. This is non-blocking and only logs
    warnings if endpoints are unreachable.

    Returns:
        Dict mapping service name to connectivity status (True = reachable)

    """
    if not getattr(settings, "ENABLE_MONITORING", False):
        msg = "Monitoring disabled - skipping connectivity check"
        logger.info(msg)
        return {}

    loki_url = getattr(settings, "LOKI_URL", "http://loki:3100/loki/api/v1/push")
    tempo_endpoint = getattr(settings, "TEMPO_ENDPOINT", "http://tempo:4317")
    mimir_endpoint = getattr(settings, "MIMIR_ENDPOINT", "http://mimir:9009")

    results = {}

    # Check Loki (HTTP endpoint)
    try:
        parsed = urllib.parse.urlparse(loki_url)
        loki_base = f"{parsed.scheme}://{parsed.netloc}"
        response = requests.get(f"{loki_base}/ready", timeout=3)
        results["loki"] = response.status_code == 200
        if results["loki"]:
            msg = f"✓ Loki connectivity OK: {loki_base}"
            logger.info(msg)
        else:
            msg = f"✗ Loki returned status {response.status_code}: {loki_base}"
            logger.warning(msg)
    except requests.exceptions.RequestException as e:
        results["loki"] = False
        msg = f"✗ Cannot reach Loki at {loki_url}: {e}"
        logger.warning(msg)

    # Check Tempo (gRPC endpoint - test TCP connectivity)
    try:
        parsed = urllib.parse.urlparse(tempo_endpoint)
        host = parsed.hostname or "tempo"
        port = parsed.port or 4317

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((host, port))
        sock.close()

        results["tempo"] = result == 0
        if results["tempo"]:
            msg = f"✓ Tempo connectivity OK: {host}:{port}"
            logger.info(msg)
        else:
            msg = f"✗ Cannot reach Tempo at {host}:{port}"
            logger.warning(msg)
    except (socket.gaierror, socket.timeout, OSError) as e:
        results["tempo"] = False
        msg = f"✗ Cannot reach Tempo at {tempo_endpoint}: {e}"
        logger.warning(msg)

    # Check Mimir (HTTP endpoint)
    try:
        parsed = urllib.parse.urlparse(mimir_endpoint)
        mimir_base = f"{parsed.scheme}://{parsed.netloc}"
        response = requests.get(f"{mimir_base}/ready", timeout=3)
        results["mimir"] = response.status_code == 200
        if results["mimir"]:
            msg = f"✓ Mimir connectivity OK: {mimir_base}"
            logger.info(msg)
        else:
            msg = f"✗ Mimir returned status {response.status_code}: {mimir_base}"
            logger.warning(msg)
    except requests.exceptions.RequestException as e:
        results["mimir"] = False
        msg = f"✗ Cannot reach Mimir at {mimir_endpoint}: {e}"
        logger.warning(msg)

    # Summary
    reachable = sum(results.values())
    total = len(results)
    if reachable == total:
        msg = f"LGTM connectivity check: All {total} services reachable"
        logger.info(msg)
    else:
        msg = f"LGTM connectivity check: {reachable}/{total} services reachable"
        logger.warning(msg)

    return results
