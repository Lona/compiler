import { LogicAST } from '@lona/serialization'
import { createFs } from 'buffs'
import fs from 'fs'
import path from 'path'
import { createHelpers } from '../../helpers'
import { EnumerationDeclaration } from '../../logic/nodes/EnumerationDeclaration'
import { findNode } from '../../logic/traversal'
import { buildLexer, buildTokenTransformer } from '../buildLexer'
import { formatTokens, print } from '../Printer'

it('converts SQL language', async () => {
  const source = createFs({
    'lona.json': JSON.stringify({}),
    'SQLLanguage.logic': fs.readFileSync(
      path.join(__dirname, './mocks/SQLLanguage.logic'),
      'utf8'
    ),
  })

  const helpers = createHelpers(source, '/')

  const logicFile = helpers.module.logicFiles.find(file =>
    file.sourcePath.endsWith('SQLLanguage.logic')
  )

  if (!logicFile) {
    throw new Error('Failed to find input file')
  }

  const mainEnum = findNode(
    logicFile.rootNode,
    (node): node is LogicAST.EnumerationDeclaration =>
      node.type === 'enumeration'
  )

  if (!mainEnum) {
    throw new Error('Failed to find tokens enum')
  }

  const node = new EnumerationDeclaration(mainEnum)
  const lexer = buildLexer(node, helpers)
  const transformer = buildTokenTransformer(node, helpers)

  const tokens = lexer.tokenize('SELECT foo FROM 123')

  expect(transformer(tokens)).toMatchSnapshot()
})

it('converts XML language', async () => {
  const source = createFs({
    'lona.json': JSON.stringify({}),
    'XMLLanguage.logic': fs.readFileSync(
      path.join(__dirname, './mocks/XMLLanguage.logic'),
      'utf8'
    ),
  })

  const helpers = createHelpers(source, '/')

  const logicFile = helpers.module.logicFiles.find(file =>
    file.sourcePath.endsWith('XMLLanguage.logic')
  )

  if (!logicFile) {
    throw new Error('Failed to find input file')
  }

  const mainEnum = findNode(
    logicFile.rootNode,
    (node): node is LogicAST.EnumerationDeclaration =>
      node.type === 'enumeration'
  )

  if (!mainEnum) {
    throw new Error('Failed to find tokens enum')
  }

  const node = new EnumerationDeclaration(mainEnum)
  const lexer = buildLexer(node, helpers)
  const transformer = buildTokenTransformer(node, helpers)

  const tokens = lexer.tokenize(`<hello a="test" b='foo' /><OK>Some Text</OK>`)

  expect(transformer(tokens)).toMatchSnapshot()

  const formatted = formatTokens(lexer.stateDefinitions, tokens)

  expect(formatted).toMatchSnapshot()

  expect(print(formatted)).toMatchSnapshot()
})
