#!/bin/sh
# Entrypoint script for Garage to generate RPC secret if not exists

set -e

RPC_SECRET_FILE="/etc/garage/rpc_secret"
RPC_SECRET_DIR="/etc/garage"

# Create directory if it doesn't exist
mkdir -p "$RPC_SECRET_DIR"

# Generate RPC secret if it doesn't exist
if [ ! -f "$RPC_SECRET_FILE" ]; then
    echo "Generating new RPC secret..."
    # Generate a 32-byte hex string (64 characters)
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$RPC_SECRET_FILE"
    echo "" >> "$RPC_SECRET_FILE"  # Add newline
fi

# Execute Garage with all arguments passed to this script
exec /garage "$@"
