import Color from 'color'

import { HardcodedMap } from './index'
import { Value } from './logicEvaluate'
import { unit, string, bool, color, array, number } from './logicUnify'

const notImplemented: any = (functionName: string) => {
  throw new Error(`${functionName} not implemented`)
}

export const hardcoded: HardcodedMap<Value, (Value | void)[]> = {
  functionCallExpression: {
    'TextAlign.left': notImplemented.bind(null, 'TextAlign.left'),
    'TextAlign.center': notImplemented.bind(null, 'TextAlign.center'),
    'TextAlign.right': notImplemented.bind(null, 'TextAlign.right'),
    'DimensionSize.fixed': notImplemented.bind(null, 'DimensionSize.fixed'),
    'DimensionSize.flexible': notImplemented.bind(
      null,
      'DimensionSize.flexible'
    ),
    Padding: notImplemented.bind(null, 'Padding'),
    'Padding.size': notImplemented.bind(null, 'Padding.size'),
    'ElementParameter.boolean': notImplemented.bind(
      null,
      'ElementParameter.boolean'
    ),
    'ElementParameter.number': notImplemented.bind(
      null,
      'ElementParameter.number'
    ),
    'ElementParameter.string': notImplemented.bind(
      null,
      'ElementParameter.string'
    ),
    'ElementParameter.color': notImplemented.bind(
      null,
      'ElementParameter.color'
    ),
    'ElementParameter.textStyle': notImplemented.bind(
      null,
      'ElementParameter.textStyle'
    ),
    'ElementParameter.elements': notImplemented.bind(
      null,
      'ElementParameter.elements'
    ),
    'ElementParameter.textAlign': notImplemented.bind(
      null,
      'ElementParameter.textAlign'
    ),
    'ElementParameter.dimension': notImplemented.bind(
      null,
      'ElementParameter.dimension'
    ),
    'ElementParameter.padding': notImplemented.bind(
      null,
      'ElementParameter.padding'
    ),
    Element: notImplemented.bind(null, 'Element'),
    View: notImplemented.bind(null, 'View'),
    Text: notImplemented.bind(null, 'Text'),
    VerticalStack: notImplemented.bind(null, 'VerticalStack'),
    HorizontalStack: notImplemented.bind(null, 'HorizontalStack'),
    'Color.saturate': (node, baseColor, percent) => {
      if (
        !baseColor ||
        baseColor.type.type !== 'constant' ||
        baseColor.type.name !== 'Color' ||
        baseColor.memory.type !== 'record' ||
        !baseColor.memory.value.value ||
        baseColor.memory.value.value.memory.type !== 'string'
      ) {
        throw new Error(
          'The first argument of `Color.saturate` need to be a color'
        )
      }

      const parsedColor = Color(baseColor.memory.value.value.memory.value)

      if (!percent || percent.memory.type !== 'number') {
        throw new Error(
          'The second argument of `Color.saturate` need to be a number'
        )
      }

      return {
        type: color,
        memory: {
          type: 'record',
          value: {
            value: {
              type: string,
              memory: {
                type: 'string',
                value: parsedColor.saturate(percent.memory.value).hex(),
              },
            },
          },
        },
      }
    },
    'Color.setHue': (node, baseColor, hue) => {
      if (
        !baseColor ||
        baseColor.type.type !== 'constant' ||
        baseColor.type.name !== 'Color' ||
        baseColor.memory.type !== 'record' ||
        !baseColor.memory.value.value ||
        baseColor.memory.value.value.memory.type !== 'string'
      ) {
        throw new Error(
          'The first argument of `Color.setHue` need to be a color'
        )
      }

      const parsedColor = Color(baseColor.memory.value.value.memory.value)

      if (!hue || hue.memory.type !== 'number') {
        throw new Error(
          'The second argument of `Color.setHue` need to be a number'
        )
      }

      return {
        type: color,
        memory: {
          type: 'record',
          value: {
            value: {
              type: string,
              memory: {
                type: 'string',
                value: parsedColor.hue(hue.memory.value).hex(),
              },
            },
          },
        },
      }
    },
    'Color.setSaturation': (node, baseColor, saturation) => {
      if (
        !baseColor ||
        baseColor.type.type !== 'constant' ||
        baseColor.type.name !== 'Color' ||
        baseColor.memory.type !== 'record' ||
        !baseColor.memory.value.value ||
        baseColor.memory.value.value.memory.type !== 'string'
      ) {
        throw new Error(
          'The first argument of `Color.setSaturation` need to be a color'
        )
      }

      const parsedColor = Color(baseColor.memory.value.value.memory.value)

      if (!saturation || saturation.memory.type !== 'number') {
        throw new Error(
          'The second argument of `Color.setSaturation` need to be a number'
        )
      }

      return {
        type: color,
        memory: {
          type: 'record',
          value: {
            value: {
              type: string,
              memory: {
                type: 'string',
                value: parsedColor.saturationl(saturation.memory.value).hex(),
              },
            },
          },
        },
      }
    },
    'Color.setLightness': (node, baseColor, lightness) => {
      if (
        !baseColor ||
        baseColor.type.type !== 'constant' ||
        baseColor.type.name !== 'Color' ||
        baseColor.memory.type !== 'record' ||
        !baseColor.memory.value.value ||
        baseColor.memory.value.value.memory.type !== 'string'
      ) {
        throw new Error(
          'The first argument of `Color.setLightness` need to be a color'
        )
      }

      const parsedColor = Color(baseColor.memory.value.value.memory.value)

      if (!lightness || lightness.memory.type !== 'number') {
        throw new Error(
          'The second argument of `Color.setLightness` need to be a number'
        )
      }

      return {
        type: color,
        memory: {
          type: 'record',
          value: {
            value: {
              type: string,
              memory: {
                type: 'string',
                value: parsedColor.lightness(lightness.memory.value).hex(),
              },
            },
          },
        },
      }
    },
    'Color.fromHSL': (node, hue, saturation, lightness) => {
      if (!hue || hue.memory.type !== 'number') {
        throw new Error(
          'The first argument of `Color.fromHSL` need to be a number'
        )
      }
      if (!saturation || saturation.memory.type !== 'number') {
        throw new Error(
          'The second argument of `Color.fromHSL` need to be a number'
        )
      }
      if (!lightness || lightness.memory.type !== 'number') {
        throw new Error(
          'The third argument of `Color.fromHSL` need to be a number'
        )
      }

      const parsedColor = Color({
        h: hue.memory.value,
        s: saturation.memory.value,
        l: lightness.memory.value,
      })

      return {
        type: color,
        memory: {
          type: 'record',
          value: {
            value: {
              type: string,
              memory: {
                type: 'string',
                value: parsedColor.hex(),
              },
            },
          },
        },
      }
    },
    'Boolean.or': (node, a, b) => {
      if (!a || a.memory.type !== 'bool') {
        throw new Error(
          'The first argument of `Boolean.or` need to be a boolean'
        )
      }

      if (!b || b.memory.type !== 'bool') {
        throw new Error(
          'The second argument of `Boolean.or` need to be a boolean'
        )
      }

      return {
        type: bool,
        memory: {
          type: 'bool',
          value: a.memory.value || b.memory.value,
        },
      }
    },
    'Boolean.and': (node, a, b) => {
      if (!a || a.memory.type !== 'bool') {
        throw new Error(
          'The first argument of `Boolean.and` need to be a boolean'
        )
      }

      if (!b || b.memory.type !== 'bool') {
        throw new Error(
          'The second argument of `Boolean.and` need to be a boolean'
        )
      }

      return {
        type: bool,
        memory: {
          type: 'bool',
          value: a.memory.value && b.memory.value,
        },
      }
    },
    'String.concat': (node, a, b) => {
      if (!a || a.memory.type !== 'string') {
        throw new Error(
          'The first argument of `String.concat` need to be a string'
        )
      }

      if (!b || b.memory.type !== 'string') {
        throw new Error(
          'The second argument of `String.concat` need to be a string'
        )
      }

      return {
        type: string,
        memory: {
          type: 'string',
          value: a.memory.value + b.memory.value,
        },
      }
    },
    'Number.range': (node, from, to, by) => {
      if (!from || from.memory.type !== 'number') {
        throw new Error(
          'The first argument of `Number.range` need to be a number'
        )
      }
      if (!to || to.memory.type !== 'number') {
        throw new Error(
          'The second argument of `Number.range` need to be a number'
        )
      }
      if (!by || by.memory.type !== 'number') {
        throw new Error(
          'The third argument of `Number.range` need to be a number'
        )
      }

      const arr = []

      if (by.memory.value === 0 || by.memory.value === -0) {
        // a step of 0 is weird
      } else if (by.memory.value > 0 && to.memory.value < from.memory.value) {
        // a positive step when the end is smaller than the beginning is weird
      } else if (by.memory.value < 0 && to.memory.value > from.memory.value) {
        // a negative step when the end is bigger than the beginning is weird
      } else {
        for (
          let i = from.memory.value;
          i < to.memory.value;
          i += by.memory.value
        ) {
          arr.push(i)
        }
      }

      return {
        type: array(number),
        memory: {
          type: 'array',
          value: arr.map(x => ({
            type: number,
            memory: {
              type: 'number',
              value: x,
            },
          })),
        },
      }
    },
    'Array.at': (node, array, index) => {
      if (!array || array.memory.type !== 'array') {
        throw new Error('The first argument of `Array.at` need to be an array')
      }

      if (!index || index.memory.type !== 'number') {
        throw new Error('The second argument of `Array.at` need to be a number')
      }

      return array.memory.value[index.memory.value]
    },
    'Optional.value': (node, value) => {
      if (!value) {
        throw new Error(
          'The first argument of `Optional.value` needs to be a value'
        )
      }
      return value
    },
    Shadow: () => {
      // polyfilled
      return undefined
    },
    TextStyle: () => {
      // polyfilled
      return undefined
    },
    'Optional.none': () => ({
      type: unit,
      memory: { type: 'unit' },
    }),
    'FontWeight.ultraLight': () => undefined,
    'FontWeight.thin': () => undefined,
    'FontWeight.light': () => undefined,
    'FontWeight.regular': () => undefined,
    'FontWeight.medium': () => undefined,
    'FontWeight.semibold': () => undefined,
    'FontWeight.bold': () => undefined,
    'FontWeight.heavy': () => undefined,
    'FontWeight.black': () => undefined,
  },
  memberExpression: {
    'FontWeight.w100': () => undefined,
    'FontWeight.w200': () => undefined,
    'FontWeight.w300': () => undefined,
    'FontWeight.w400': () => undefined,
    'FontWeight.w500': () => undefined,
    'FontWeight.w600': () => undefined,
    'FontWeight.w700': () => undefined,
    'FontWeight.w800': () => undefined,
    'FontWeight.w900': () => undefined,
  },
}
