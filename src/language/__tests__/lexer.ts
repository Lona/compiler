import { Builders, Lexer } from '../Lexer'

const { rule } = Builders

it('tokenizes simple tokens', () => {
  const lexer = new Lexer({
    rules: [
      rule('from'),
      rule('select'),
      rule('where'),
      rule('identifier', { pattern: '[a-zA-Z]\\w*' }),
      rule('integer', { pattern: '0|[1-9]\\d*' }),
      rule('_', { pattern: '\\W+' }),
    ],
  })

  const tokens = lexer.tokenize('select foo from 123')

  expect(tokens).toMatchSnapshot()
})

it('captures groups', () => {
  const lexer = new Lexer({
    rules: [rule('tag', { pattern: '<(\\w+)>' })],
  })

  const tokens = lexer.tokenize('<hi>')

  expect(tokens).toMatchSnapshot()
})

it('supports states', () => {
  const lexer = new Lexer([
    {
      name: 'main',
      rules: [
        rule('quote', {
          pattern: '"',
          action: {
            type: 'next',
            value: 'string',
          },
        }),
        rule('content', {
          pattern: '[^"]+',
        }),
      ],
    },
    {
      name: 'string',
      rules: [
        rule('quote', {
          pattern: '"',
          action: {
            type: 'next',
            value: 'main',
          },
        }),
        rule('string', {
          pattern: '[^"]+',
        }),
      ],
    },
  ])

  const tokens = lexer.tokenize('hello world "this is a string" ok')

  expect(tokens).toMatchSnapshot()
})

it('fails if no input is consumed', () => {
  const lexer = new Lexer({ rules: [rule('nothing', { pattern: '' })] })

  expect(() => {
    lexer.tokenize('hello world "this is a string" ok')
  }).toThrow()
})
