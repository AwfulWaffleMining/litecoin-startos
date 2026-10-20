import { createHmac, randomBytes } from 'node:crypto'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

/**
 * Per-consumer RPC credentials, following bitcoin-core-startos.
 *
 * Litecoin's `rpcauth` takes `<user>:<salt>$<hmac>`, so the node never holds a
 * password — only a salted HMAC-SHA256 of one. The password is shown to the
 * operator once, at creation, and is unrecoverable afterwards. A leaked
 * litecoin.conf or store.json therefore leaks no credential.
 *
 * bitcoin-core-startos shells out to a vendored `rpcauth.py` in a Python
 * image. That is unnecessary here: the construction is one HMAC, and Start9
 * packages can import Node builtins (bitcoin-core's own main.ts imports
 * `node:https`). Verified against litecoind directly — an entry built this way
 * authenticates, and a wrong password is refused.
 */
const rpcAuthEntry = (username: string, password: string) => {
  const salt = randomBytes(16).toString('hex')
  // The salt is the HMAC KEY, as a utf-8 string — not decoded from hex. That
  // detail is what makes this interoperable with Litecoin's own parser.
  const hash = createHmac('sha256', salt).update(password).digest('hex')
  return `${username}:${salt}$${hash}`
}

const usernameOf = (entry: string) => entry.split(':')[0]

const usernameSpec = {
  name: i18n('Username'),
  description: i18n(
    'The name the client logs in with. It must differ from every existing RPC user.',
  ),
  required: true as const,
  default: null,
  patterns: [
    {
      regex: '^[a-zA-Z0-9_]+$',
      description: i18n('Must be alphanumeric (underscores allowed).'),
    },
  ],
}

export const generateRpcUser = sdk.Action.withInput(
  'generate-rpc-user',

  async ({ effects }) => ({
    name: i18n('Generate RPC User'),
    description: i18n(
      'Create a username and password for something that needs to reach this node over RPC. The password is shown once and cannot be recovered afterwards — the node stores only a hash of it.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('RPC Users'),
    visibility: 'enabled',
  }),

  InputSpec.of({ username: Value.text(usernameSpec) }),

  async ({ effects }) => {},

  async ({ effects, input }) => {
    const existing = (await storeJson.read().once())?.rpcAuth ?? []

    if (existing.some((e) => usernameOf(e) === input.username)) {
      return {
        version: '1' as const,
        title: i18n('That username is taken'),
        message: i18n(
          'An RPC user called ${username} already exists. Delete it first, or pick another name.',
          { username: input.username },
        ),
        result: null,
      }
    }

    /* base64url, so the password can be pasted into a config file, a shell
     * command or a URL without escaping. 32 bytes of entropy. */
    const password = randomBytes(32).toString('base64url')

    await storeJson.merge(effects, {
      rpcAuth: [...existing, rpcAuthEntry(input.username, password)],
    })

    return {
      version: '1' as const,
      title: i18n('RPC user created'),
      message: i18n(
        'Save this password now. It is not stored and cannot be shown again; if you lose it, delete this user and create another. The service must be restarted for the new user to take effect.',
      ),
      result: {
        type: 'single' as const,
        value: `${input.username}:${password}`,
        copyable: true,
        masked: true,
        qr: false,
      },
    }
  },
)

export const deleteRpcUser = sdk.Action.withInput(
  'delete-rpc-user',

  async ({ effects }) => ({
    name: i18n('Delete RPC User'),
    description: i18n(
      'Revoke an RPC user. Anything still using that credential will stop being able to reach this node.',
    ),
    warning: i18n('Saving restarts the node if it is running.'),
    allowedStatuses: 'any',
    group: i18n('RPC Users'),
    // Hidden when there are none to delete, rather than offering an action
    // that can only fail.
    visibility:
      ((await storeJson.read((s) => s.rpcAuth).once()) ?? []).length > 0
        ? 'enabled'
        : 'hidden',
  }),

  InputSpec.of({
    username: Value.text({
      ...usernameSpec,
      description: i18n('The RPC user to remove.'),
    }),
  }),

  async ({ effects }) => {},

  async ({ effects, input }) => {
    const existing = (await storeJson.read().once())?.rpcAuth ?? []
    const remaining = existing.filter((e) => usernameOf(e) !== input.username)

    if (remaining.length === existing.length) {
      return {
        version: '1' as const,
        title: i18n('No such RPC user'),
        message: i18n(
          'There is no RPC user called ${username}. Existing users: ${users}',
          {
            username: input.username,
            users: existing.map(usernameOf).join(', ') || '(none)',
          },
        ),
        result: null,
      }
    }

    await storeJson.merge(effects, { rpcAuth: remaining })

    return {
      version: '1' as const,
      title: i18n('RPC user deleted'),
      message: i18n(
        '${username} can no longer reach this node. Restart the service to apply it.',
        { username: input.username },
      ),
      result: null,
    }
  },
)
