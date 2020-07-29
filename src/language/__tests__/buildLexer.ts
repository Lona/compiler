import { LogicAST } from '@lona/serialization'
import { createFs } from 'buffs'
import fs from 'fs'
import path from 'path'
import { createHelpers } from '../../helpers'
import { EnumerationDeclaration } from '../../logic/nodes/EnumerationDeclaration'
import { findNode } from '../../logic/traversal'
import { buildLexer } from '../buildLexer'

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

  const lexer = buildLexer(new EnumerationDeclaration(mainEnum), helpers)

  const tokens = lexer('SELECT foo FROM 123')

  expect(tokens).toMatchSnapshot()
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

  const lexer = buildLexer(new EnumerationDeclaration(mainEnum), helpers)

  const tokens = lexer(`<hello a="test" b='foo' /><OK>Some Text</OK>`)

  expect(tokens).toMatchSnapshot()
})
