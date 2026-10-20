# Litecoin Core for StartOS, from the pinned upstream release tarball.
#
# Not built from source. The official release binaries are the artifact the
# network actually runs, so this image verifies and installs those rather
# than producing a different one.
#
# Version and checksums are passed from startos/manifest/index.ts, which reads
# them from startos/utils.ts. They move together.
ARG LITECOIN_VERSION=0.21.5.8
ARG LITECOIN_SHA256_X86_64
ARG LITECOIN_SHA256_AARCH64
ARG LITECOIN_SHA256_RISCV64

FROM debian:trixie-slim AS fetch
ARG LITECOIN_VERSION
ARG LITECOIN_SHA256_X86_64
ARG LITECOIN_SHA256_AARCH64
ARG LITECOIN_SHA256_RISCV64
# Supplied by the builder. Selects which tarball to fetch and which pinned
# checksum to verify it against — the same mechanism bitcoin-core-startos
# uses for its multi-arch build.
ARG TARGETPLATFORM

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /dl
# No curl --retry here: on retry it restarts into the same partial file and
# corrupts it. One attempt, then the checksum decides.
#
# Every arch is pinned to its OWN checksum, so a build that somehow fetched
# the wrong tarball for its platform fails on the hash rather than shipping a
# binary that cannot execute.
RUN set -eu; \
    case "${TARGETPLATFORM}" in \
      "linux/amd64")   arch="x86_64";  sum="${LITECOIN_SHA256_X86_64}"  ;; \
      "linux/arm64")   arch="aarch64"; sum="${LITECOIN_SHA256_AARCH64}" ;; \
      "linux/riscv64") arch="riscv64"; sum="${LITECOIN_SHA256_RISCV64}" ;; \
      *) echo "unsupported platform: ${TARGETPLATFORM}" >&2; exit 1 ;; \
    esac; \
    [ -n "$sum" ] || { echo "no checksum pinned for ${TARGETPLATFORM}" >&2; exit 1; }; \
    tarball="litecoin-${LITECOIN_VERSION}-${arch}-linux-gnu.tar.gz"; \
    url="https://github.com/litecoin-project/litecoin/releases/download/v${LITECOIN_VERSION}/${tarball}"; \
    echo "fetching ${url}"; \
    curl -fsSL -o litecoin.tar.gz "$url"; \
    echo "${sum}  litecoin.tar.gz" > SHA256; \
    sha256sum -c SHA256; \
    tar -xzf litecoin.tar.gz; \
    mv "litecoin-${LITECOIN_VERSION}" /opt/litecoin

# Glibc base, because the release binaries are linux-gnu. An Alpine base
# would need a musl shim for no benefit.
#
# litecoind links nothing beyond glibc, libstdc++'s runtime bits and libm —
# verified with ldd against the 0.21.5.8 release, highest symbol requirement
# GLIBC_2.16 — so there is no lib/ directory to carry across from the tarball
# the way some Core forks need. Any glibc newer than that works.
#
# TRIXIE, NOT BOOKWORM, and that is load-bearing: riscv64 only became an
# official Debian architecture in Debian 13, so `debian:bookworm-slim`
# publishes no linux/riscv64 image and `make riscv` fails at the FROM line.
# bookworm covers amd64, arm32v5, arm32v7, arm64v8, i386, mips64le, ppc64le
# and s390x; trixie trades mips64le for riscv64. Do not "stabilise" this back
# to bookworm without dropping riscv64 from the manifest and the Makefile.
FROM debian:trixie-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Only the two binaries this package runs. The release tarball also carries
# litecoin-qt, litecoin-tx, litecoin-wallet and test_litecoin, which have no
# use in a headless service; litecoin-qt would pull in X11 if invoked.
COPY --from=fetch /opt/litecoin/bin/litecoind /usr/local/bin/litecoind
COPY --from=fetch /opt/litecoin/bin/litecoin-cli /usr/local/bin/litecoin-cli

COPY docker_entrypoint.sh /usr/local/bin/docker_entrypoint.sh
RUN chmod +x /usr/local/bin/docker_entrypoint.sh \
             /usr/local/bin/litecoind \
             /usr/local/bin/litecoin-cli

# Fail the build rather than ship an image whose binary will not run.
RUN litecoind --version | head -1
