# assets/

Supplementary files that ship inside the `.s9pk` alongside the compiled code —
anything the service needs at runtime that isn't part of the upstream image.
Typical contents:

- entrypoint or wrapper scripts the daemon execs,
- configuration templates / generators,
- static files (default configs, seed data, certificates),
- an `ABOUT.md` or other docs you want bundled.

To make these files visible inside a container, mount them in `startos/main.ts`
with `sdk.Mounts.…mountAssets(…)` and exec against the mountpoint.

This directory is **required and must not be empty** — `start-cli s9pk
list-ingredients` lists `assets` as an ingredient, and git does not track empty
directories, so an empty one fails the build with:

    make[1]: *** No rule to make target 'assets', needed by 'ingredients'.

This package currently ships **no runtime assets**: `docker_entrypoint.sh` is
baked into the image by the `Dockerfile`, and `litecoin.conf` is generated at
start rather than templated from a file here. This README exists only to keep
the directory tracked. Do not delete it unless you are adding real assets to
replace it.
