# Build stage
FROM node:20-alpine AS build

ENV NODE_ENV=production

RUN apk update && \
    apk add --no-cache wget && \
    wget -qO- https://gobinaries.com/tj/node-prune | sh

WORKDIR /app

COPY package*.json ./
COPY dist ./dist/
COPY tls ./tls/

RUN npm ci --omit=dev && \
    node-prune && \
    cd node_modules && \
    rm -rf typescript && \
    find ./ -type f \( -name "package.json" \
    -o -name "collections.json" \
    -o -name "collection.json" \
    -o -name "migration.json" \
    -o -name "migrations.json" \
    -o -name "schema.json" \
    -o -name "*-lock.json" \
    -o -name "*.cjs.map" \
    -o -name "*.mjs.map" \
    -o -name "*.js.map" \
    -o -name "*.ts.map" \
    -o -name "*.cts" \
    -o -name "*.js.flow" \
    -o -name "*tsconfig*.json" \
    -o -name "LICENSE*" \
    -o -name "*License*.txt" \
    -o -name "README*" \
    -o -name "*.css" \
    -o -name "*.sass" \
    -o -name "*.scss" \
    -o -name "*.eot" \
    -o -name "*.html" \
    -o -name "*.jpg" \
    -o -name "*.jpeg" \
    -o -name "*.less" \
    -o -name "*.png" \
    -o -name "*.svg" \
    -o -name "*.swf" \
    -o -name "*.tmpl" \
    -o -name "*.template" \
    -o -name "*.woff" \
    -o -name "*.bazel" \) -exec rm -rf {} \; && \
    find ./ -type f \( -name "*" \) -exec chmod 400 {} \; && \
    cd /app/dist/fine-tune-forge && \
    find ./ -type f \( -name "*" \) -exec chmod 400 {} \; && \
    cd /app/tls && \
    find ./ -type f \( -name "*" \) -exec chmod 400 {} \;

# Final stage
FROM node:20-alpine

LABEL maintainer="Reyhan Kamil <mail@ryhkml.dev>"

ENV TZ=UTC
ENV NODE_ENV=production
ENV NODE_VERSION=
ENV YARN_VERSION=

RUN apk update && \
    apk upgrade && \
    rm -rf /var/cache/apk/* /tmp/* /usr/local/*.md /usr/local/LICENSE /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/corepack /usr/local/lib/node_modules

WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules/
COPY --from=build --chown=node:node /app/dist ./dist/
COPY --from=build --chown=node:node /app/tls ./tls/
COPY --chown=node:node DATADOC_OCR ./DATADOC_OCR/
COPY --chown=node:node DATASET ./DATASET/
COPY --chown=node:node DATATMP ./DATATMP/

USER node

EXPOSE 12400

CMD ["node", "/app/dist/fine-tune-forge/server/main.js"]