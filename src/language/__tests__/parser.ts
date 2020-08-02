import {
  Parser,
  Reference,
  ReferencePattern,
  SequencePattern,
  OrPattern,
  ManyPattern,
  FieldReference,
  NodeDefinition,
  OptionPattern,
  EnumNodeDefinition,
  field,
  nodeFieldAnnotation,
  stringFieldAnnotation,
} from '../Parser'
import { Token } from '../Lexer'

function createToken(type: string): Token {
  return { type, value: type, groups: [type], position: { start: 0, end: 0 } }
}

it('parses token references', () => {
  const tokens = [createToken('hello')]

  const reference: Reference = { type: 'token', name: 'hello' }

  const pattern: ReferencePattern = {
    type: 'reference',
    value: reference,
  }

  const parser = new Parser({
    nodes: [
      {
        type: 'record',
        name: 'Root',
        fields: [],
        pattern,
      },
    ],
  })

  expect(parser.parseReference(reference, tokens)).toMatchSnapshot()

  expect(parser.parsePattern(pattern, tokens)).toMatchSnapshot()
})

it('parses field references', () => {
  const tokens = [createToken('hello')]

  const tokenReference: Reference = { type: 'token', name: 'hello' }
  const fieldReference: FieldReference = {
    type: 'field',
    nodeName: 'Root',
    fieldName: 'name',
  }

  const tokenPattern: ReferencePattern = {
    type: 'reference',
    value: tokenReference,
  }

  const fieldPattern: ReferencePattern = {
    type: 'reference',
    value: fieldReference,
  }

  const node: NodeDefinition = {
    type: 'record',
    name: 'Root',
    fields: [
      field({
        name: 'name',
        annotation: nodeFieldAnnotation('name'),
        pattern: tokenPattern,
      }),
    ],
    pattern: fieldPattern,
  }

  const parser = new Parser({
    nodes: [node],
  })

  expect(parser.parseReference(fieldReference, tokens)).toMatchSnapshot()
})

it('parses sequences', () => {
  const tokens = [createToken('hello'), createToken('world')]

  const reference1: Reference = { type: 'token', name: 'hello' }
  const reference2: Reference = { type: 'token', name: 'world' }

  const pattern: SequencePattern = {
    type: 'sequence',
    value: [
      { type: 'reference', value: reference1 },
      { type: 'reference', value: reference2 },
    ],
  }

  const parser = new Parser({
    nodes: [
      {
        type: 'record',
        name: 'Root',
        fields: [],
        pattern,
      },
    ],
  })

  expect(parser.parsePattern(pattern, tokens)).toMatchSnapshot()
})

it('parses or', () => {
  const reference1: Reference = { type: 'token', name: 'hello' }
  const reference2: Reference = { type: 'token', name: 'world' }

  const pattern: OrPattern = {
    type: 'or',
    value: [
      { type: 'reference', value: reference1 },
      { type: 'reference', value: reference2 },
    ],
  }

  const parser = new Parser({
    nodes: [
      {
        type: 'record',
        name: 'Root',
        fields: [],
        pattern,
      },
    ],
  })

  expect(parser.parsePattern(pattern, [createToken('hello')])).toMatchSnapshot()
  expect(parser.parsePattern(pattern, [createToken('world')])).toMatchSnapshot()
})

it('parses many', () => {
  const reference: Reference = { type: 'token', name: 'hello' }

  const pattern: ManyPattern = {
    type: 'many',
    value: { type: 'reference', value: reference },
  }

  const parser = new Parser({
    nodes: [
      {
        type: 'record',
        name: 'Root',
        fields: [],
        pattern,
      },
    ],
  })

  expect(parser.parsePattern(pattern, [])).toMatchSnapshot()
  expect(
    parser.parsePattern(pattern, [
      createToken('hello'),
      createToken('hello'),
      createToken('hello'),
    ])
  ).toMatchSnapshot()
})

it('parses option', () => {
  const reference: Reference = { type: 'token', name: 'hello' }

  const innerPattern: ReferencePattern = {
    type: 'reference',
    value: { type: 'field', nodeName: 'Root', fieldName: 'name' },
  }

  const pattern: OptionPattern = {
    type: 'option',
    value: innerPattern,
  }

  const parser = new Parser({
    nodes: [
      {
        type: 'record',
        name: 'Root',
        pattern,
        fields: [
          field({
            name: 'name',
            annotation: stringFieldAnnotation(),
            pattern: {
              type: 'reference',
              value: reference,
            },
          }),
        ],
      },
    ],
  })

  expect(parser.parsePattern(pattern, [])).toMatchSnapshot()
  expect(parser.parsePattern(pattern, [createToken('hello')])).toMatchSnapshot()
})

