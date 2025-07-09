const defaultContent = `<!DOCTYPE html>

<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deploying a Next.js TypeScript App on Ubuntu</title>
</head>
<body>
  <h1>Deploying a Next.js TypeScript App on Ubuntu</h1>
  <p>This guide outlines the steps to deploy a Next.js TypeScript application to an Ubuntu server. We'll cover setting up the server, installing necessary tools, building your application, and configuring a process manager to keep it running.</p>
  
  <h2>Prerequisites</h2>
  <ul>
    <li>An Ubuntu server (e.g., on AWS, DigitalOcean, or a physical machine)</li>
    <li>SSH access to the server</li>
    <li>A Next.js TypeScript application (hosted on GitHub, GitLab, or similar)</li>
  </ul>
  
  <h2>Steps</h2>
  <p><strong>1. Update System Packages:</strong></p>
  <pre><code>sudo apt update && sudo apt upgrade</code></pre>
  
  <p><strong>2. Install Node.js and npm:</strong></p>
  <pre><code>curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs</code></pre>
  
  <p><strong>3. Install PM2 (Process Manager):</strong></p>
  <pre><code>sudo npm install -g pm2</code></pre>
  
  <p><strong>4. Clone your Next.js application:</strong></p>
  <pre><code>git clone &lt;your_repository_url&gt; /path/to/your/app</code></pre>
  
  <p><strong>5. Install dependencies and build the application:</strong></p>
  <pre><code>cd /path/to/your/app
npm install
npm run build</code></pre>
  
  <p><strong>6. Configure Environment Variables (if needed):</strong></p>
  <p>Create a <code>.env</code> file or set environment variables directly on the server.</p>
  <pre><code>echo "NEXT_PUBLIC_API_URL=your_api_url" >> .env</code></pre>
  
  <p><strong>7. Start the Next.js application with PM2:</strong></p>
  <pre><code>pm2 start npm --name "your-app-name" -- start</code></pre>
  
  <p><strong>8. (Optional) Setup a reverse proxy with Nginx:</strong></p>
  <p>This is highly recommended for security and performance. Configure Nginx to forward requests to your Next.js application running on a specific port (default is 3000).</p>
  
  <p><strong>9. Save the PM2 process:</strong></p>
  <pre><code>pm2 save</code></pre>
  
  <p><strong>10. Configure PM2 to start on boot:</strong></p>
  <pre><code>pm2 startup systemd
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u &lt;your_user&gt;
systemctl enable pm2-your_user</code></pre>
  
  <h2>Important Considerations</h2>
  <ul>
    <li>Security: Implement proper security measures, including firewalls, SSH key-based authentication, and regular security updates.</li>
    <li>Domain Configuration: Point your domain name to the server's IP address.</li>
    <li>Logging and Monitoring: Implement logging and monitoring to track application performance and identify potential issues.</li>
  </ul>
  
  <p>By following these steps, you can successfully deploy your Next.js TypeScript application to an Ubuntu server. Remember to adapt the commands and configurations to match your specific needs and environment.</p>
</body>
</html>
`
export default defaultContent;