FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8000

# sync() + constraints + idempotent seed, then start the API.
CMD ["sh", "-c", "node dist/seed.js && node dist/server.js"]
