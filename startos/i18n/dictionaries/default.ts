export const DEFAULT_LANG = 'en_US'

/* Ids are STABLE and must never be renumbered: translations.ts maps id to
 * foreign string, so reassigning an id silently mistranslates that message.
 * Generated from the i18n() calls in the code — regenerate, do not edit. */
const dict = {
  'Share node RPC with other packages': 0,
  'Accept inbound peers': 2,
  'Let other Litecoin nodes connect to yours. Outbound peering works either way; this is what lets others sync from you. Turning it off makes your node a consumer of the network rather than a contributor.': 3,
  'Prune to (MiB)': 4,
  'Enabling pruning deletes block data permanently. Going back to a full node afterwards means resyncing the whole chain.': 6,
  'Transaction index': 7,
  'Database cache (MiB)': 9,
  'The single biggest lever on initial sync time, and largely wasted memory afterwards. Raise it while syncing, lower it once synced. Keep it well under the RAM this server actually has free.': 10,
  Settings: 11,
  'RPC sharing, peering, pruning and sync performance': 12,
  'Saving restarts the node if it is running.': 13,
  Peer: 14,
  'Accepts inbound connections from other Litecoin nodes. Leave this reachable to help others sync.': 15,
  'JSON-RPC': 16,
  'Starting Litecoin Core': 18,
  Node: 19,
  'Litecoin Core is running': 20,
  'Litecoin Core is starting': 21,
  'Chain Sync': 22,
  'Waiting for Litecoin Core to answer RPC': 23,
  'Synced at block ${height}': 24,
  'Fetching the header chain: ${headers} headers so far': 25,
  'Syncing: block ${height} of ${tip} (${pct}%)': 26,
  'Let other packages on this server talk to this node. The RPC is password-protected, but it also exposes wallet methods, so leave this off unless something needs it.': 31,
  'Zero keeps the full chain, which is required to serve blocks to other nodes. A pruned node still validates everything and tracks your balances, but it cannot help anyone else sync. Minimum useful value is about 2048.': 32,
  'Builds an index of every transaction, which roughly doubles initial sync time. Needed only to look up arbitrary historical transactions by id; ordinary wallet use does not require it. Cannot be combined with pruning.': 33,
  'Litecoin JSON-RPC, for other packages on this server that need a trusted Litecoin node. Password-protected, but it also exposes wallet methods: share it only with packages that need it.': 34,
  Username: 35,
  'The name the client logs in with. It must differ from every existing RPC user.': 36,
  'Must be alphanumeric (underscores allowed).': 37,
  'Generate RPC User': 38,
  'Create a username and password for something that needs to reach this node over RPC. The password is shown once and cannot be recovered afterwards — the node stores only a hash of it.': 39,
  'RPC Users': 40,
  'That username is taken': 41,
  'An RPC user called ${username} already exists. Delete it first, or pick another name.': 42,
  'RPC user created': 43,
  'Save this password now. It is not stored and cannot be shown again; if you lose it, delete this user and create another. The service must be restarted for the new user to take effect.': 44,
  'Delete RPC User': 45,
  'Revoke an RPC user. Anything still using that credential will stop being able to reach this node.': 46,
  'The RPC user to remove.': 47,
  'No such RPC user': 48,
  'There is no RPC user called ${username}. Existing users: ${users}': 49,
  'RPC user deleted': 50,
  '${username} can no longer reach this node. Restart the service to apply it.': 51,
  'At block ${height}, waiting for Litecoin Core to report the sync finished': 52,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
