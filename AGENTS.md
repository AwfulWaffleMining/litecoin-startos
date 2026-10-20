# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Keep `README.md` (technical reference for an AI support or administering agent), `instructions.md` (end-user docs) and `UPDATING.md` in sync with your changes.

Don't record work in the repo: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you verified, tried and decided belongs in the commit message and the PR body, and anything outstanding belongs in a GitHub issue. `bitcoin-core-startos` forbids the pattern and that is the convention to follow.

## Where this package came from

It is modelled on `dogecoin-startos`, which is modelled on `bitcoin-core-startos`. Rules below marked **(inherited)** were paid for in that sibling — a bug shipped, was diagnosed and was fixed there. They are repeated here because the same mistake is available in this code, not because it has been made here. Do not quietly drop one on the grounds that this package has never hit it.

## This repo

- **Keep `litecoinVersion` and the `litecoinSha256` entries in `startos/utils.ts` in lockstep.** The Dockerfile verifies the tarball it downloads against the entry for the architecture being built, and the build fails if they disagree. Every hash currently pinned was taken from the release's signed `SHA256SUMS.asc` **and** confirmed by downloading that tarball and recomputing its SHA256. Do both again on a version bump; do not copy a hash from a third-party mirror or release aggregator.
- **The signing key behind `SHA256SUMS.asc` is NOT established.** The manifest for 0.21.5.8 was signed by `D35621D53A1CC6A3456758D03620E9D387E55666`, while a widely circulated verification guide names `59CAF0E96F23F53747945FD4FE3348877809386C` (thrasher-au) for Litecoin releases. That discrepancy was not resolved, so the pinned checksums rest on GitHub serving the release over TLS, not on the signature. `bitcoin-core-startos` verifies a 5-of-7 pinned signer quorum at build time; adding the equivalent here means establishing the key's provenance FIRST, not pinning whichever key happened to sign.
- **Install the release binaries; do not build Litecoin Core from source.** The release tarballs are the artifact the network actually runs. Building a different one means shipping something nobody else is running, for no gain.
- **The base image must be glibc.** The release binaries are `linux-gnu`. `ldd` against 0.21.5.8's `litecoind` shows only libc, libm, libpthread, librt, libgcc_s and the loader, with a highest requirement of `GLIBC_2.16` — so `debian:bookworm-slim` is comfortable, and there is no `lib/` directory in the tarball to carry across. An Alpine base would need a musl shim for no benefit.
- **Never add `curl --retry` to the tarball download. (inherited)** On retry it restarts into the same partial file and corrupts it. One attempt, then the checksum decides.
- **Never pass `-daemon`. (inherited)** StartOS supervises the process; the entrypoint runs litecoind in the foreground and forwards SIGTERM.
- **Do not shorten `sigtermTimeout` in `startos/main.ts`. (inherited)** Litecoin Core writes out its UTXO set on shutdown, and cutting that short is how a chainstate gets corrupted and a user loses the sync.
- **Never report sync progress from `verificationprogress`. (inherited)** It is weighted by transaction volume, and early blocks of any of these chains are far emptier than recent ones, so early in a sync it reads below the node's real position. Use block height against header height.
- **Never gate the sync check on `headers` holding still, and never let `blocks >= headers` mean "early". (inherited)** Both shipped in `dogecoin-startos` and both come from the same mistake: the start and the end of a sync are not distinguishable by comparing `blocks` and `headers` alone. `headers` never stops moving — at the tip it advances forever as blocks are mined — so a counter that resets whenever `headers` grows never reaches its threshold. And `blocks >= headers`, meant to catch the opening state, is also exactly the terminal state, so reaching the tip pins the check to the opening message permanently.
  **Litecoin would have hidden the first of those far better than Dogecoin did.** Dogecoin's 60-second block target against a 30-second probe made the message flap every couple of minutes, which is how it got noticed. Litecoin's 2.5-minute target means several consecutive probes usually DO see an unchanged `headers`, so the check would look fine for the whole sync and misbehave only near the tip. Separate the phases by how fast headers are GROWING, and give `blocks >= headers` its own branch.
