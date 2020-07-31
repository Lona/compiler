import fs from 'fs'
import path from 'path'
import { buildLexerFromSource, buildParserFromSource } from '../build'
import { Printer } from '../Printer'

const grammarSource = fs.readFileSync(
  path.join(__dirname, './mocks/XMLLanguage.logic'),
  'utf8'
)

describe('XML Language', () => {
  const lexer = buildLexerFromSource(grammarSource)
  const parser = buildParserFromSource(grammarSource)

  it('generates a valid parser', () => {
    expect(parser.definition).toMatchSnapshot()
  })

  it('parses attributes', () => {
    const tokens = lexer.tokenize(`<hello a="test" b='foo' />`)

    const result = parser.parse(tokens, 'XMLElement')

    expect(result).toMatchSnapshot()
  })

  it('parses and prints elements', () => {
    const tokens = lexer.tokenize(`<OK>Some Text<Nested /></OK>`)

    const result = parser.parse(tokens, 'XMLElement')

    expect(result).toMatchSnapshot()

    if (result.type !== 'success') {
      throw new Error('Failed to parse XMLElement')
    }

    const printer = new Printer(lexer.stateDefinitions, parser.definition)

    const formatted = printer.formatNode(result.value, 'XMLElement')

    expect(formatted).toMatchSnapshot()

    const output = printer.print(formatted)

    expect(output).toEqual(`<OK>Some Text<Nested></Nested></OK>`)
  })
})