it('parses records', () => {
  const rootNode: NodeDefinition = {
    type: 'record',
    name: 'Root',
    fields: [
      field({
        name: 'attribute',
        annotation: nodeFieldAnnotation('Attribute'),
        pattern: {
          type: 'reference',
          value: { type: 'node', name: 'Attribute' },
        },
      }),
    ],
    pattern: {
      type: 'reference',
      value: {
        type: 'field',
        nodeName: 'Root',
        fieldName: 'attribute',
      },
    },
  }

  const attributeNode: NodeDefinition = {
    type: 'record',
    name: 'Attribute',
    fields: [
      field({
        name: 'name',
        annotation: stringFieldAnnotation(),
        pattern: {
          type: 'reference',
          value: { type: 'token', name: 'hello' },
        },
      }),
      field({
        name: 'value',
        annotation: stringFieldAnnotation(),
        pattern: {
          type: 'reference',
          value: { type: 'token', name: 'world' },
        },
      }),
    ],
    pattern: {
      type: 'sequence',
      value: [
        {
          type: 'reference',
          value: {
            type: 'field',
            nodeName: 'Attribute',
            fieldName: 'name',
          },
        },
        {
          type: 'reference',
          value: {
            type: 'token',
            name: 'equals',
          },
        },
        {
          type: 'reference',
          value: {
            type: 'field',
            nodeName: 'Attribute',
            fieldName: 'value',
          },
        },
      ],
    },
  }

  const parser = new Parser({
    nodes: [rootNode, attributeNode],
  })

  const result1 = parser.parseRecord(attributeNode, [
    createToken('hello'),
    createToken('equals'),
    createToken('world'),
  ])

  expect(result1).toMatchSnapshot()

  expect(result1.type).toEqual('success')

  const result2 = parser.parseRecord(rootNode, [
    createToken('hello'),
    createToken('equals'),
    createToken('world'),
  ])

  expect(result2).toMatchSnapshot()

  expect(result2.type).toEqual('success')
})

it('parses enums', () => {
  const rootNode: EnumNodeDefinition = {
    type: 'enum',
    name: 'Root',
    fields: [
      field({
        name: 'attribute',
        annotation: nodeFieldAnnotation('Attribute'),
        pattern: {
          type: 'reference',
          value: { type: 'node', name: 'Attribute' },
        },
      }),
      field({
        name: 'name',
        annotation: stringFieldAnnotation(),
        pattern: {
          type: 'reference',
          value: { type: 'token', name: 'hello' },
        },
      }),
    ],
    pattern: {
      type: 'or',
      value: [
        {
          type: 'reference',
          value: {
            type: 'field',
            nodeName: 'Root',
            fieldName: 'attribute',
          },
        },
        {
          type: 'reference',
          value: {
            type: 'field',
            nodeName: 'Root',
            fieldName: 'name',
          },
        },
      ],
    },
  }

  const attributeNode: NodeDefinition = {
    type: 'record',
    name: 'Attribute',
    fields: [
      field({
        name: 'name',
        annotation: stringFieldAnnotation(),
        pattern: {
          type: 'reference',
          value: { type: 'token', name: 'hello' },
        },
      }),
      field({
        name: 'value',
        annotation: stringFieldAnnotation(),
        pattern: {
          type: 'reference',
          value: { type: 'token', name: 'world' },
        },
      }),
    ],
    pattern: {
      type: 'sequence',
      value: [
        {
          type: 'reference',
          value: {
            type: 'field',
            nodeName: 'Attribute',
            fieldName: 'name',
          },
        },
        {
          type: 'reference',
          value: {
            type: 'token',
            name: 'equals',
          },
        },
        {
          type: 'reference',
          value: {
            type: 'field',
            nodeName: 'Attribute',
            fieldName: 'value',
          },
        },
      ],
    },
  }

  const parser = new Parser({
    nodes: [rootNode, attributeNode],
  })

  const result1 = parser.parseEnum(rootNode, [
    createToken('hello'),
    createToken('equals'),
    createToken('world'),
  ])

  expect(result1).toMatchSnapshot()

  expect(result1.type).toEqual('success')

  const result2 = parser.parseEnum(rootNode, [createToken('hello')])

  expect(result2).toMatchSnapshot()

  expect(result2.type).toEqual('success')
})
