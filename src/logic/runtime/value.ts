import * as StaticType from '../staticType'
import * as Memory from './memory'

export type Value = {
  type: StaticType.StaticType
  memory: Memory.Memory
}

export namespace Encode {
  export const unit = (): Value => ({
    type: StaticType.unit,
    memory: Memory.unit(),
  })

  export const bool = (value: boolean): Value => ({
    type: StaticType.bool,
    memory: Memory.bool(value),
  })

  export const number = (value: number): Value => ({
    type: StaticType.number,
    memory: Memory.number(value),
  })

  export const string = (value: string): Value => ({
    type: StaticType.string,
    memory: Memory.string(value),
  })

  export const color = (value: string): Value => ({
    type: StaticType.color,
    memory: {
      type: 'record',
      value: {
        value: {
          type: StaticType.string,
          memory: Memory.string(value),
        },
      },
    },
  })

  export const array = (
    elementType: StaticType.StaticType,
    values: Value[]
  ) => ({
    type: elementType,
    memory: Memory.array(values),
  })
}

export namespace Decode {
  export const string = ({ type, memory }: Value): string | undefined => {
    if (
      type.type === 'constructor' &&
      type.name === 'String' &&
      memory.type === 'string'
    ) {
      return memory.value
    }
  }
  export const number = ({ type, memory }: Value): number | undefined => {
    if (
      type.type === 'constructor' &&
      type.name === 'Number' &&
      memory.type === 'number'
    ) {
      return memory.value
    }
  }

  export const color = ({ type, memory }: Value): string | undefined => {
    if (
      type.type === 'constructor' &&
      type.name === 'Color' &&
      memory.type === 'record'
    ) {
      const colorValue = memory.value['value']
      return string(colorValue)
    }
  }

  export const optional = ({ type, memory }: Value): Value | undefined => {
    if (
      type.type === 'constructor' &&
      type.name === 'Optional' &&
      memory.type === 'enum' &&
      memory.value === 'value'
    ) {
      return memory.data[0]
    }
  }

  export const fontWeightToNumberMapping: { [key: string]: string } = {
    ultraLight: '100',
    thin: '200',
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
    black: '900',
  }

  export const fontNumberToWeightMapping: {
    [key: string]: string
  } = Object.fromEntries(
    Object.entries(fontWeightToNumberMapping).map(([key, value]) => [
      value,
      key,
    ])
  )

  export const fontWeight = ({ type, memory }: Value): string | undefined => {
    if (
      type.type === 'constructor' &&
      type.name === 'FontWeight' &&
      memory.type === 'enum'
    ) {
      return fontWeightToNumberMapping[memory.value]
    }
  }

  export type EvaluatedShadow = {
    x: number
    y: number
    blur: number
    radius: number
    color: string
  }

  export const shadow = ({
    type,
    memory,
  }: Value): EvaluatedShadow | undefined => {
    if (
      type.type === 'constructor' &&
      type.name === 'Shadow' &&
      memory.type === 'record'
    ) {
      return {
        x: Decode.number(memory.value['x']) ?? 0,
        y: Decode.number(memory.value['y']) ?? 0,
        blur: Decode.number(memory.value['blur']) ?? 0,
        radius: Decode.number(memory.value['radius']) ?? 0,
        color: Decode.color(memory.value['color']) ?? 'black',
      }
    }
  }

  export type EvaluatedTextStyle = {
    fontName?: string
    fontFamily?: string
    fontWeight?: number
    fontSize?: number
    lineHeight?: number
    letterSpacing?: number
    color?: string
  }

  export const textStyle = ({
    type,
    memory,
  }: Value): EvaluatedTextStyle | undefined => {
    if (
      type.type === 'constructor' &&
      type.name === 'TextStyle' &&
      memory.type === 'record'
    ) {
      const fontName = Decode.optional(memory.value['fontName'])
      const fontFamily = Decode.optional(memory.value['fontFamily'])
      const fontWeight = memory.value['fontWeight']
      const fontSize = Decode.optional(memory.value['fontSize'])
      const lineHeight = Decode.optional(memory.value['lineHeight'])
      const letterSpacing = Decode.optional(memory.value['letterSpacing'])
      const color = Decode.optional(memory.value['color'])

      return {
        ...(fontName && { fontName: Decode.string(fontName) }),
        ...(fontFamily && { fontFamily: Decode.string(fontFamily) }),
        ...(fontWeight && {
          fontWeight: Number(Decode.fontWeight(fontWeight)),
        }),
        ...(fontSize && { fontSize: Decode.number(fontSize) }),
        ...(lineHeight && { lineHeight: Decode.number(lineHeight) }),
        ...(letterSpacing && { letterSpacing: Decode.number(letterSpacing) }),
        ...(color && { color: Decode.color(color) }),
      }
    }
  }
}