- **`initialblockdownload` is present in 0.21.5.8** — confirmed by running the release binary and calling `getblockchaininfo`, not inferred from the Bitcoin Core lineage. It is the authoritative green signal and is checked FIRST, but everything below it must still be correct while it reads true, which is exactly what the bug above got wrong.
- **`prune` and `txindex` are mutually exclusive. (inherited)** Both the config action and the entrypoint reject the combination; keep both checks. Core's own error only arrives after it has begun loading the block index.
- **No password is stored anywhere, and it must stay that way.** Local callers (the sync health check, `litecoin-cli` in the container) authenticate with the `.cookie` file litecoind writes itself. External consumers each get an `rpcauth=<user>:<salt>$<hmac>` entry from the Generate RPC User action; the password is shown once and is unrecoverable. A leaked `litecoin.conf` or `store.json` leaks no credential. This follows `bitcoin-core-startos`.
- **`rpcauth` is computed in TypeScript with `node:crypto`, not by shelling out to `rpcauth.py`.** `bitcoin-core-startos` vendors that script and a Python image; the construction is one HMAC-SHA256 keyed by the salt **as a utf-8 string** (not decoded from hex), so the image is unnecessary. Verified against litecoind 0.21.5.8 directly: an entry generated by this code authenticates, a wrong password is refused with `Authorization failed`, and the written conf contains no `rpcpassword` line.
- **This package is a NODE, not a mining service. Keep mining out of it.** Every Start9 and Umbrel base node package omits mining concerns: contributing to the network by running a node is a different activity from mining against it, and most people installing this want the former. It binds no stratum port and reserves no mining ids. That matters here specifically — Litecoin is the parent chain in Dogecoin/Litecoin merge mining, so there is standing pressure to bolt mining onto it. Resist it. The RPC exists for *any* dependent that needs a trusted Litecoin node, and whatever mines declares a dependency on this.
- **The ids and ports exported from `startos/utils.ts`, and the health check ids, are a PUBLISHED API.** A dependent package imports them — the same split `go-quai-startos` has with `quai-dashboard-startos`. Renaming any of them breaks the sibling.
- **Ports are Litecoin Core's own mainnet defaults**, P2P 9333 and RPC 9332, confirmed against the binary's own `--help` rather than from memory, so documentation written for litecoind applies unchanged.
- **`getDefaultString` charsets are COMMA-SEPARATED ranges (inherited)**, e.g. `'a-z,A-Z,0-9'`. `'a-zA-Z0-9'` throws `unexpected "A"` at runtime. `charset` is typed as a plain `string`, so this typechecks, bundles, passes the SDK lint, packs into a valid `.s9pk`, and then fails the INSTALL with a bare `Service Runtime Error: Error: unexpected "A"` naming neither the field nor the file. If any code here generates a random string, call the generator once in a scratch script before trusting it.
- **`assets/README.md` must exist. (inherited)** `start-cli s9pk list-ingredients` lists `assets` as an ingredient and git does not track empty directories, so deleting the only file in there fails the build with `No rule to make target 'assets'` — a message that points at make rather than at the missing directory. This package ships no runtime assets; the README keeps the directory tracked.
- **`icon.svg` is a flat mark of a few hundred bytes, and it must carry its own contrast. (inherited)** The SDK finds the icon by filename — any root-level `icon.*` with an image MIME type — so there is no manifest entry to update, and exactly one `icon.*` must exist or the choice between them is arbitrary. It renders small, so detail is paid for and not seen; a flat mark is correct. And StartOS's UI is dark, so a bare dark glyph all but disappears — `bitcoin-core-startos` overrides its path to `fill="#fff"` and `go-quai-startos` sits its mark on an opaque rect for that reason. What ships here is the official Litecoin Ł from Simple Icons (CC0) over a white disc, so the knocked-out Ł reads white and the coin supplies its own contrast on any background. The white disc is deliberately a hair smaller than the glyph's own circle: coincident edges let a renderer bleed a white fringe around the rim, and the Ł is nowhere near that radius, so the shrink is free.
- **Keep mining imagery out of the icon too. (inherited)** A pickaxe placeholder shipped in the sibling and contradicted its own node-not-a-miner rule in the one asset every user sees first.
- **The generated `litecoin.conf` is MAINNET-ONLY by construction, and Core enforces that.** `rpcport`, `port` and `rpcbind` are written at the top level, which Core applies to the default network. Start the same conf with `-regtest` or `-testnet` and litecoind refuses to boot: `Error: Config setting for -rpcbind only applied on regtest network when in [regtest] section.` That is not a defect — this package runs mainnet and nothing else — but it means any future testnet or regtest support must write those keys inside a `[regtest]` / `[testnet]` section rather than adding a flag. Verified both ways against litecoind 0.21.5.8: mainnet reaches "Done loading" and answers RPC with a generated credential; the identical conf with `-regtest` fails to start.
- **Test `docker_entrypoint.sh` under POSIX `sh`** and keep it ShellCheck-clean (`shellcheck -s sh`). Every check that can fail a start must run before the first write, so a rejected configuration leaves no half-written `litecoin.conf`.
- **`startos/i18n/dictionaries/default.ts` is generated from the `i18n()` calls in the code.** Regenerate it rather than editing it; a hand-maintained dictionary drifts from the call sites.
- **i18n ids are STABLE and must never be renumbered. (inherited)** `translations.ts` maps id to foreign string, so reassigning an id silently mistranslates that message — nothing typechecks it and nothing fails at build. A generator that orders keys by file path reshuffles every id when a source file is added; preserve existing ids and only append. After any i18n change, verify every language is complete AND that each translation's `${placeholders}` match the English key's, since a renamed placeholder leaves translations referencing a variable the code no longer passes.

## Building: four things that fail a fresh repo (inherited)

All four were hit on the way to the first green build of `dogecoin-startos`.
Any new StartOS package starts with these.

1. **`package-lock.json` must be committed.** The reusable workflow runs
   `npm ci`, which hard-fails without a lockfile rather than falling back to
   `npm install`. Symptom: `DiscoverMatrix` fails in ~15 seconds.
2. **`assets/` must contain at least one file.** See the rule above. Symptom:
   `make[1]: *** No rule to make target 'assets', needed by 'ingredients'`.
3. **The `DEV_KEY` secret must be byte-exact.** Pasting the PEM through a
   Windows clipboard produced UTF-16, and `start-cli s9pk pack` failed with
   `PEM preamble contains invalid data (NUL byte)`. Set it from the file with
   input redirection (`gh secret set DEV_KEY --repo <repo> < key.pem`), never
   through an editor or a PowerShell pipe, which can also rewrite LF as CRLF.
4. **Workflows must name the branch the repo actually uses.** `gh repo create`
   pushes to `master` while the workflows here target `main`.
   `workflow_dispatch` still runs, so this fails silently rather than loudly.

Note what CI validates that no local check does: `npm run check`, the SDK lint
and `npm run build` all pass locally, but `make ingredients` (the Docker build)
and `start-cli s9pk pack` have no local equivalent without `start-cli`
installed. A clean local run says nothing about either — and this package's
multi-arch Dockerfile has had NO build of any kind run against it yet, so the
`TARGETPLATFORM` branch is the first thing to suspect if CI fails.
