# syntax=docker/dockerfile:1

# ---- Stage 1: build the static bundle ----
# Debian-based (glibc) image so Tailwind v4's native binaries
# (@tailwindcss/oxide, lightningcss) install correctly for arm64 (Raspberry Pi).
# Alpine (musl) often lacks prebuilt arm binaries for these and would fail.
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install dependencies first so this layer stays cached unless the
# package manifest or lockfile changes (keeps rebuilds fast).
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source.
COPY . .

# Immich config is baked into the static bundle at build time by webpack's
# DefinePlugin. These values are public (the share link is public), not secrets,
# so passing them as build args is fine. .env is not available in the build
# context, so they must be supplied with --build-arg (or compose build args).
ARG IMMICH_BASE_URL
ARG IMMICH_SHARE_SLUG
ENV IMMICH_BASE_URL=${IMMICH_BASE_URL}
ENV IMMICH_SHARE_SLUG=${IMMICH_SHARE_SLUG}

# Build the site. Tailwind must run before webpack so the freshly
# generated style.css is picked up and copied into bin/ by webpack.
RUN npx @tailwindcss/cli -i ./src/tailwind-input.css -o ./src/style.css \
 && npx webpack --mode=production

# ---- Stage 2: serve the static files ----
# Tiny multi-arch image; the whole Node/Tailwind toolchain above is discarded.
FROM nginx:alpine

# Webpack outputs the built site to /app/bin.
COPY --from=builder /app/bin /usr/share/nginx/html

EXPOSE 80
