# The Bench image (spine section 9.2; ARCHITECTURE.md section 11.1; W0-T05): every tool the labs run, at its pin.
#
# What is in it: Lean 4.35.0 through elan, the TLC jars and Java 21, Z3 and cvc5, Soufflé, the Rust toolchain
# with the wasm target and the pinned crates, bubblewrap for Lean's sandbox, uv and the `statespace` command
# line. PostgreSQL 18.6 is not in it: it runs beside it as a service container (.devcontainer/docker-compose.yml).
#
# How it is pinned. The two base images are named by digest. Every download is checked against a SHA-256 written
# here before anything of it is used, except where the source's own installer checks it: rustup verifies each Rust
# component against the release manifest, cargo verifies every crate against Cargo.lock, and uv verifies every
# Python wheel against bench/uv.lock. Python itself is the build that uv 0.10.2 names for 3.13.12, a
# python-build-standalone release. The Lean toolchain is the release archive, checked against the digest that the
# release API listed. The last step runs `statespace doctor`, which compares the toolchain's eight binaries and
# every other tool with the pins recorded in runs/, and fails the build on any difference. The TLC jars are in this
# repository (bench/image/tla2tools/): the 1.8.0 release is re-published under its tag, and the asset at the tag is
# no longer the jar the course ran. The Ubuntu packages (bubblewrap, git, a C toolchain and libclang) come from the
# archive of the day and are not pinned by version: the image's digest is what pins them.
#
# Platform. The pins are those of the x86_64 Linux build, and the image is built for it: --platform below makes
# an Apple-silicon machine build and run it under emulation. Nothing was run on arm64 (RUN-doctor-devcontainer).
#
# Build, from the repository root:
#   docker build --file bench/image/Dockerfile --tag statespace-bench .
# The context is the repository, and bench/image/Dockerfile.dockerignore keeps all of it out but the few paths the
# COPY lines below name. A devcontainer build (the CLI, VS Code, a Codespaces prebuild) goes through a Dockerfile of
# its own that wraps this one, and then the ignore file is not read: the context is the whole checkout, and the
# COPY lines still name only the paths they need.
#
# The sandbox. The image leaves Docker's confinement alone. Lean's sandbox needs /run/user to exist, which is why
# it is made below, and needs more than Docker's default seccomp profile allows, which is why the devcontainer
# has an opt-in profile (.devcontainer/docker-compose.sandbox.yml) and `statespace doctor` reports the result.

ARG BENCH_PLATFORM=linux/amd64
ARG UBUNTU_IMAGE=ubuntu:24.04@sha256:68ee22004a9109b44973313b02ff7b1de250f1de0f5ecb628d73f579aaff33ac
ARG TEMURIN_IMAGE=eclipse-temurin:21-jre@sha256:227118764cccd3c3294617061aaa93a08309c63a395eefa83e6b35032992ea99

# Java 21 is the Temurin build that the executed TLC runs used (TLC's banner prints "Eclipse Adoptium 21.0.12.1").
FROM --platform=${BENCH_PLATFORM} ${TEMURIN_IMAGE} AS temurin

FROM --platform=${BENCH_PLATFORM} ${UBUNTU_IMAGE}

ARG ELAN_VERSION=4.2.4
ARG ELAN_SHA256=42b94d4244e8353142c456ec0e4ca6528fd898a6c604d4059f494e706e431f63
ARG LEAN_VERSION=4.35.0
ARG LEAN_ARCHIVE_SHA256=7289597a44543246c9227b8cae501767e095ce17f6d448b95fc4a8dc97268f6d
ARG RUSTUP_VERSION=1.29.2
ARG RUSTUP_INIT_SHA256=5be191e8c70a5007074254cb74d78dbfdd25cd5a61c27de7b8e5410122ec24f4
ARG RUST_VERSION=1.96.0
ARG UV_VERSION=0.10.2
ARG UV_SHA256=6aa4576c31f791c0b9d4739e256d07358d45e7535695287fec03cf6839e25512
ARG PYTHON_VERSION=3.13.12
ARG CVC5_VERSION=1.4.2
ARG CVC5_ZIP_SHA256=7eb18f8c814c36a46c5a7d003983e9cfbc4b0a9828d6dd596239291bd4cc61d8
ARG CVC5_BINARY_SHA256=6aecddf466552b83bb5883756c7955e0c9d5ddcc6d7f45b48c2f6e06a741b102
ARG SOUFFLE_VERSION=2.5
ARG SOUFFLE_DEB_SHA256=c7e9dd1349506bbb23c4dcf89e87396198006235f79b1cc516c0a2b67ac067bc
ARG TLA2TOOLS_1_8_0_SHA256=5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2
ARG TLA2TOOLS_1_7_4_SHA256=936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88

