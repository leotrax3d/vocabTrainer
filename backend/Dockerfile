# Backend: Node.js + Express REST-API
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Zuerst nur die Manifest-Dateien kopieren -> bessere Layer-Caching.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Restlichen Quellcode kopieren.
COPY . .

EXPOSE 3000

# Healthcheck gegen den eigenen API-Endpunkt (Node 20 hat globales fetch).
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=12 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>r.json()).then(j=>process.exit(j.db?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
