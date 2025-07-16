FROM node:20-slim

RUN apt-get update && apt-get install -y \
    bind9 \
    dnsutils \
    libarchive-tools \
    supervisor \
    sed && \
    rm -rf /var/lib/apt/lists/*

COPY --chown=root:bind named.conf.options /etc/bind/

RUN mkdir -p /var/log/supervisor /DITMail/src

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

COPY src /DITMail/src
COPY package.json package-lock.json /DITMail/

WORKDIR /DITMail

RUN npm ci --omit=dev

COPY entrypoint.sh stop-supervisor.sh /DITMail/
RUN chmod a+rx entrypoint.sh stop-supervisor.sh

EXPOSE 25/tcp 8081/tcp

ENV NODE_ENV=production
ENV HARAKA_LOGLEVEL=info

ENTRYPOINT ["./entrypoint.sh"]
