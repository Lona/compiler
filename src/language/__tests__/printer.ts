import {
  Lexer,
  Rule,
  Action,
  rule,
  StateDefinition,
  LiteralPrintPattern,
  ReferencePrintPattern,
  PrintPattern,
  SequencePrintPattern,
} from '../Lexer'
import { formatTokens } from '../Printer'

function printLiteral(value: string): LiteralPrintPattern {
  return { type: 'literal', value }
}

function printReference(value: number): ReferencePrintPattern {
  return { type: 'reference', value }
}

function printSequence(value: PrintPattern[]): SequencePrintPattern {
  return { type: 'sequence', value }
}

it('prints simple tokens', () => {
  const definition: StateDefinition[] = [
    {
      name: 'main',
      rules: [
        rule('name', { pattern: '([a-z]+)', print: printReference(0) }),
        rule('equals', { pattern: '=', print: printLiteral('=') }),
        rule('not', { pattern: '!' }),
        rule('integer', {
          pattern: '(\\d)(\\d)(\\d)',
          print: printSequence([
            printReference(0),
            printReference(1),
            printReference(2),
          ]),
        }),
      ],
    },
  ]

  const lexer = new Lexer(definition)

  const tokens = lexer.tokenize('hello=!123')

  const doc = formatTokens(definition, tokens)

  expect(doc).toMatchSnapshot()
})
