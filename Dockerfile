FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack pnpm install --frozen-lockfile

COPY . .
RUN corepack pnpm run build:dokploy

EXPOSE 3000

CMD ["sh", "-c", "corepack pnpm run db:migrate && corepack pnpm run start:dokploy"]
