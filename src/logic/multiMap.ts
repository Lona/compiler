import { isDeepStrictEqual } from 'util'

export class MultiMap<Key, Value> {
  dict: { [key: string]: Value[] } = {}

  serializeKey: (key: Key) => string

  constructor(serializeKey?: (key: Key) => string) {
    this.serializeKey = serializeKey || (value => JSON.stringify(value))
  }

  get(key: Key): Value | undefined {
    const existing = this.dict[this.serializeKey(key)]
    return existing ? existing[0] : undefined
  }

  set(key: Key, value: Value) {
    const existing = this.dict[this.serializeKey(key)] || []

    if (
      !existing.find(existingValue => isDeepStrictEqual(existingValue, value))
    ) {
      existing.push(value)
      this.dict[this.serializeKey(key)] = existing
    }
  }
}
