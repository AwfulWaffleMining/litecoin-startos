# Updating

## What "upstream" means here

Litecoin Core, from <https://github.com/litecoin-project/litecoin>. This
package does **not** build it — it installs the official `linux-gnu` release
binaries and verifies them against pinned checksums. The release binaries are
the artifact the network actually runs; building a different one means
shipping something nobody else is running.

## Where the pin lives

Two things in `startos/utils.ts`, and they move together:

```ts
export const litecoinVersion = '0.21.5.8'

export const litecoinSha256 = {
  x86_64: '43200c9f…',
  aarch64: '129f55de…',
  riscv64: '9122755a…',
} as const
```

`startos/manifest/index.ts` passes the version and all three hashes to the
Dockerfile as build args. The Dockerfile picks the tarball and the hash from
`TARGETPLATFORM`, **fails if no hash is pinned** for that platform, and
**fails the build** if the download does not match. A half-updated pin cannot
produce a package, and a new architecture cannot be enabled in the manifest
without pinning its hash first.

## Bumping Litecoin Core

1. Find the new release and its **signed** `litecoin-<version>-SHA256SUMS.asc`
   on the upstream releases page. Take the line for each architecture this
   package builds: `x86_64`, `aarch64` and `riscv64`, all `-linux-gnu`.
2. **Verify, and understand what the verification is worth.** Download each
   tarball and run `sha256sum` against the manifest value. Note what that does
   and does not prove: hashing a file and comparing it to a hash fetched from
   the same place only proves the transfer was intact. It is authenticity that
   needs an independent anchor — which is why the signature matters, and why
   `AGENTS.md` records that this package's signing key provenance is **not**
   established. Do not copy a checksum from a third-party mirror, a release
   aggregator, or a changelog.
3. Update `litecoinVersion` and every entry in `litecoinSha256`.
4. Read upstream's release notes for anything that changes behaviour this
   package depends on:
   - the shape of `getblockchaininfo` (the sync health check parses `blocks`,
     `headers` and `initialblockdownload` — and treats a missing
     `initialblockdownload` as "still syncing", so a rename upstream leaves
     the service permanently yellow with nothing to explain it),
   - `litecoin.conf` keys written by `docker_entrypoint.sh`
     (`rpcauth`, `rpcbind`, `rpcallowip`, `prune`, `txindex`, `dbcache`,
     `listen`, `port`, `rpcport`),
   - the `rpcauth` format, and whether cookie auth still works for local
     callers,
   - default ports,
   - whether the tarball layout changed — in particular whether a `lib/`
     directory appeared, since the Dockerfile currently copies only the two
     binaries and relies on them linking nothing beyond glibc.
5. Bump the version in `startos/versions/current.ts` and write release notes
   in every locale. The `:N` suffix is the **package** revision; reset it to
   `:0` when the upstream version changes.
6. If the data directory layout changed, add a migration. A pure version bump
   with no data change keeps `migrations.up` as a no-op — but note that
   removing a field from the store shape is itself a change the seed-file
   merge will apply, since zod strips keys the shape no longer declares and
   the merge writes the result back.
7. Build and install on a real StartOS box. A green `tsc` proves the code
   compiles, not that the service works — see `AGENTS.md` for the list of
   failures that pass every local gate.

## Bumping the package without bumping Litecoin

Increment only the `:N` suffix in `startos/versions/current.ts`. StartOS
compares versions to decide whether a sideload is an update, so reinstalling
the same string is not an upgrade path and the install is refused.

The `main` volume persists across package revisions, so a package fix does not
cost a resync. That was verified in `dogecoin-startos`, where a revision bump
on a node 36,000 blocks into its initial sync resumed from where it was. It
has **not** been verified here, because this package has never been installed.

## Architectures

All three of `x86_64`, `aarch64` and `riscv64` are enabled, because the
signed manifest publishes a checksum for each and all three were confirmed by
download. `ARCHES` in the `Makefile` and `arch` in `startos/manifest/index.ts`
must agree with the hashes actually pinned.

Only the x86_64 binary has been **executed**. The other two are pinned and
built but unproven; that is tracked in GitHub issues.
