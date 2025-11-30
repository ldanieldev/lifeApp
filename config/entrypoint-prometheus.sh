#!/bin/sh
# Entrypoint script for Prometheus to substitute environment variables in config template

set -e

# Substitute environment variables in the template and create the actual config file
sed "s|\${MIMIR_ENDPOINT}|${MIMIR_ENDPOINT}|g" /etc/prometheus/prometheus.yml.template > /etc/prometheus/prometheus.yml

# Execute the original Prometheus entrypoint with all arguments passed to this script
exec /bin/prometheus "$@"
