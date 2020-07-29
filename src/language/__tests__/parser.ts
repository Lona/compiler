import {
  Parser,
  Reference,
  ReferencePattern,
  SequencePattern,
  OrPattern,
  ManyPattern,
} from '../Parser'
import { Token } from '../Lexer'

function createToken(type: string): Token {
  return { type, value: '', groups: [], position: { start: 0, end: 0 } }
}

it('parses references', () => {
  const tokens = [createToken('hello')]

  const reference: Reference = { type: 'token', value: 'Token.hello' }

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

it('parses sequences', () => {
  const tokens = [createToken('hello'), createToken('world')]

  const reference1: Reference = { type: 'token', value: 'Token.hello' }
  const reference2: Reference = { type: 'token', value: 'Token.world' }

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
  const reference1: Reference = { type: 'token', value: 'Token.hello' }
  const reference2: Reference = { type: 'token', value: 'Token.world' }

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
  const reference: Reference = { type: 'token', value: 'Token.hello' }

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
