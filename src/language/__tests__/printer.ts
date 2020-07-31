import { Builders, Lexer, StateDefinition } from '../Lexer'
import { formatTokens } from '../Printer'

const {
  rule,
  literalPrintPattern,
  referencePrintPattern,
  sequencePrintPattern,
} = Builders

it('prints simple tokens', () => {
  const definition: StateDefinition[] = [
    {
      name: 'main',
      rules: [
        rule('name', { pattern: '([a-z]+)', print: referencePrintPattern(0) }),
        rule('equals', { pattern: '=', print: literalPrintPattern('=') }),
        rule('not', { pattern: '!' }),
        rule('integer', {
          pattern: '(\\d)(\\d)(\\d)',
          print: sequencePrintPattern([
            referencePrintPattern(0),
            referencePrintPattern(1),
            referencePrintPattern(2),
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
