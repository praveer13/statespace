# W0-S06 probe image: Ubuntu 24.04, bubblewrap, and the pinned Lean toolchain.
#
# It installs elan and Lean the way labs/TOOLS.md section 2.2 does (elan 4.2.4, Lean 4.35.0), as an
# ordinary non-root user, because devcontainers run as one. The image is a measuring fixture for
# W0-S06, not the course's Bench image (that is W0-T05's bench/image/Dockerfile).
#
# Build:  docker build -t statespace-w0s06-lean scripts/spikes/W0-S06/image
FROM ubuntu:24.04

ARG ELAN_VERSION=4.2.4
ARG LEAN_TOOLCHAIN=leanprover/lean4:v4.35.0

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends bubblewrap ca-certificates curl git \
 && rm -rf /var/lib/apt/lists/*

# A non-root user with uid 1000, and the per-user runtime directory that the sandbox wants to find.
RUN (userdel --remove ubuntu 2>/dev/null || true) \
 && useradd --uid 1000 --create-home --home-dir /var/lab --shell /bin/bash lab \
 && mkdir -p /run/user/1000 && chown lab:lab /run/user/1000 && chmod 700 /run/user/1000 \
 && mkdir -p /opt/elan /work && chown lab:lab /opt/elan /work

USER lab
ENV ELAN_HOME=/opt/elan
ENV PATH=/opt/elan/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN set -eu; \
    arch="$(uname -m)"; \
    curl -sSfL -o /tmp/elan.tar.gz \
      "https://github.com/leanprover/elan/releases/download/v${ELAN_VERSION}/elan-${arch}-unknown-linux-gnu.tar.gz"; \
    tar -xzf /tmp/elan.tar.gz -C /tmp; \
    /tmp/elan-init -y --default-toolchain none --no-modify-path; \
    elan toolchain install "${LEAN_TOOLCHAIN}"; \
    elan default "${LEAN_TOOLCHAIN}"; \
    rm -f /tmp/elan.tar.gz /tmp/elan-init; \
    lean --version; lake --version; bwrap --version

WORKDIR /work
CMD ["bash"]
