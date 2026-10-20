import { i18n } from './i18n'
import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'
import {
  mainHostId,
  p2pInterfaceId,
  p2pPort,
  rpcHostId,
  rpcInterfaceId,
  rpcPort,
} from './utils'

/**
 * Recipe: "Expose Multiple Interfaces".
 *
 * Two interfaces, with deliberately different exposure:
 *
 *   p2p  always bound. This is what makes the node a participant rather than
 *        a spectator; outbound peering works without it, but nobody can sync
 *        from you unless inbound connections land.
 *
 *   rpc  bound only when the operator turns sharing on. Litecoin's RPC is
 *        password-protected, unlike go-quai's, but it still carries wallet
 *        methods, so the default is closed.
 */
export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const receipts = []

  // Inbound Litecoin peers. Same external port as internal so the address
  // this node advertises to the network is the one that actually works.
  const p2pHost = sdk.MultiHost.of(effects, mainHostId)
  const p2pOrigin = await p2pHost.bindPort(p2pPort, {
    protocol: null,
    addSsl: null,
    preferredExternalPort: p2pPort,
    secure: { ssl: false },
  })
  const p2p = sdk.createInterface(effects, {
    name: i18n('Peer'),
    id: p2pInterfaceId,
    description: i18n(
      'Accepts inbound connections from other Litecoin nodes. Leave this reachable to help others sync.',
    ),
    type: 'p2p',
    masked: false,
    schemeOverride: { ssl: null, noSsl: null },
    username: null,
    path: '',
    query: {},
  })
  receipts.push(await p2pOrigin.export([p2p]))

  const shareRpc =
    (await storeJson.read((s) => s.shareRpc).const(effects)) ?? false

  if (shareRpc) {
    const rpcHost = sdk.MultiHost.of(effects, rpcHostId)
    const rpcOrigin = await rpcHost.bindPort(rpcPort, { protocol: 'http' })
    const rpc = sdk.createInterface(effects, {
      name: i18n('JSON-RPC'),
      id: rpcInterfaceId,
      description: i18n(
        'Litecoin JSON-RPC, for other packages on this server that need a trusted Litecoin node. Password-protected, but it also exposes wallet methods: share it only with packages that need it.',
      ),
      type: 'api',
      masked: false,
      schemeOverride: null,
      // The credential lives in this service's store, not in the URL.
      username: null,
      path: '',
      query: {},
    })
    receipts.push(await rpcOrigin.export([rpc]))
  }

  return receipts
})
