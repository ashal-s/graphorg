# Jenkins controller with the same toolchains as GitHub Actions (WEB-222).
# Checks run inside this container — not via Docker-in-Docker — so Docker
# Desktop on Mac does not have to share the socket or rewrite paths.
FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    xz-utils \
    git \
    python3 \
    python3-venv \
    python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Node 20 — same major as .github/workflows/ci.yml. Multi-arch tarball.
ARG NODE_VERSION=20.19.5
RUN arch="$(dpkg --print-architecture)" \
  && case "$arch" in \
       amd64) node_arch=x64 ;; \
       arm64) node_arch=arm64 ;; \
       *) echo "unsupported arch: $arch" && exit 1 ;; \
     esac \
  && curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 \
  && node --version && npm --version

# Chromium shared libraries for Playwright. Browsers themselves install
# into the job workspace (jenkins user), not this root layer.
ARG PLAYWRIGHT_VERSION=1.64.1
RUN npm install -g "playwright@${PLAYWRIGHT_VERSION}" \
  && playwright install-deps chromium \
  && npm uninstall -g playwright \
  && rm -rf /root/.npm

# Python 3.12 for services/ai-worker (Debian's python3 is not pinned to 3.12).
ENV UV_INSTALL_DIR=/usr/local/bin \
    UV_PYTHON_INSTALL_DIR=/opt/uv-python
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
  && uv python install 3.12 \
  && chmod -R a+rX /opt/uv-python

USER jenkins
