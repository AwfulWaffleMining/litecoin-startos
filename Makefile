# Litecoin Core publishes linux-gnu release tarballs for x86_64, aarch64 and
# riscv64, and the checksum for each is pinned in startos/utils.ts after being
# taken from the release's signed SHA256SUMS manifest AND confirmed by
# downloading the tarball and recomputing its hash. All three therefore build.
#
# aarch64 matters here more than it looks: a large share of StartOS installs
# are ARM SBCs, and Litecoin Core is light enough to run well on them.
ARCHES := x86 arm riscv
# overrides to s9pk.mk must precede the include statement
include node_modules/@start9labs/start-sdk/s9pk.mk
