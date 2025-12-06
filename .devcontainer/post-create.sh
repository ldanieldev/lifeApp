#!/bin/bash

echo "🚀 Starting post-create setup..."
cd /workspace

# Initialize Garage S3 storage (bucket and access key)
echo "🗄️ Initializing Garage S3 storage..."
bash /workspace/config/garage-init.sh

# Create and activate virtual environment
echo "📦 Setting up Python virtual environment..."
uv venv .venv --clear
source .venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
uv pip install -r backend/requirements-dev.txt

# Setup pre-commit hooks
echo "🔧 Setting up pre-commit hooks..."
rm -f .git/hooks/pre-commit*
pre-commit install --config .pre-commit-config.yaml --install-hooks
echo "✅ Pre-commit hooks installed successfully"

# Install frontend dependencies
echo "🌐 Installing frontend dependencies..."
cd frontend && pnpm install

# Auto-activate venv for future sessions
echo "🔄 Setting up virtual environment auto-activation..."
echo 'source /workspace/.venv/bin/activate' >> ~/.bashrc

echo "🎉 Post-create setup completed successfully!"