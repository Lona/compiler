import { Builders as LexerBuilders, Lexer, StateDefinition } from '../Lexer'
import {
  Printer,
  literalPrintPattern,
  indexReferencePrintPattern,
  sequencePrintPattern,
} from '../Printer'

const { rule } = LexerBuilders
it('prints simple tokens', () => {
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
