#!/bin/bash
# VAPID key initialization script for Web Push notifications
# This script validates VAPID keys are configured or generates new ones
#
# For development: deterministic keys are pre-configured in .env
# For production: generate unique keys with: npx web-push generate-vapid-keys
#
# This script is idempotent and can be run multiple times safely

set -e

ENV_FILE="${ENV_FILE:-/workspace/.env}"

# Default dev credentials (matches .env)
DEV_VAPID_PUBLIC_KEY="BLGTOUpFTghdMgPqhoSMaiqTIVZrSJ67pGDswTdf8HBdBVw6Yjd9I8kyCsjKiZum0rbi4djguv7jEy89_9IpfvQ"
DEV_VAPID_PRIVATE_KEY="3zgRzcvXsKSyyIK0lpJ79BUSyAkyf3AduNiAKP5On08"
DEV_VAPID_ADMIN_EMAIL="dev@life-app.local"

echo "=== VAPID Key Initialization ==="

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "WARNING: .env file not found at $ENV_FILE"
    echo "Creating .env with default VAPID keys..."
    cat >> "$ENV_FILE" << EOF

# VAPID Keys (Web Push Notifications)
# Deterministic dev credentials - DO NOT use in production!
# Generated with: npx web-push generate-vapid-keys --json
VAPID_PUBLIC_KEY=$DEV_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=$DEV_VAPID_PRIVATE_KEY
VAPID_ADMIN_EMAIL=$DEV_VAPID_ADMIN_EMAIL
EOF
    echo "VAPID keys added to .env"
    exit 0
fi

# Check if VAPID keys are already configured
if grep -q "^VAPID_PUBLIC_KEY=" "$ENV_FILE" && grep -q "^VAPID_PRIVATE_KEY=" "$ENV_FILE"; then
    echo "VAPID keys already configured in .env"

    # Display current configuration (masked)
    PUBLIC_KEY=$(grep "^VAPID_PUBLIC_KEY=" "$ENV_FILE" | cut -d= -f2)
    echo "  Public key: ${PUBLIC_KEY:0:20}...${PUBLIC_KEY: -10}"
    echo "  Private key: ***masked***"
else
    echo "VAPID keys not found in .env, adding default dev keys..."
    cat >> "$ENV_FILE" << EOF

# VAPID Keys (Web Push Notifications)
# Deterministic dev credentials - DO NOT use in production!
# Generated with: npx web-push generate-vapid-keys --json
VAPID_PUBLIC_KEY=$DEV_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY=$DEV_VAPID_PRIVATE_KEY
VAPID_ADMIN_EMAIL=$DEV_VAPID_ADMIN_EMAIL
EOF
    echo "VAPID keys added to .env"
fi

echo ""
echo "=== VAPID Setup Complete ==="
echo ""
echo "To generate new keys for production:"
echo "  npx web-push generate-vapid-keys --json"
echo ""
