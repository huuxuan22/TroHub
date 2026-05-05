# TroHub frontend — Node 22.17.1 + Vite dev server (hot reload)
# Pin image: https://hub.docker.com/_/node
FROM node:22.17.1-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

EXPOSE 3000

ENV NODE_ENV=development

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
