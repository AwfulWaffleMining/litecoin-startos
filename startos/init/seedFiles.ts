import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

/**
 * Fills in store defaults on install, update and restore, so main.ts always
 * reads a complete config rather than defaulting field by field at the call
 * site.
 *
 * Deliberately generates NO credential. Local RPC callers use the cookie file
 * litecoind writes itself; external consumers get a per-consumer `rpcauth`
 * entry from the "Generate RPC User" action, whose password is shown once and
 * never stored. There is nothing here to leak.
 */
export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (!kind) return

  // Fills in any field the schema has a default for without disturbing ones
  // the operator has set.
  await storeJson.merge(effects, {})
})
