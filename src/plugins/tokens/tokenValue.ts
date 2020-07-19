import * as TokenAST from './tokensAst'
import { Memory } from '../../logic/runtime/memory'
import { Value, Decode } from '../../logic/runtime/value'

let getField = (key: string, fields: Memory) => {
  if (fields.type !== 'record') {
    return
  }
  return fields.value[key]
}

const getColorValue = (value?: Value): TokenAST.ColorTokenValue | undefined => {
  if (!value) {
    return undefined
  }
  const css = Decode.color(value)
  if (css) {
    return { type: 'color', value: { css } }
  }
  return undefined
}

const getOptional = (value?: Value) => {
  if (!value) {
    return undefined
  }
  if (
    value.type.type === 'constructor' &&
    value.type.name === 'Optional' &&
    value.memory.type === 'enum' &&
    value.memory.value === 'value' &&
    value.memory.data.length === 1
  ) {
    return value.memory.data[0]
  }
  return undefined
}

const getFontWeight = (value?: Value): TokenAST.FontWeight | undefined => {
  if (!value) {
    return undefined
  }
  if (
    value.type.type !== 'constructor' ||
    value.type.name !== 'FontWeight' ||
    value.memory.type !== 'enum'
  ) {
    return undefined
  }

  switch (value.memory.value) {
    case 'ultraLight':
      return '100'
    case 'thin':
      return '200'
    case 'light':
      return '300'
    case 'regular':
      return '400'
    case 'medium':
      return '500'
    case 'semibold':
      return '600'
    case 'bold':
      return '700'
    case 'heavy':
      return '800'
    case 'black':
      return '900'
    default: {
      throw new Error('Bad FontWeight: ' + value.memory.value)
    }
  }
}

const getShadowValue = (
  value?: Value
): TokenAST.ShadowTokenValue | undefined => {
  if (!value) {
    return undefined
  }
  if (
    value.type.type !== 'constructor' ||
    value.type.name !== 'Shadow' ||
    value.memory.type !== 'record'
  ) {
    return undefined
  }

  const fields = value.memory

  const [x, y, blur, radius] = ['x', 'y', 'blur', 'radius']
    .map(x => getField(x, fields))
    .map(x => (x && x.memory.type === 'number' ? x.memory.value : 0))
  let color: TokenAST.ColorValue | undefined
  if (fields.value['color']) {
    const colorValue = getColorValue(fields.value['color'])
    if (colorValue) {
      color = colorValue.value
    }
  }
  if (!color) {
    color = { css: 'black' }
  }
  return { type: 'shadow', value: { x, y, blur, radius, color } }
}

const getTextStyleValue = (
  value?: Value
): TokenAST.TextStyleTokenValue | undefined => {
  if (!value) {
    return undefined
  }
  if (
    value.type.type !== 'constructor' ||
    value.type.name !== 'TextStyle' ||
    value.memory.type !== 'record'
  ) {
    return undefined
  }

  const fields = value.memory

  const [fontSize, lineHeight, letterSpacing] = [
    'fontSize',
    'lineHeight',
    'letterSpacing',
  ]
    .map(x => getOptional(getField(x, fields)))
    .map(x => (x && x.memory.type === 'number' ? x.memory.value : undefined))
  const [fontName, fontFamily] = ['fontName', 'fontFamily']
    .map(x => getOptional(getField(x, fields)))
    .map(x => (x && x.memory.type === 'string' ? x.memory.value : undefined))
  const [color] = ['color']
    .map(x => getColorValue(getOptional(getField(x, fields))))
    .map(x => (x ? x.value : undefined))
  const [fontWeight] = ['fontWeight']
    .map(x => getField(x, fields))
    .map(x => getFontWeight(x) || '400')

  return {
    type: 'textStyle',
    value: {
      fontFamily,
      fontWeight,
      fontSize,
      lineHeight,
      letterSpacing,
      fontName,
      color,
    },
  }
}

export const create = (value?: Value): TokenAST.TokenValue | undefined =>
  getColorValue(value) ||
  getShadowValue(value) ||
  getTextStyleValue(value) ||
  undefined
