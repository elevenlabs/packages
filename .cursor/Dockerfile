FROM node:lts-krypton

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable \
  && corepack prepare pnpm@10.28.1 --activate \
  && node --version \
  && pnpm --version
