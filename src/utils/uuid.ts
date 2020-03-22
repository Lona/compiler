import { v4 } from 'uuid'

// Math.random()-based (RNG)
//
// when executing uuid in JSCore, we don't have access to Crypto,
// so it fails. Instead we will fallback to a Math.random RNG.
// We don't really care about enthropy so it's fine.
export function rng() {
  var rnds = new Array(16)
  for (var i = 0, r; i < 16; i++) {
    if ((i & 0x03) === 0) r = Math.random() * 0x100000000
    // @ts-ignore
    rnds[i] = (r >>> ((i & 0x03) << 3)) & 0xff
  }

  return rnds
}

export const uuid = () => {
  return v4({ rng })
}
