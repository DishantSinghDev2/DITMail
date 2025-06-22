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
RUN mkdir -p /DITMail/src
COPY src /DITMail/src
COPY package.json /DITMail/
COPY package-lock.json /DITMail/

# Install Node.js dependencies
RUN cd /DITMail && npm i

# Copy entrypoint scripts and give them execute permissions
COPY entrypoint.sh /DITMail/
COPY stop-supervisor.sh /DITMail/
RUN chmod a+rx /DITMail/entrypoint.sh /DITMail/stop-supervisor.sh

# Expose necessary ports
EXPOSE 25/tcp 8081/tcp

# Set working directory
WORKDIR /DITMail

# Set the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
