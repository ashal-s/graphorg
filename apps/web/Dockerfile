FROM node:20.19.5-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm ci --workspace=@graphorg/web --include-workspace-root

COPY apps/web apps/web
COPY packages/types packages/types
COPY packages/tsconfig packages/tsconfig
RUN npm run build --workspace=@graphorg/web

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@graphorg/web", "--", "--hostname", "0.0.0.0", "--port", "3000"]
