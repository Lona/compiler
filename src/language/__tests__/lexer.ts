import { Lexer, Rule } from '../Lexer'

const keyword = (string: string): Rule => ({
  name: string,
  pattern: string,
  discard: false,
})

it('tokenizes simple tokens', () => {
  const lexer = new Lexer({
    rules: [
      keyword('from'),
      keyword('select'),
      keyword('where'),
      { name: 'identifier', pattern: '[a-zA-Z]\\w*' },
      { name: 'integer', pattern: '0|[1-9]\\d*' },
      { name: '_', pattern: '\\W+' },
    ],
  })

  const tokens = lexer.tokenize('select foo from 123')

  expect(tokens).toMatchSnapshot()
})

it('captures groups', () => {
  const lexer = new Lexer({
    rules: [
      {
        name: 'tag',
        pattern: '<(\\w+)>',
      },
    ],
  })

  const tokens = lexer.tokenize('<hi>')

  expect(tokens).toMatchSnapshot()
})

it('supports states', () => {
  const lexer = new Lexer([
    {
      name: 'main',
      rules: [
        {
          name: 'quote',
          pattern: '"',
          action: {
            type: 'next',
            value: 'string',
          },
        },
        {
          name: 'content',
          pattern: '[^"]+',
        },
      ],
    },
    {
      name: 'string',
      rules: [
        {
          name: 'quote',
          pattern: '"',
          action: {
            type: 'next',
            value: 'main',
          },
        },
        {
          name: 'string',
          pattern: '[^"]+',
        },
      ],
    },
  ])

  const tokens = lexer.tokenize('hello world "this is a string" ok')

  expect(tokens).toMatchSnapshot()
})

it('fails if no input is consumed', () => {
  const lexer = new Lexer({
    rules: [
      {
        name: 'nothing',
        pattern: '',
      },
    ],
  })

  expect(() => {
    lexer.tokenize('hello world "this is a string" ok')
  }).toThrow()
})
