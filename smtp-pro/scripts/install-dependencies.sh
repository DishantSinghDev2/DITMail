#!/bin/bash

echo "📦 Installing DITMail dependencies..."

# Update system
sudo apt update

# Install required system packages
echo "Installing system packages..."
sudo apt install -y curl wget gnupg2 software-properties-common build-essential

# Install Node.js 18+ if not installed
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    echo "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install Redis
if ! command -v redis-server &> /dev/null; then
    echo "Installing Redis..."
    sudo apt install -y redis-server
    sudo systemctl enable redis-server
    sudo systemctl start redis-server
fi

# Install Haraka globally
echo "Installing Haraka..."
sudo npm install -g Haraka@latest

# Verify Haraka installation
if command -v haraka &> /dev/null; then
    echo "✅ Haraka installed successfully: $(haraka --version)"
else
    echo "❌ Haraka installation failed"
    echo "Trying alternative installation method..."
    
    # Alternative: Install locally and create symlink
    npm install haraka@latest
    sudo ln -sf $(pwd)/node_modules/.bin/haraka /usr/local/bin/haraka
fi

# Install additional dependencies
echo "Installing additional Node.js packages..."
npm install bcrypt redis nodemailer speakeasy

# Create haraka user if it doesn't exist
if ! id "haraka" &>/dev/null; then
    echo "Creating haraka user..."
    sudo useradd -r -s /bin/false -d /var/lib/haraka haraka
fi

# Create required directories
echo "Creating directories..."
sudo mkdir -p /var/log/haraka
sudo mkdir -p /var/run/haraka
sudo mkdir -p /var/lib/haraka
sudo mkdir -p /etc/haraka
sudo mkdir -p /etc/haraka/dkim
sudo mkdir -p /var/mail

# Set permissions
sudo chown -R haraka:haraka /var/log/haraka
sudo chown -R haraka:haraka /var/run/haraka
sudo chown -R haraka:haraka /var/lib/haraka
sudo chown -R haraka:haraka /etc/haraka
sudo chown -R haraka:haraka /var/mail

echo "✅ Dependencies installation completed!"
echo ""
echo "Installed versions:"
echo "- Node.js: $(node -v)"
echo "- NPM: $(npm -v)"
echo "- Haraka: $(haraka --version 2>/dev/null || echo 'Not in PATH')"
echo "- Redis: $(redis-server --version | head -1)"
