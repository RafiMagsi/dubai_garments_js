FROM node:20-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN set -eux; \
    npm config set fund false; \
    npm config set audit false; \
    npm config set update-notifier false; \
    npm config set fetch-retries 5; \
    npm config set fetch-retry-factor 2; \
    npm config set fetch-retry-mintimeout 20000; \
    npm config set fetch-retry-maxtimeout 120000; \
    ok=0; \
    for i in 1 2 3; do \
      npm cache clean --force || true; \
      if npm ci --no-audit --no-fund --verbose; then \
        ok=1; \
        break; \
      fi; \
      echo "npm ci failed (attempt $i), retrying..."; \
      sleep 5; \
    done; \
    if [ "$ok" -ne 1 ]; then \
      echo "npm ci failed after retries"; \
      exit 1; \
    fi
COPY . .
RUN npm run prisma:generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
