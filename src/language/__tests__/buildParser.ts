import { LogicAST } from '@lona/serialization'
import { createFs } from 'buffs'
import fs from 'fs'
import path from 'path'
import { createHelpers } from '../../helpers'
import { EnumerationDeclaration } from '../../logic/nodes/EnumerationDeclaration'
import { findNode, findNodes } from '../../logic/traversal'
import { buildLexer } from '../buildLexer'
import { buildParser, buildParserDefinition } from '../buildParser'
import { createDeclarationNode } from '../../logic/nodes/createNode'
import { RecordDeclaration } from '../../logic/nodes/RecordDeclaration'

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

  const tokens = lexer.tokenize(`<hello a="test" b='foo' /><OK>Some Text</OK>`)
  // const tokens = lexer.tokenize(`<OK>Some Text</OK>`)

  const declarations = findNodes(
    logicFile.rootNode,
    node => node.type === 'enumeration' || node.type === 'record'
  ) as (LogicAST.EnumerationDeclaration | LogicAST.RecordDeclaration)[]

  const nodes = declarations.map(createDeclarationNode) as (
    | RecordDeclaration
    | EnumerationDeclaration
  )[]

  const definition = buildParserDefinition(nodes, helpers)

  expect(definition).toMatchSnapshot()

  const parser = buildParser(nodes, helpers)

  expect(parser.parse(tokens, 'XMLElement')).toMatchSnapshot()
})
