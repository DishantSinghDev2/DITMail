#!/bin/bash

# Test SMTP connectivity for DITMail server
MAIL_SERVER=${MAIL_SERVER_DOMAIN:-"mail.freecustom.email"}
SMTP_SERVER=${SMTP_DOMAIN:-"smtp.freecustom.email"}
SERVER_IP=${SERVER_IP:-"127.0.0.1"}

echo "🧪 Testing DITMail SMTP Server Configuration"
echo "============================================="
echo "Mail Server: $MAIL_SERVER"
echo "SMTP Server: $SMTP_SERVER"
echo "Server IP: $SERVER_IP"
echo ""

# Test 1: Check if ports are open
echo "1. Testing port connectivity..."
echo "   Port 25 (SMTP):"
timeout 5 bash -c "</dev/tcp/$SERVER_IP/25" && echo "   ✅ Port 25 is open" || echo "   ❌ Port 25 is closed"

echo "   Port 587 (Submission):"
timeout 5 bash -c "</dev/tcp/$SERVER_IP/587" && echo "   ✅ Port 587 is open" || echo "   ❌ Port 587 is closed"

echo "   Port 465 (SMTPS):"
timeout 5 bash -c "</dev/tcp/$SERVER_IP/465" && echo "   ✅ Port 465 is open" || echo "   ❌ Port 465 is closed"

echo ""

# Test 2: DNS Resolution
echo "2. Testing DNS resolution..."
echo "   MX Record for $MAIL_SERVER:"
dig +short MX $MAIL_SERVER || echo "   ❌ No MX record found"

echo "   A Record for $MAIL_SERVER:"
dig +short A $MAIL_SERVER || echo "   ❌ No A record found"

echo "   A Record for $SMTP_SERVER:"
dig +short A $SMTP_SERVER || echo "   ❌ No A record found"

echo ""

# Test 3: SMTP Banner
echo "3. Testing SMTP banner..."
echo "QUIT" | timeout 10 telnet $SMTP_SERVER 587 2>/dev/null | head -1

echo ""

# Test 4: SSL Certificate
echo "4. Testing SSL certificate..."
echo | timeout 10 openssl s_client -connect $SMTP_SERVER:587 -starttls smtp 2>/dev/null | grep -E "(subject|issuer)" | head -2

echo ""

# Test 5: Customer domain example
echo "5. Example customer domain setup:"
echo "   For customer domain 'example.com', add these DNS records:"
echo "   MX:    example.com.    IN    MX    10    $MAIL_SERVER."
echo "   SPF:   example.com.    IN    TXT   \"v=spf1 mx a:$MAIL_SERVER include:freecustom.email -all\""
echo "   DMARC: _dmarc.example.com. IN TXT \"v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@$MAIL_SERVER\""

echo ""
echo "✅ SMTP server test completed!"
