import { setupManifest } from '@start9labs/start-sdk'
import { imageId, litecoinSha256, litecoinVersion } from '../utils'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'litecoin',
  title: 'Litecoin Core',
  license: 'MIT',
  packageRepo: 'https://github.com/AwfulWaffleMining/litecoin-startos',
  upstreamRepo: 'https://github.com/litecoin-project/litecoin',
  marketingUrl: 'https://litecoin.org',
  donationUrl:
    'https://github.com/AwfulWaffleMining/litecoin-startos/blob/main/DONATE.md',
  description: { short, long },
  volumes: ['main'],
  images: {
    [imageId]: {
      source: {
        dockerBuild: {
          buildArgs: {
            LITECOIN_VERSION: litecoinVersion,
            // One checksum per architecture. The Dockerfile selects by
            // TARGETPLATFORM and fails if the matching one is empty, so a new
            // arch cannot be enabled here without pinning its hash first.
            LITECOIN_SHA256_X86_64: litecoinSha256.x86_64,
            LITECOIN_SHA256_AARCH64: litecoinSha256.aarch64,
            LITECOIN_SHA256_RISCV64: litecoinSha256.riscv64,
          },
        },
      },
      arch: ['x86_64', 'aarch64', 'riscv64'],
    },
  },
  hardwareRequirements: {
    // Litecoin Core is light: the chain is a few tens of gigabytes and the
    // UTXO set is small next to Bitcoin's. 2 GB is comfortable for a full
    // node, and the binding constraint is disk, which StartOS surfaces
    // separately. Raising dbcache during the initial sync is the one thing
    // that will want more.
    ram: 2048,
  },
  dependencies: {},
})
