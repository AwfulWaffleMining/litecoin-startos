/* ── upstream release ──────────────────────────────────────────────────────
 *
 * Pinned release and its checksums. The Dockerfile verifies the tarball it
 * downloads against the entry for the architecture it is building, and the
 * build fails if they disagree. Version and checksums move together or not
 * at all.
 *
 * Every hash below was verified three ways before being pinned: taken from
 * the `litecoin-0.21.5.8-SHA256SUMS.asc` manifest published with the release,
 * then confirmed by downloading each tarball and recomputing its SHA256.
 *
 * NOT established: that the PGP key which signed that manifest
 * (D35621D53A1CC6A3456758D03620E9D387E55666) is an official Litecoin release
 * key. A widely circulated guide names a different fingerprint for Litecoin
 * releases (59CAF0E96F23F53747945FD4FE3348877809386C, thrasher-au), and the
 * discrepancy was not resolved. These checksums rest on the release being
 * served by GitHub over TLS, not on that signature. Anyone adding signature
 * verification to the build — the way bitcoin-core-startos pins a 5-of-7
 * signer quorum — must establish the key's provenance first.
 */
export const litecoinVersion = '0.21.5.8'

export const litecoinSha256 = {
  x86_64: '43200c9f9d65ebc126ea5833ca9429e144c4b3273da6bb9f4e89fd7450ab1be9',
  aarch64: '129f55defb9045d5635566382c7b9f6fd227d4106a6fc07847a38b25ff9b29a1',
  riscv64: '9122755a15b4da700130978d55fc6162dfda0cb2b14fe9bf93e631b4036a7864',
} as const

/* ── ports ─────────────────────────────────────────────────────────────────
 *
 * Litecoin Core's own mainnet defaults, so documentation written for
 * litecoind applies unchanged. Confirmed against the binary's own help
 * output rather than from memory.
 */
export const p2pPort = 9333
export const rpcPort = 9332

export const mountpoint = '/data'

/* Where litecoind keeps its datadir inside the volume. Kept in its own
 * subdirectory so store.json and future siblings can live alongside it
 * without litecoind treating them as chain files. */
export const dataSubdir = 'litecoin'

/* ── ids ───────────────────────────────────────────────────────────────────
 *
 * These are an API. A dependent package imports them to find this node's RPC
 * and to depend on its health checks. Renaming one breaks that package — the
 * same contract go-quai-startos has with quai-dashboard-startos.
 *
 * This package is a NODE. It binds no stratum port and reserves no mining
 * ids; those belong to whatever package mines against it. See AGENTS.md.
 */
export const mainHostId = 'main'
export const rpcHostId = 'rpc'

/* The cookie file litecoind writes for local RPC auth. Public API: a
 * dependent that can read this volume authenticates with it instead of
 * needing a credential issued to it. Same contract bitcoin-core-startos
 * publishes as `rpccookiefile`. */
export const rpcCookieFile = '.cookie'

export const rpcInterfaceId = 'rpc'
export const p2pInterfaceId = 'p2p'

// Health check ids, also part of the cross-package contract.
export const healthCheckIds = {
  node: 'litecoind',
  sync: 'sync',
} as const

export const imageId = 'litecoin'
