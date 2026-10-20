# Litecoin Core

This service runs a full Litecoin node on your own server. It downloads and
verifies the entire Litecoin blockchain for itself, and — unless you turn that
off — it also serves blocks to other people's nodes.

## Before you start: disk space

A full Litecoin node keeps the whole chain. **Check that you have room before
you start it**, because running out of space part-way through leaves you with a
half-synced node and nothing useful.

Plan for the current chain size plus comfortable headroom, and remember the
chain only grows. StartOS shows your free space on the server page.

If you do not have the space, you can turn on **Prune to (MiB)** in Settings —
but read what that costs below before you do.

## First start

Start the service and leave it alone. Two health checks tell you where it is:

- **Node** — green once Litecoin Core is running and answering. On a large
  chain this takes a few minutes, because it loads its block index first.
- **Chain Sync** — shows `Syncing: block X of Y` with a percentage, and turns
  green when the node has caught up.

Initial sync typically takes a few days. It is faster if you raise the
database cache (see Settings) while it runs.

**Do not be alarmed if the percentage seems to crawl early on and speed up
later.** Early Litecoin blocks are nearly empty and validate very quickly;
recent blocks are full and take longer. The figure shown is honest block
progress, so it moves at an uneven pace by nature.

## Stopping it safely

When you stop the service, Litecoin Core writes out its database before
exiting. **Let it finish.** StartOS allows it up to ten minutes. If you force
it off part-way through, you can corrupt the chain database and have to resync
from scratch — potentially losing days.

## Settings

**Share node RPC with other packages** — off by default. Turn this on only if
another package on this server needs to talk to your node. The connection is
password-protected, but it also exposes wallet commands, so there is no reason
to turn it on until something actually needs it.

When it is on, the **RPC Credentials** action shows the username and password
to give that software.

**Accept inbound peers** — on by default, and worth leaving on. Your node
connects outward either way; this setting is what lets *other* people sync
from you. Turning it off makes your node a consumer of the network rather than
a contributor to it.

**Prune to (MiB)** — zero keeps the full chain, which is the default.

Setting a value here deletes old block data to save space. Two things to know
before you do:

- A pruned node **still validates every block** and tracks your balances
  normally. You lose nothing about your own wallet.
- A pruned node **cannot help anyone else sync**, because it no longer has the
  history to send them.

Pruning is also one-way in practice: going back to a full node later means
downloading and verifying the whole chain again.

**Transaction index** — off by default, and most people should leave it off.
It roughly doubles your initial sync time and is only useful if you need to
look up arbitrary old transactions by their id. Normal wallet use does not
need it. It cannot be combined with pruning.

**Database cache (MiB)** — the single most effective setting for making the
initial sync faster, and largely wasted memory once you are synced. A common
approach is to raise it while syncing and lower it afterwards. Keep it well
below the RAM your server actually has free, or you will trade one bottleneck
for a worse one.

## Backups

Your **wallet and settings** are backed up. The **blockchain is not.**

That is deliberate. The chain is large and every byte of it can be downloaded
from the network again, so there is nothing to gain from copying it into a
backup. Your wallet cannot be recovered from anywhere else, so that is what
gets kept.

What this means in practice: restoring from a backup gives you your wallet
back immediately, and the node then resyncs the chain. Budget the same few
days you spent on the first sync.

## Connecting other software

Once **Share node RPC** is on, the RPC interface appears on this service's
page in StartOS with its address. Run the **RPC Credentials** action to see
the username and password, which were generated when the service was
installed.

Treat that password like a key to your wallet, because it is one. Only share
it with software running on this same server.
