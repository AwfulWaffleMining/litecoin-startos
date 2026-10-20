import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  shareRpc: Value.toggle({
    name: i18n('Share node RPC with other packages'),
    description: i18n(
      'Let other packages on this server talk to this node. The RPC is password-protected, but it also exposes wallet methods, so leave this off unless something needs it.',
    ),
    default: false,
  }),
  listen: Value.toggle({
    name: i18n('Accept inbound peers'),
    description: i18n(
      'Let other Litecoin nodes connect to yours. Outbound peering works either way; this is what lets others sync from you. Turning it off makes your node a consumer of the network rather than a contributor.',
    ),
    default: true,
  }),
  pruneMiB: Value.number({
    name: i18n('Prune to (MiB)'),
    description: i18n(
      'Zero keeps the full chain, which is required to serve blocks to other nodes. A pruned node still validates everything and tracks your balances, but it cannot help anyone else sync. Minimum useful value is about 2048.',
    ),
    default: 0,
    min: 0,
    max: 1_000_000,
    step: 1,
    integer: true,
    units: 'MiB',
    required: true,
    placeholder: null,
    warning: i18n(
      'Enabling pruning deletes block data permanently. Going back to a full node afterwards means resyncing the whole chain.',
    ),
    immutable: false,
  }),
  txindex: Value.toggle({
    name: i18n('Transaction index'),
    description: i18n(
      'Builds an index of every transaction, which roughly doubles initial sync time. Needed only to look up arbitrary historical transactions by id; ordinary wallet use does not require it. Cannot be combined with pruning.',
    ),
    default: false,
  }),
  dbCacheMiB: Value.number({
    name: i18n('Database cache (MiB)'),
    description: i18n(
      'The single biggest lever on initial sync time, and largely wasted memory afterwards. Raise it while syncing, lower it once synced. Keep it well under the RAM this server actually has free.',
    ),
    default: 450,
    min: 64,
    max: 16_384,
    step: 1,
    integer: true,
    units: 'MiB',
    required: true,
    placeholder: null,
    warning: null,
    immutable: false,
  }),
})

export const config = sdk.Action.withInput(
  'config',

  async ({ effects }) => ({
    name: i18n('Settings'),
    description: i18n('RPC sharing, peering, pruning and sync performance'),
    warning: i18n('Saving restarts the node if it is running.'),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const s = await storeJson.read().once()
    return {
      shareRpc: s?.shareRpc ?? false,
      listen: s?.listen ?? true,
      pruneMiB: s?.pruneMiB ?? 0,
      txindex: s?.txindex ?? false,
      dbCacheMiB: s?.dbCacheMiB ?? 450,
    }
  },

  async ({ effects, input }) => {
    /* Reject the impossible combination here, where the user is looking at
     * the form, rather than letting it through to a start that fails. The
     * entrypoint checks it again — this is a convenience, not the guarantee. */
    if (input.pruneMiB > 0 && input.txindex) {
      throw new Error(
        'Pruning and the transaction index cannot both be enabled. Litecoin Core needs the full chain to build a transaction index.',
      )
    }

    await storeJson.merge(effects, {
      shareRpc: input.shareRpc,
      listen: input.listen,
      pruneMiB: input.pruneMiB,
      txindex: input.txindex,
      dbCacheMiB: input.dbCacheMiB,
    })
  },
)
