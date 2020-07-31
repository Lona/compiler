import { Builders, Lexer, StateDefinition } from '../Lexer'
import {
  Printer,
  literalPrintPattern,
  indexReferencePrintPattern,
  sequencePrintPattern,
  tokenReferencePrintPattern,
  selfReferencePrintPattern,
} from '../Printer'
import {
  Definition,
  recordNodeDefinition,
  sequencePattern,
  field,
  tokenReferencePattern,
  fieldReferencePattern,
  Parser,
} from '../Parser'

const { rule } = Builders

it('prints tokens', () => {
  const definition: StateDefinition[] = [
    {
      name: 'main',
      rules: [
        rule('name', {
          pattern: '([a-z]+)',
          print: indexReferencePrintPattern(0),
        }),
        rule('equals', { pattern: '=', print: literalPrintPattern('=') }),
        rule('not', { pattern: '!' }),
        rule('integer', {
          pattern: '(\\d)(\\d)(\\d)',
          print: sequencePrintPattern([
            indexReferencePrintPattern(0),
            indexReferencePrintPattern(1),
            indexReferencePrintPattern(2),
          ]),
        }),
      ],
    },
  ]

  const lexer = new Lexer(definition)

  const tokens = lexer.tokenize('hello=!123')

  const printer = new Printer(definition)

  const doc = printer.formatTokens(tokens)

  expect(doc).toMatchSnapshot()
})

it('prints nodes', () => {
  const lexerDefinition: StateDefinition[] = [
    {
      name: 'main',
      rules: [
        rule('name', {
          pattern: '([a-z]+)',
          print: indexReferencePrintPattern(0),
        }),
        rule('equals', { pattern: '=', print: literalPrintPattern('=') }),
        rule('string', {
          pattern: `"([^<"]*)"`,
          print: sequencePrintPattern([
            literalPrintPattern(`"`),
            indexReferencePrintPattern(0),
            literalPrintPattern(`"`),
          ]),
        }),
      ],
    },
  ]

  const parserDefinition: Definition = {
    nodes: [
      recordNodeDefinition(
        'attribute',
        sequencePattern([
          fieldReferencePattern('attribute', 'name'),
          tokenReferencePattern('equals'),
          fieldReferencePattern('attribute', 'value'),
        ]),
        [
          field(
            'name',
            tokenReferencePattern('name'),
            tokenReferencePrintPattern('name')
          ),
          field(
            'value',
            tokenReferencePattern('string'),
            tokenReferencePrintPattern('string')
          ),
        ],
        sequencePrintPattern([
          selfReferencePrintPattern('name'),
          tokenReferencePrintPattern('equals'),
          selfReferencePrintPattern('value'),
        ])
      ),
    ],
  }

  const lexer = new Lexer(lexerDefinition)

  const source = `foo="bar"`

  const tokens = lexer.tokenize(source)

  const parser = new Parser(parserDefinition)

  const result = parser.parse(tokens, 'attribute')

  if (result.type !== 'success') {
    throw new Error('Failed to parse')
  }

  const { value } = result

  const printer = new Printer(lexerDefinition, parserDefinition)

  const formatted = printer.formatNode(value, 'attribute')

  expect(formatted).toMatchSnapshot()

  expect(printer.print(formatted)).toEqual(source)
})
