# litecoin-startos

A StartOS service package for [Litecoin Core](https://github.com/litecoin-project/litecoin).

This file is the technical reference for an agent or administrator working on
the package. End-user documentation lives in `instructions.md`; conventions and
hard-won constraints live in `AGENTS.md`; outstanding work is tracked in this
repository's GitHub issues.

The package is modelled on `dogecoin-startos`, which is modelled on
`bitcoin-core-startos`. `AGENTS.md` marks which rules were paid for in those
siblings rather than here.

## What it runs

Litecoin Core **0.21.5.8**, installed from the official `linux-gnu` release
tarballs and verified against SHA256 values pinned in `startos/utils.ts`.
The package does not build Core from source: the release binaries are the
artifact the network actually runs.

Builds for **x86_64, aarch64 and riscv64**. Each architecture has its own
pinned checksum, and the Dockerfile selects both tarball and checksum from
`TARGETPLATFORM`, failing if no hash is pinned for the platform being built.

Every pinned hash was taken from the release's signed `SHA256SUMS.asc` and
then confirmed by downloading that tarball and recomputing its SHA256. See
`AGENTS.md` for an important caveat about the signing key's provenance.

Default posture is a **full, unpruned, listening node**: it validates the
whole chain itself and serves blocks to peers. Both are configurable and both
default to the contributing choice rather than the cheap one.

## Layout

| path | role |
| --- | --- |
| `startos/utils.ts` | version, checksums, ports, ids. **Cross-package API** |
| `startos/manifest/` | package metadata and descriptions |
| `startos/main.ts` | daemon definition and the two health checks |
| `startos/interfaces.ts` | P2P (always) and RPC (opt-in) interfaces |
| `startos/actions/config.ts` | the operator-facing settings form |
| `startos/actions/rpcUser.ts` | create and revoke per-consumer RPC users |
| `startos/init/seedFiles.ts` | fills in store defaults; generates no credential |
| `startos/fileModels/store.json.ts` | config schema and defaults |
| `startos/backups.ts` | what is and is not worth backing up |
| `docker_entrypoint.sh` | writes `litecoin.conf`, supervises litecoind |
| `Dockerfile` | fetch, verify, install the release binaries |

## Ports

| port | purpose | exposure |
| --- | --- | --- |
| 9333 | P2P | always bound; same external port as internal |
| 9332 | JSON-RPC | bound only when **Share node RPC** is on |

Litecoin Core's own mainnet defaults, confirmed against the binary's `--help`,
so documentation written for `litecoind` applies unchanged.

This package binds **no other ports**. It is a node, not a mining service.
That distinction matters more here than it looks: Litecoin is the parent chain
in Dogecoin/Litecoin merge mining, so there is standing pressure to add a
stratum port. Anything that mines is a separate package that declares a
dependency on this one.

## Health checks

**`litecoind`** — port-listening on the RPC port, with a 120-second grace
period because loading the block index takes time before RPC answers at all.

**`sync`** — parses `getblockchaininfo` and reports, in this order:

- `initialblockdownload === false` → success, with the height
- no headers yet → loading, "fetching the header chain"
- `blocks >= headers` → loading, naming the height and what is being waited on
- headers still arriving in bulk → loading, reporting the header count
- otherwise → loading, with **block height over header height** as a percentage

Two parts of that are load-bearing, and both are inherited fixes.

Progress is *not* taken from `verificationprogress`, which is weighted by
transaction volume: early blocks are far emptier than recent ones, so early in
a sync that field reads below the node's real position.

And the phases are separated by how fast `headers` is **growing**, never by
whether it stopped. `headers` never stops — at the tip it advances with every
new block, forever — so a check that waits for it to hold still waits forever.
`blocks >= headers` gets its own branch for the same reason: it is both the
opening state and the terminal state, and treating it as "early" pins the
check to the opening message once the node reaches the tip. Both of those
shipped in `dogecoin-startos`; Litecoin's 2.5-minute block target would have
concealed the first one for most of a sync.

## Configuration

Config lives in `store.json` and is rendered into `litecoin.conf` by the
entrypoint on every start. The conf file is **regenerated each time** — it is
not a place to hand-edit, and it is excluded from backups as derived state.

Config reaches the entrypoint as environment rather than argv, so nothing
lands in the host process list and `litecoin-cli` finds the node from
`-datadir` without being handed anything per call.

`prune` and `txindex` cannot both be enabled. The config action rejects the
combination at the form, and the entrypoint rejects it again before writing
anything — Core's own error for it only arrives after the block index has
started loading.

**`dbcache`** is the single biggest lever on initial sync time, and largely
wasted memory afterwards. Raise it while syncing, lower it once synced, and
keep it well under the RAM the server actually has free.

## RPC credentials

**No password is stored anywhere**, in `store.json`, in `litecoin.conf`, or in
a backup. The package follows `bitcoin-core-startos`, splitting local from
external callers:

- **Local callers** — the `sync` health check and `litecoin-cli` inside the
  container — authenticate with the `.cookie` file litecoind writes itself.
  Cookie auth is correct for them precisely because `.cookie` is rewritten on
  every start: a caller that reads it per call always has the current one.
- **External consumers** each get their own entry from the **Generate RPC
  User** action, stored as `rpcauth=<user>:<salt>$<hmac>`. The password is
  displayed once, at creation, and is unrecoverable afterwards. A leaked
  `litecoin.conf` or `store.json` therefore leaks no credential.

The HMAC is computed in TypeScript with `node:crypto` rather than by shelling
out to upstream's `rpcauth.py`, which would mean carrying a Python image for
one hash. The construction is HMAC-SHA256 keyed by the salt **as a utf-8
string**, not decoded from hex — that detail is what makes it interoperable
with Core's own parser. Verified against litecoind 0.21.5.8 directly: an entry
generated by this code authenticates, a wrong password is refused with
`Authorization failed: Incorrect rpcuser or rpcpassword`, and the generated
conf contains no `rpcpassword` line.

Rotation is delete-and-recreate: revoke with **Delete RPC User**, then issue a
new one. Both take effect on the next restart, since the conf is written at
start.

## Backups

The chain is excluded: tens of gigabytes, byte-for-byte reproducible from the
network, and stale the moment it is written. What is kept is the wallet and
the settings, which are not reproducible.

Chain directories are excluded **by name** rather than keeping an allowlist,
so that a future Litecoin release adding a new chain directory does not
silently start landing in backups. If that happens, add it to the exclude list
in `startos/backups.ts`.

## Building

```bash
npm install
npm run check    # tsc --noEmit
npm run build    # ncc bundle -> javascript/
make             # produce the .s9pk
```

`shellcheck -s sh docker_entrypoint.sh` must be clean.

## Status

**Never built and never installed.** `tsc --noEmit`, `ncc build`,
`prettier --check` and `shellcheck -s sh` pass locally, and none of those
exercise the Docker build or `s9pk pack`, which have no local equivalent
without `start-cli`.

Verified against the real release rather than assumed:

- the x86_64, aarch64 and riscv64 tarball checksums, each taken from the
  signed manifest and reconfirmed by downloading and rehashing
- `litecoind` links only glibc and friends, highest requirement `GLIBC_2.16`,
  with no `lib/` directory in the tarball to carry across
- `initialblockdownload` is present in `getblockchaininfo`
- an `rpcauth` entry generated by this package's own code authenticates
  against a live litecoind, and a wrong password is refused
- mainnet P2P 9333 and RPC 9332 from the binary's own help output

Unverified and tracked in GitHub issues: the multi-arch Dockerfile has never
been built, so the `TARGETPLATFORM` branch is the first thing to suspect if CI
fails; the aarch64 and riscv64 binaries have never been executed; and nothing
here has run on StartOS hardware.
