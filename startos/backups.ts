import { sdk } from './sdk'
import { dataSubdir } from './utils'

/**
 * Recipe: "Back Up and Restore Data".
 *
 * The chain is excluded. It is tens of gigabytes, it is byte-for-byte
 * reproducible from the network, and including it would make the backup both
 * enormous and stale. What is NOT reproducible is the wallet and the
 * settings, so those are what get kept.
 *
 * Everything under the datadir is excluded by name except the wallet, rather
 * than the reverse, so a future Litecoin release that adds a new chain
 * directory does not silently start landing in backups.
 */
export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes('main').setOptions({
    exclude: [
      `${dataSubdir}/blocks/`,
      `${dataSubdir}/chainstate/`,
      `${dataSubdir}/indexes/`,
      `${dataSubdir}/database/`,
      `${dataSubdir}/debug.log`,
      `${dataSubdir}/peers.dat`,
      `${dataSubdir}/banlist.dat`,
      `${dataSubdir}/mempool.dat`,
      `${dataSubdir}/fee_estimates.dat`,
      `${dataSubdir}/.lock`,
      `${dataSubdir}/litecoind.pid`,
      // Derived state: rewritten from store.json on every start, so restoring
      // a stale copy would be at best pointless and at worst misleading. It
      // holds no secret either — only `rpcauth` hashes, never a password.
      `${dataSubdir}/litecoin.conf`,
    ],
  }),
)
