#!/bin/bash

echo "📦 Installing Haraka SMTP Server..."

# Update system
sudo apt update

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install Haraka globally
echo "Installing Haraka..."
sudo npm install -g Haraka

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

# Set permissions
sudo chown -R haraka:haraka /var/log/haraka
sudo chown -R haraka:haraka /var/run/haraka
sudo chown -R haraka:haraka /var/lib/haraka
sudo chown -R haraka:haraka /etc/haraka

echo "✅ Haraka installation completed!"
echo ""
echo "Next steps:"
echo "1. Run: node scripts/fix-haraka-config.js"
echo "2. Test with: haraka -c ."