LABEL org.opencontainers.image.title="statespace Bench" \
      org.opencontainers.image.description="The tools of the statespace labs at their pins: Lean, TLC, Z3, cvc5, Soufflé, Rust, and the statespace command line."

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    ELAN_HOME=/opt/elan \
    RUSTUP_HOME=/opt/rustup \
    CARGO_HOME=/opt/cargo \
    JAVA_HOME=/opt/java/openjdk \
    UV_PYTHON_INSTALL_DIR=/opt/python \
    UV_NO_PROGRESS=1 \
    PATH=/opt/venv/bin:/opt/elan/bin:/opt/cargo/bin:/opt/java/openjdk/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Ubuntu packages. bubblewrap, git and env are what Lake needs to sandbox a check; build-essential and libclang-dev
# are what the pinned crates need (pg_query compiles libpq's parser with a C compiler and generates its bindings
# with libclang); curl, unzip and zstd fetch and unpack the pinned downloads below; git and ssh are for the lab
# repository.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        bubblewrap build-essential ca-certificates curl git less libclang-dev openssh-client unzip zstd; \
    rm -rf /var/lib/apt/lists/*

# Java 21, as the Temurin image has it.
COPY --from=temurin /opt/java/openjdk /opt/java/openjdk

# A user that is not root (devcontainers run as one), with the per-user runtime directory that Lean's sandbox wants
# to find: Lake covers /run/user with a tmpfs and bubblewrap cannot create the mount point in a read-only root
# (RUN-bwrap-lanes). The tool directories the learner's own commands write to are the learner's.
RUN set -eux; \
    (userdel --remove ubuntu 2>/dev/null || true); \
    useradd --uid 1000 --create-home --shell /bin/bash learner; \
    mkdir -p /run/user/1000 /workspaces /opt/elan /opt/rustup /opt/cargo /opt/python /opt/venv /opt/statespace; \
    chown learner:learner /run/user/1000 /workspaces /opt/elan /opt/rustup /opt/cargo /opt/python /opt/venv /opt/statespace; \
    chmod 700 /run/user/1000

# cvc5, the static build without GPL parts, with its licenses. It prints "cvc5 1.4.2 [git 282d5e0 on branch HEAD]",
# not the "1.4.2-modified" of the pip wheel that RUN-cvc5-alethe used (RUN-scaffold).
RUN set -eux; \
    curl -fsSL --retry 3 -o /tmp/cvc5.zip "https://github.com/cvc5/cvc5/releases/download/cvc5-${CVC5_VERSION}/cvc5-Linux-x86_64-static.zip"; \
    echo "${CVC5_ZIP_SHA256}  /tmp/cvc5.zip" | sha256sum -c -; \
    unzip -q /tmp/cvc5.zip -d /tmp/cvc5; \
    install -D -m 0755 /tmp/cvc5/cvc5-Linux-x86_64-static/bin/cvc5 /opt/cvc5/bin/cvc5; \
    cp -r /tmp/cvc5/cvc5-Linux-x86_64-static/COPYING /tmp/cvc5/cvc5-Linux-x86_64-static/AUTHORS /tmp/cvc5/cvc5-Linux-x86_64-static/licenses /opt/cvc5/; \
    ln -s /opt/cvc5/bin/cvc5 /usr/local/bin/cvc5; \
    rm -rf /tmp/cvc5 /tmp/cvc5.zip; \
    echo "${CVC5_BINARY_SHA256}  /opt/cvc5/bin/cvc5" | sha256sum -c -; \
    cvc5 --version | head -1

# Soufflé 2.5, from the release's Ubuntu 24.04 package. It depends on g++, python3, libffi-dev, libsqlite3-dev and
# mcpp, because its compile mode needs a C++ compiler; apt installs them with it. The release has no arm64 package.
RUN set -eux; \
    curl -fsSL --retry 3 -o /tmp/souffle.deb "https://github.com/souffle-lang/souffle/releases/download/${SOUFFLE_VERSION}/x86_64-ubuntu-2404-souffle-${SOUFFLE_VERSION}-Linux.deb"; \
    echo "${SOUFFLE_DEB_SHA256}  /tmp/souffle.deb" | sha256sum -c -; \
    apt-get update; \
    apt-get install -y --no-install-recommends /tmp/souffle.deb; \
    rm -rf /var/lib/apt/lists/* /tmp/souffle.deb; \
    souffle --version | head -3

# The TLC jars, with their license: both vendored, never fetched from the tag.
COPY bench/image/tla2tools/ /opt/tla2tools/
RUN set -eux; \
    echo "${TLA2TOOLS_1_8_0_SHA256}  /opt/tla2tools/tla2tools-1.8.0.jar" | sha256sum -c -; \
    echo "${TLA2TOOLS_1_7_4_SHA256}  /opt/tla2tools/tla2tools-1.7.4.jar" | sha256sum -c -; \
    chmod -R a-w,a+rX /opt/tla2tools

# uv, from its release archive.
RUN set -eux; \
    curl -fsSL --retry 3 -o /tmp/uv.tar.gz "https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-x86_64-unknown-linux-gnu.tar.gz"; \
    echo "${UV_SHA256}  /tmp/uv.tar.gz" | sha256sum -c -; \
    tar -xzf /tmp/uv.tar.gz -C /tmp; \
    install -m 0755 /tmp/uv-x86_64-unknown-linux-gnu/uv /usr/local/bin/uv; \
    rm -rf /tmp/uv.tar.gz /tmp/uv-x86_64-unknown-linux-gnu; \
    uv --version

USER learner
WORKDIR /home/learner

# Lean 4.35.0, core and Std only, no Mathlib. elan 4.2.4 is installed with the commands of labs/TOOLS.md section 2.2
# and no toolchain. The toolchain is the release archive itself, checked against the SHA-256 that the release API
# listed (RUN-lean-asset), and unpacked where elan keeps its toolchains, in the directory elan names for
# leanprover/lean4:v4.35.0 (leanprover--lean4---v4.35.0). elan then treats it as installed, which the last two
# commands show.
RUN set -eux; \
    curl -fsSL --retry 3 -o /tmp/elan.tar.gz "https://github.com/leanprover/elan/releases/download/v${ELAN_VERSION}/elan-x86_64-unknown-linux-gnu.tar.gz"; \
    echo "${ELAN_SHA256}  /tmp/elan.tar.gz" | sha256sum -c -; \
    tar -xzf /tmp/elan.tar.gz -C /tmp; \
    /tmp/elan-init -y --default-toolchain none --no-modify-path; \
    curl -fsSL --retry 3 -o /tmp/lean.tar.zst "https://github.com/leanprover/lean4/releases/download/v${LEAN_VERSION}/lean-${LEAN_VERSION}-linux.tar.zst"; \
    echo "${LEAN_ARCHIVE_SHA256}  /tmp/lean.tar.zst" | sha256sum -c -; \
    mkdir -p "/opt/elan/toolchains/leanprover--lean4---v${LEAN_VERSION}"; \
    zstd -dc /tmp/lean.tar.zst | tar -x -C "/opt/elan/toolchains/leanprover--lean4---v${LEAN_VERSION}" --strip-components=1; \
    elan default "leanprover/lean4:v${LEAN_VERSION}"; \
    rm -f /tmp/elan.tar.gz /tmp/elan-init /tmp/lean.tar.zst; \
    lean --version; lake --version

# Rust 1.96.0 with the wasm target. rustup verifies each component against the channel manifest.
RUN set -eux; \
    curl -fsSL --retry 3 -o /tmp/rustup-init "https://static.rust-lang.org/rustup/archive/${RUSTUP_VERSION}/x86_64-unknown-linux-gnu/rustup-init"; \
    echo "${RUSTUP_INIT_SHA256}  /tmp/rustup-init" | sha256sum -c -; \
    chmod +x /tmp/rustup-init; \
    /tmp/rustup-init -y --no-modify-path --profile minimal --default-toolchain "${RUST_VERSION}" --target wasm32-unknown-unknown; \
    rm -f /tmp/rustup-init; \
    rustc --version; cargo --version

# The pinned crates, fetched into cargo's cache so that a Lane A build needs no network for them. The manifest and
# the lock are RUN-scaffold's (bench/image/rust/ holds the same bytes); `cargo fetch --locked` stops on any
# difference between them and cargo verifies every crate against the lock's checksums.
COPY --chown=learner:learner bench/image/rust/Cargo.toml bench/image/rust/Cargo.lock /opt/statespace/rust/
RUN set -eux; \
    cd /opt/statespace/rust; \
    mkdir src; echo 'fn main() {}' > src/main.rs; \
    cargo fetch --locked; \
    cargo metadata --offline --locked --format-version 1 > /dev/null

# The command line and the tools Python carries. The environment is /opt/venv, outside the home directory, so that a
# root shell (the CI job's) and the learner use one; UV_PROJECT_ENVIRONMENT names it for these steps only, because set
# for good it would send every `uv run` in a lab repository into the image's environment. The dependencies come first
# so that a change to the command line does not reinstall them. `--locked` stops the build when bench/uv.lock is out
# of date.
RUN uv python install "${PYTHON_VERSION}"
COPY --chown=learner:learner bench/pyproject.toml bench/uv.lock /opt/statespace/bench/
RUN set -eux; \
    UV_PROJECT_ENVIRONMENT=/opt/venv uv sync --project /opt/statespace/bench --locked --no-install-project --group image --python "${PYTHON_VERSION}"
COPY --chown=learner:learner bench/statespace/ /opt/statespace/bench/statespace/
RUN set -eux; \
    UV_PROJECT_ENVIRONMENT=/opt/venv uv sync --project /opt/statespace/bench --locked --no-editable --group image --python "${PYTHON_VERSION}"; \
    rm -rf /opt/statespace/bench; \
    statespace --version

# The check that ties the pins in this file to the pins `statespace doctor` holds: PostgreSQL is a service
# container and the sandbox cannot start during a build, so those two are left out.
RUN statespace doctor --skip postgres --sandbox off

WORKDIR /workspaces
CMD ["bash"]
