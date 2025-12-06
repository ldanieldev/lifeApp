#!/bin/bash
# Garage initialization script - creates bucket and access key for development
# This script is idempotent and can be run multiple times safely
#
# Uses deterministic credentials for development so .env can be pre-configured
# Runs from the app container (Python devcontainer) during postCreateCommand

set -e

GARAGE_ADMIN_HOST="${GARAGE_ADMIN_HOST:-http://garage:3903}"
GARAGE_ADMIN_TOKEN="${GARAGE_ADMIN_TOKEN:-devadmintoken123}"

BUCKET_NAME="${GARAGE_BUCKET_NAME:-life-app}"
KEY_NAME="${GARAGE_KEY_NAME:-app-key}"

# Deterministic dev credentials (DO NOT use in production!)
# These match the values in .env for zero-config development
# Access key must be: GK + 24 hex chars (12 bytes)
# Secret key must be: 64 hex chars (32 bytes)
DEV_ACCESS_KEY="${GARAGE_ACCESS_KEY:-GK0123456789abcdef01234567}"
DEV_SECRET_KEY="${GARAGE_SECRET_KEY:-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}"

MAX_RETRIES=30
RETRY_INTERVAL=2

# Helper function for authenticated GET requests
garage_get() {
    curl -sS -H "Authorization: Bearer ${GARAGE_ADMIN_TOKEN}" "${GARAGE_ADMIN_HOST}$1"
}

# Helper function for authenticated POST requests
garage_post() {
    curl -sS -X POST -H "Authorization: Bearer ${GARAGE_ADMIN_TOKEN}" -H "Content-Type: application/json" "${GARAGE_ADMIN_HOST}$1" -d "$2"
}

echo "=== Garage Initialization Script ==="
echo "Admin Host: $GARAGE_ADMIN_HOST"
echo "Bucket: $BUCKET_NAME"
echo "Key: $KEY_NAME"

# Wait for Garage to be ready (health endpoint doesn't need auth)
echo ""
echo "Waiting for Garage to be ready..."
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sS "${GARAGE_ADMIN_HOST}/health" >/dev/null 2>&1; then
        echo "Garage is ready!"
        break
    fi
    if [ $i -eq $MAX_RETRIES ]; then
        echo "ERROR: Garage did not become ready after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "  Attempt $i/$MAX_RETRIES - waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

# Get cluster status and node ID
echo ""
echo "Checking cluster status..."
STATUS=$(garage_get "/v1/status" 2>/dev/null || echo "{}")
NODE_ID=$(echo "$STATUS" | grep -oP '"id"\s*:\s*"\K[^"]+' | head -1)

if [ -z "$NODE_ID" ]; then
    echo "ERROR: Could not determine node ID"
    echo "Status response: $STATUS"
    exit 1
fi

echo "Node ID: $NODE_ID"

# Check and configure layout
echo ""
echo "Checking cluster layout..."
LAYOUT=$(garage_get "/v1/layout" 2>/dev/null || echo "{}")

# Check if node has an actual role (not just staged)
# Look for the node ID in the "roles" array, not "stagedRoleChanges"
NODE_HAS_ROLE=$(echo "$LAYOUT" | grep -oP '"roles"\s*:\s*\[[^\]]*'"$NODE_ID"'[^\]]*\]' || echo "")

if [ -z "$NODE_HAS_ROLE" ]; then
    echo "Assigning layout to node..."

    # Assign role to the node
    garage_post "/v1/layout" "[{\"id\": \"$NODE_ID\", \"zone\": \"dc1\", \"capacity\": 53687091200, \"tags\": []}]"

    # Get staged layout version and increment it
    LAYOUT=$(garage_get "/v1/layout" 2>/dev/null)
    CURRENT_VERSION=$(echo "$LAYOUT" | grep -oP '"version"\s*:\s*\K[0-9]+' | head -1)
    NEW_VERSION=$((CURRENT_VERSION + 1))

    echo "Applying layout version $NEW_VERSION..."
    APPLY_RESULT=$(garage_post "/v1/layout/apply" "{\"version\": $NEW_VERSION}")
    echo "$APPLY_RESULT"

    # Wait for layout to be applied
    echo "Waiting for layout to propagate..."
    sleep 3
