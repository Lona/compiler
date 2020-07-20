import * as JSAST from './jsAst'

export function convertObject(json: unknown): JSAST.JSNode {
  switch (typeof json) {
    case 'object':
      if (json === null) {
        return { type: 'Literal', data: { type: 'Null', data: undefined } }
      } else if (json instanceof Array) {
        return {
          type: 'Literal',
          data: { type: 'Array', data: json.map(convertObject) },
        }
      } else {
        const properties: JSAST.JSNode[] = Object.entries(json).map(
          ([key, value]): JSAST.JSNode => ({
            type: 'Property',
            data: {
              key: { type: 'Identifier', data: [key] },
              value: convertObject(value),
            },
          })
        )

        return { type: 'Literal', data: { type: 'Object', data: properties } }
      }
    case 'boolean':
      return { type: 'Literal', data: { type: 'Boolean', data: json } }
    case 'number':
      return { type: 'Literal', data: { type: 'Number', data: json } }
    case 'string':
      return { type: 'Literal', data: { type: 'String', data: json } }
    case 'undefined':
      return { type: 'Literal', data: { type: 'Undefined', data: json } }
    case 'function':
    case 'symbol':
    case 'bigint':
    default:
      throw new Error('Not supported')
  }
}
