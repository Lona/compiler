import fs from 'fs'
import path from 'path'
// import { buildLexerFromSource, buildParserFromSource } from '../build'
// import { Printer } from '../Printer'
import { inspect } from 'util'
import { createModule, libraryFilePaths } from '../../logic/module'

const grammarSource = fs.readFileSync(
  path.join(__dirname, './mocks/LogicLanguage.logic'),
  'utf8'
)

describe('Logic Language', () => {
  it('empty', () => {})

  //   const lexer = buildLexerFromSource(grammarSource)
  //   const parser = buildParserFromSource(grammarSource)
  //   const printer = new Printer(lexer.stateDefinitions, parser.definition)

  //   it('tokenizes numbers', () => {
  //     const tokens = lexer.tokenize('-12.34')
  //     expect(printer.print(printer.formatTokens(tokens))).toEqual('-12.34')
  //   })

  //   it('tokenizes records', () => {
  //     const tokens = lexer.tokenize(`struct Foo {
  //   let foo: Number = 42
  // }`)
  //     expect(tokens).toMatchSnapshot()
  //   })

  //   it('tokenizes enums', () => {
  //     const tokens = lexer.tokenize(`enum Foo {
  //   case foo(a: Number, b: String)
  // }`)
  //     expect(tokens).toMatchSnapshot()
  //   })

  //   it('tokenizes functions', () => {
  //     const tokens = lexer.tokenize(`func test(a: Number = 123) -> Boolean {
  //   return true
  // }`)
  //     expect(tokens).toMatchSnapshot()
  //   })

  //   it('tokenizes comments', () => {
  //     const tokens = lexer.tokenize(`/* test1 */ let a = 123 /*test2*/`)
  //     expect(tokens).toMatchSnapshot()
  //   })

  //   it('tokenizes the standard library successfully', () => {
  //     libraryFilePaths().forEach(filePath => {
  //       const source = fs.readFileSync(filePath, 'utf8')
  //       lexer.tokenize(source)
  //     })
  //   })

  //   it('parses identifiers', () => {
  //     const root = 'LGCIdentifier'
  //     const tokens = lexer.tokenize(`foo`)
  //     const result = parser.parse(tokens, root)

  //     expect(result.type).toEqual('success')

  //     if (result.type === 'success') {
  //       expect(result.value).toMatchSnapshot()
  //       expect(printer.print(printer.formatNode(result.value, root))).toEqual(
  //         'foo'
  //       )
  //     }
  //   })

  //   it('parses type annotation', () => {
  //     const root = 'LGCTypeAnnotation'
  //     const tokens = lexer.tokenize(`Foo<A>`)
  //     const result = parser.parse(tokens, root)

  //     expect(result.type).toEqual('success')

  //     if (result.type === 'success') {
  //       expect(result.value).toMatchSnapshot()
  //       expect(
  //         printer.print(printer.formatNode(result.value, root))
  //       ).toMatchSnapshot()
  //     }
  //   })

  //   it('parses variable declarations', () => {
  //     const root = 'LGCVariableDeclaration'
  //     const tokens = lexer.tokenize(`let foo: Number =`)
  //     const result = parser.parse(tokens, root)

  //     expect(result.type).toEqual('success')

  //     if (result.type === 'success') {
  //       expect(result.value).toMatchSnapshot()
  //       expect(
  //         printer.print(printer.formatNode(result.value, root))
  //       ).toMatchSnapshot()
  //     }
  //   })
})
