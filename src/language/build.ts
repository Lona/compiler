import { Parser } from './Parser'
import { LogicAST, decodeLogic } from '@lona/serialization'
import { findNode, findNodes } from '../logic/traversal'
import { buildLexer, buildLexerDefinition } from './buildLexer'
import { EnumerationDeclaration } from '../logic/nodes/EnumerationDeclaration'
import { RecordDeclaration } from '../logic/nodes/RecordDeclaration'
import { createDeclarationNode } from '../logic/nodes/createNode'
import { buildParser } from './buildParser'
import { Lexer } from './Lexer'

export function buildParserFromSource(source: string): Parser {
  const rootNode = decodeLogic(source)
  const tokensEnum = getTokensEnum(rootNode)

  const tokenNames = buildLexerDefinition(tokensEnum)
    .flatMap(state => state.rules)
    .map(rule => rule.name)

  return buildParser(getParserTypes(rootNode), {
    tokenizerName: tokensEnum.name,
    tokenNames,
  })
}

export function buildLexerFromSource(source: string): Lexer {
  const rootNode = decodeLogic(source)

  return buildLexer(getTokensEnum(rootNode))
}

function getParserTypes(
  rootNode: LogicAST.SyntaxNode
): (EnumerationDeclaration | RecordDeclaration)[] {
  const declarations = findNodes(
    rootNode,
    node => node.type === 'enumeration' || node.type === 'record'
  ) as (LogicAST.EnumerationDeclaration | LogicAST.RecordDeclaration)[]

  return declarations.map(createDeclarationNode) as (
    | RecordDeclaration
    | EnumerationDeclaration
  )[]
}

function getTokensEnum(rootNode: LogicAST.SyntaxNode): EnumerationDeclaration {
  const mainEnum = findNode(
    rootNode,
    (node): node is LogicAST.EnumerationDeclaration =>
      node.type === 'enumeration'
  )

  if (!mainEnum) {
    throw new Error('Failed to find tokens enum')
  }

  return new EnumerationDeclaration(mainEnum)
}
