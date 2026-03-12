FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN set -eux; \
    for i in 1 2 3; do apk update && break || sleep 3; done; \
    apk add --no-cache postgresql17-client || \
    apk add --no-cache postgresql16-client || \
    apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
