import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

export const shape = z
  .object({
    /* RPC authorisation entries, one per consumer, in Litecoin's own
     * `<user>:<salt>$<hmac>` form.
     *
     * NO PASSWORD IS STORED ANYWHERE. Each entry holds a salted HMAC-SHA256
     * of a password that is shown to the operator exactly once, when they
     * create the user, and is unrecoverable afterwards. A leaked store.json
     * or litecoin.conf therefore leaks no credential.
     *
     * Local callers — the health check, litecoin-cli inside the container —
     * use the cookie file instead and need no entry here. This split is the
     * one bitcoin-core-startos uses. */
    rpcAuth: z.array(z.string()).catch([]),

    /* Expose the RPC beyond this container.
     *
     * Off by default. Litecoin's RPC is password-protected, unlike go-quai's,
     * but it still carries wallet methods, so it is not bound outward unless
     * the operator asks. */
    shareRpc: z.boolean().catch(false),

    /* Prune the chain.
     *
     * 0 keeps the full chain, which is what lets this node serve blocks to
     * peers rather than only consume them. A pruned node still validates
     * every block it sees and tracks balances normally; it just cannot help
     * anyone else sync, because it no longer holds the history. */
    pruneMiB: z.number().int().min(0).catch(0),

    /* Transaction index. Off by default: txindex roughly doubles the time to
     * sync and is only needed to look up arbitrary historical transactions by
     * id, which ordinary wallet and peering use never does. */
    txindex: z.boolean().catch(false),

    /* Database cache in MiB. Raising this is the single biggest lever on
     * initial sync time; it is wasted memory afterwards, so it belongs in
     * config rather than hardcoded. */
    dbCacheMiB: z.number().int().min(64).max(16384).catch(450),

    /* Accept inbound peer connections. Leaving this on is how the node gives
     * back to the network rather than only taking from it. */
    listen: z.boolean().catch(true),
  })
  .strip()

export const storeJson = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)
