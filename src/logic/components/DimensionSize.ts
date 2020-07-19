import { Value } from '../runtime/value'

export type DimensionSize =
  | {
      type: 'fixed'
      value: number
    }
  | { type: 'flexible' }

export function getDimensionSize({
  type,
  memory,
}: Value): DimensionSize | undefined {
  if (
    type.type === 'constructor' &&
    type.name === 'DimensionSize' &&
    memory.type === 'enum'
  ) {
    const { value, data } = memory

    switch (value) {
      case 'fixed':
        if (data.length !== 1 || data[0].memory.type !== 'number') {
          throw new Error(`Bad DimensionSize data: ${JSON.stringify(data)}`)
        }

        return { type: value, value: data[0].memory.value }
      case 'flexible':
        return { type: value }
      default:
        throw new Error(`Bad DimensionSize case: ${value}`)
    }
  }
}

export function getAndroidDimensionSize(
  dimensionSize: DimensionSize
): string | undefined {
  switch (dimensionSize.type) {
    case 'fixed':
      return `${dimensionSize.value}dp`
    case 'flexible':
      return 'match_parent'
    default:
      break
  }
}