else
    echo "Layout already configured"
fi

# Create bucket if it doesn't exist
echo ""
echo "Checking bucket '$BUCKET_NAME'..."
BUCKET_INFO=$(garage_get "/v1/bucket?alias=${BUCKET_NAME}" 2>/dev/null || echo "")

# Empty array [] or error message means bucket doesn't exist
if [ -z "$BUCKET_INFO" ] || [ "$BUCKET_INFO" = "[]" ] || echo "$BUCKET_INFO" | grep -q '"code"'; then
    echo "Creating bucket '$BUCKET_NAME'..."
    garage_post "/v1/bucket" "{\"globalAlias\": \"$BUCKET_NAME\"}"
else
    echo "Bucket '$BUCKET_NAME' already exists"
fi

# Get bucket ID for permissions
BUCKET_INFO=$(garage_get "/v1/bucket?alias=${BUCKET_NAME}" 2>/dev/null)
BUCKET_ID=$(echo "$BUCKET_INFO" | grep -oP '"id"\s*:\s*"\K[^"]+' | head -1)

# Import or create access key with deterministic credentials
echo ""
echo "Checking access key '$KEY_NAME'..."
KEY_INFO=$(garage_get "/v1/key?search=${KEY_NAME}" 2>/dev/null || echo "")

# Empty array [], empty string, or error means key doesn't exist
if [ -z "$KEY_INFO" ] || [ "$KEY_INFO" = "[]" ] || echo "$KEY_INFO" | grep -q '"code"'; then
    echo "Importing access key '$KEY_NAME' with dev credentials..."
    IMPORT_RESULT=$(garage_post "/v1/key/import" "{\"accessKeyId\": \"$DEV_ACCESS_KEY\", \"secretAccessKey\": \"$DEV_SECRET_KEY\", \"name\": \"$KEY_NAME\"}" 2>&1)
    if echo "$IMPORT_RESULT" | grep -q '"code"'; then
        echo "Import failed: $IMPORT_RESULT"
        echo "Creating new key instead..."
        garage_post "/v1/key" "{\"name\": \"$KEY_NAME\"}"
    fi
else
    echo "Access key '$KEY_NAME' already exists"
fi

# Get key ID for permissions
KEY_INFO=$(garage_get "/v1/key?search=${KEY_NAME}" 2>/dev/null)
KEY_ID=$(echo "$KEY_INFO" | grep -oP '"accessKeyId"\s*:\s*"\K[^"]+' | head -1)

# Grant bucket permissions
if [ -n "$BUCKET_ID" ] && [ -n "$KEY_ID" ]; then
    echo ""
    echo "Granting permissions on '$BUCKET_NAME' to '$KEY_NAME'..."
    garage_post "/v1/bucket/allow" "{\"bucketId\": \"$BUCKET_ID\", \"accessKeyId\": \"$KEY_ID\", \"permissions\": {\"read\": true, \"write\": true, \"owner\": true}}" 2>/dev/null || true
fi

# Display final status
echo ""
echo "=== Garage Setup Complete ==="
echo ""
echo "Bucket info:"
garage_get "/v1/bucket?alias=${BUCKET_NAME}" 2>/dev/null | head -c 500 || true
echo ""
echo ""
echo "Key info:"
garage_get "/v1/key?search=${KEY_NAME}" 2>/dev/null | head -c 500 || true
echo ""
echo ""
echo "=== Development Credentials ==="
echo "GARAGE_ACCESS_KEY=$DEV_ACCESS_KEY"
echo "GARAGE_SECRET_KEY=$DEV_SECRET_KEY"
echo "AWS_STORAGE_BUCKET_NAME=$BUCKET_NAME"
