FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Static docker CLI so the API can start ephemeral runner containers via
# the mounted host socket. The runner image itself never gets this client.
ARG TARGETARCH
ARG DOCKER_CLI_VERSION=27.5.1
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev ca-certificates curl gosu \
    && arch="${TARGETARCH:-$(dpkg --print-architecture)}" \
    && case "$arch" in \
         amd64|x86_64) docker_arch=x86_64 ;; \
         arm64|aarch64) docker_arch=aarch64 ;; \
         *) echo "unsupported arch: $arch" && exit 1 ;; \
       esac \
    && curl -fsSL "https://download.docker.com/linux/static/stable/${docker_arch}/docker-${DOCKER_CLI_VERSION}.tgz" \
         | tar -xz --strip-components=1 -C /usr/local/bin docker/docker \
    && chmod 755 /usr/local/bin/docker \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app \
    && chmod 755 /docker-entrypoint.sh

# Entrypoint starts as root so it can join the docker.sock group, then
# drops to appuser. The runner containers never run as root.
ENTRYPOINT ["/docker-entrypoint.sh"]
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
