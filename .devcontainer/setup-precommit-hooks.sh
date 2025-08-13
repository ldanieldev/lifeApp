#!/bin/bash
set -e

echo "Setting up pre-commit hooks..."

# Install pre-commit if not already installed
pip install pre-commit

# Try normal install first
if pre-commit install --config backend/.pre-commit-config.yaml; then
    echo "✅ Pre-commit hooks installed successfully"
else
    echo "⚠️  Normal install failed, using manual approach..."
    
    # Manual hook creation
    cat > .git/hooks/pre-commit << 'EOF'
#!/usr/bin/env bash
cd "$(git rev-parse --show-toplevel)"
exec python3 -m pre_commit.main run --config backend/.pre-commit-config.yaml "$@"
EOF
    
    # Make executable (with sudo if needed)
    chmod +x .git/hooks/pre-commit 2>/dev/null || sudo chmod +x .git/hooks/pre-commit
    
    echo "✅ Pre-commit hooks set up manually"
fi

echo "🎉 Setup complete! Hooks will run on commit."