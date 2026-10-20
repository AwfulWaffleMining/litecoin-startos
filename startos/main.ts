import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  dataSubdir,
  healthCheckIds,
  imageId,
  mountpoint,
  p2pPort,
  rpcPort,
} from './utils'

/* Shape of Litecoin Core 0.21's getblockchaininfo. Only the fields this
 * package relies on; the call returns more.
 *
 * `initialblockdownload` was confirmed present in 0.21.5.8 by running the
 * release binary and calling the RPC, not assumed from the Bitcoin Core
 * lineage. The sync check treats a missing field as "still syncing", so its
 * absence would leave the service permanently yellow with nothing to explain
 * it. */
type ChainInfo = {
  chain: string
  blocks: number
  headers: number
  verificationprogress?: number
  initialblockdownload?: boolean
  size_on_disk?: number
  pruned?: boolean
}

const datadir = `${mountpoint}/${dataSubdir}`

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Litecoin Core'))

  const store = await storeJson.read().const(effects)

  const sub = await sdk.SubContainer.of(
    effects,
    { imageId },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint,
      readonly: false,
    }),
    imageId,
  )

  /* Config goes to the entrypoint as environment, which writes litecoin.conf
   * inside the datadir. Not as argv, where it would be visible in the host
   * process list.
   *
   * RPC_AUTH is newline-separated because litecoin.conf takes one `rpcauth=`
   * line per consumer and there may be several. Each is already a hash, so
   * nothing secret travels here. */
  const env: Record<string, string> = {
    LITECOIN_DATADIR: datadir,
    RPC_AUTH: (store?.rpcAuth ?? []).join('\n'),
    RPC_PORT: String(rpcPort),
    P2P_PORT: String(p2pPort),
    SHARE_RPC: store?.shareRpc ? '1' : '0',
    PRUNE_MIB: String(store?.pruneMiB ?? 0),
    TXINDEX: store?.txindex ? '1' : '0',
    DBCACHE_MIB: String(store?.dbCacheMiB ?? 450),
    LISTEN: store?.listen === false ? '0' : '1',
  }

  /* Highest `headers` seen so far, so the sync check can measure how fast the
   * header chain is growing between probes. Litecoin fetches headers in
   * batches, so during the first minutes `headers` is "how many headers have
   * arrived", not the network tip, and a percentage against it is measured
   * against a moving target. The growth rate is what separates that phase
   * from block download — see the check itself for why "did it stop moving"
   * does not work. */
  let maxHeaders = 0

  const readChainInfo = async (): Promise<ChainInfo | null> => {
    try {
      const res = await sub.exec(
        ['litecoin-cli', `-datadir=${datadir}`, 'getblockchaininfo'],
        {},
        20_000,
      )
      const out = String(res.stdout ?? '')
      // Non-zero while the block index loads; that is not an error worth
      // surfacing, the caller reports "starting" instead.
      if (res.exitCode !== 0 || !out.trim()) return null
      return JSON.parse(out) as ChainInfo
    } catch {
      return null
    }
  }

  return sdk.Daemons.of(effects)
    .addDaemon(healthCheckIds.node, {
      subcontainer: sub,
      exec: {
        command: ['/usr/local/bin/docker_entrypoint.sh'],
        env,
        /* Litecoin Core writes out its UTXO set on shutdown. Cutting that
         * short is how a chainstate gets corrupted and a user loses days of
         * syncing, so allow well past the worst case rather than the default. */
        sigtermTimeout: 600_000,
      },
      ready: {
        display: i18n('Node'),
        // Loading the block index on a large chain takes minutes before RPC
        // answers at all.
        gracePeriod: 120_000,
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, rpcPort, {
            successMessage: i18n('Litecoin Core is running'),
            errorMessage: i18n('Litecoin Core is starting'),
          }),
      },
      requires: [],
    })
    .addHealthCheck(healthCheckIds.sync, {
      ready: {
        display: i18n('Chain Sync'),
        // Every probe is a local RPC call, but the answer only changes on the
        // order of seconds, so there is nothing to gain from polling harder.
        trigger: sdk.trigger.statusTrigger(30_000, {
          starting: 10_000,
          failure: 15_000,
        }),
        fn: async () => {
          const info = await readChainInfo()

          if (!info) {
            return {
              result: 'starting' as const,
              message: i18n('Waiting for Litecoin Core to answer RPC'),
            }
          }

          const { blocks, headers } = info

          if (info.initialblockdownload === false) {
            return {
              result: 'success' as const,
              message: i18n('Synced at block ${height}', {
                height: String(blocks),
              }),
            }
          }

          /* How fast the header chain is growing, NOT whether it held still.
           *
           * Litecoin pulls headers in batches of thousands during the header
           * phase; once it has them, `headers` advances by one roughly every
           * 2.5 minutes as blocks are mined, and never stops. So a check that
           * waits for `headers` to stop changing waits forever.
           *
           * This is inherited from dogecoin-startos, where exactly that bug
           * shipped. Dogecoin's 60-second target against a 30s probe made it
           * obvious — the message flapped every couple of minutes. Litecoin's
           * 2.5-minute target would have hidden it far longer, since several
           * consecutive probes usually DO see an unchanged `headers`, and it
           * would then have surfaced only near the tip. Same bug, quieter.
           *
           * The growth RATE separates the phases cleanly; equality never
           * could. */
          const grew = headers - maxHeaders
          if (headers > maxHeaders) maxHeaders = headers
          const bulkFetching = grew > 10

          if (!headers) {
            return {
              result: 'loading' as const,
              message: i18n(
                'Fetching the header chain: ${headers} headers so far',
                { headers: '0' },
              ),
            }
          }

          /* Blocks have reached every header this node knows of, yet it has
           * not declared itself out of initial block download.
           *
           * This is NOT the start of a sync, where blocks is 0 and headers
           * passes it within seconds — it is the end, and the previous version
           * of this check routed it back into the "fetching the header chain"
           * message and pinned there for good. Report the height instead: a
           * percentage here would read 100% while the service sat yellow,
           * which is worse than saying plainly what is being waited on. */
          if (blocks >= headers) {
            return {
              result: 'loading' as const,
              message: i18n(
                'At block ${height}, waiting for Litecoin Core to report the sync finished',
                { height: String(blocks) },
              ),
            }
          }

          /* Headers are still arriving in bulk, so they are not yet the
             network tip and there is no trustworthy denominator. Report the
             headers themselves — that number climbing is the honest signal of
             progress — rather than a percentage against a moving target. */
          if (bulkFetching) {
            return {
              result: 'loading' as const,
              message: i18n(
                'Fetching the header chain: ${headers} headers so far',
                { headers: String(headers) },
              ),
            }
          }

          /* Headers have settled to a trickle, so they are the network tip and
           * block/headers is a real percentage.
           *
           * Deliberately NOT verificationprogress, which is weighted by
           * transaction volume: Litecoin's early blocks are nearly empty and
           * its recent ones are not, so early in a sync that field reads far
           * below the node's real position. Block count is cruder and does
           * not mislead. */
          const pct = ((blocks / headers) * 100).toFixed(2)
          return {
            result: 'loading' as const,
            message: i18n('Syncing: block ${height} of ${tip} (${pct}%)', {
              height: String(blocks),
              tip: String(headers),
              pct,
            }),
          }
        },
      },
      requires: [healthCheckIds.node],
    })
})
