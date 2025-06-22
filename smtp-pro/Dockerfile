FROM ubuntu:latest

# Update the package list
RUN apt-get update

# Install necessary packages including Node.js and npm
RUN apt-get -y install libarchive-tools dnsutils bind9 supervisor sed nodejs npm

# Copy BIND configuration
COPY --chown=root:bind named.conf.options /etc/bind/

# Set up Supervisor
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy application source code and package files
RUN mkdir -p /DITMail/smtp-pro
COPY src /DITMail/smtp-pro
COPY package.json /DITMail/smtp-pro/
COPY package-lock.json /DITMail/smtp-pro/

# Install Node.js dependencies
RUN cd /DITMail/smtp-pro && npm i

# Copy entrypoint scripts and give them execute permissions
COPY entrypoint.sh /DITMail/smtp-pro/
COPY stop-supervisor.sh /DITMail/smtp-pro/
RUN chmod a+rx /DITMail/smtp-pro/entrypoint.sh /DITMail/smtp-pro/stop-supervisor.sh

# Expose necessary ports
EXPOSE 25/tcp 8081/tcp

# Set working directory
WORKDIR /DITMail/smtp-pro

# Set the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]