# Railway build for the video worker. Railway builds from the repository root,
# so paths here are relative to the repo root (the plain Dockerfile is for
# building from inside worker/). Selected via RAILWAY_DOCKERFILE_PATH.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --chown=node:node worker/package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node worker/src ./src
USER node

CMD ["node", "src/index.js"]
