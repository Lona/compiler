import { decodeLogic, LogicAST } from '@lona/serialization'
import { Lexer, ParserPattern } from 'language-tools'
import { createDeclarationNode } from '../logic/nodes/createNode'
import { EnumerationDeclaration } from '../logic/nodes/EnumerationDeclaration'
import { RecordDeclaration } from '../logic/nodes/RecordDeclaration'
import { findNode, findNodes } from '../logic/traversal'
import { buildLexer, buildLexerDefinition } from './buildLexer'
import { buildParserPatterns, ParserPatternMap } from './buildParser'

export function buildParserFromSource(source: string) {
  const rootNode = decodeLogic(source)
  const tokensEnum = getTokensEnum(rootNode)
  const lexer = buildLexer(tokensEnum)

  const tokenNames = buildLexerDefinition(tokensEnum)
    .flatMap(state => state.rules)
    .map(rule => rule.name)

  const typeDeclarations = getParserTypes(rootNode)

  return buildParserPatterns(
    {
      lexer,
      getPattern: (name: string) => (undefined as any) as ParserPattern,
    },
    typeDeclarations,
    {
      tokenizerName: tokensEnum.name,
      tokenNames,
    }
  )
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

export function buildLexerFromSource(source: string): Lexer {
  const rootNode = decodeLogic(source)

  return buildLexer(getTokensEnum(rootNode))
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
