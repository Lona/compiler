import { FuncImplementation } from './runtime/memory'
import { Decode, Encode } from './runtime/value'
import Color from 'color'

const implementations: {
  [key: string]: FuncImplementation
} = {
  'Color.saturate': ({ color, factor }) => {
    const colorString = Decode.color(color)
    const factorNumber = Decode.number(factor) ?? 1

    const result = Color(colorString)
      .saturate(factorNumber)
      .hex()

    return Encode.color(result).memory
  },
}

export default implementations
