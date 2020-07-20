import { LogicAST as AST } from '@lona/serialization'
import { Helpers } from '../../helpers'
import { Token } from './tokensAst'
import * as TokenValue from './tokenValue'
import { nonNullable } from '../../utils/typeHelpers'

export const convertDeclaration = (
  declaration: AST.Declaration,
  helpers: Helpers
): Token | undefined => {
  if (declaration.type !== 'variable' || !declaration.data.initializer) {
    return undefined
  }
  const logicValue = helpers.module.evaluationContext.evaluate(
    declaration.data.initializer.data.id
  )
  const tokenValue = TokenValue.create(logicValue)

  if (!tokenValue) {
    return undefined
  }

  return { qualifiedName: [declaration.data.name.name], value: tokenValue }
}

export const convert = (node: AST.SyntaxNode, helpers: Helpers): Token[] => {
  let declarations: AST.Declaration[]

  if ('type' in node && node.type === 'program') {
    declarations = node.data.block
      .map(x => (x.type === 'declaration' ? x.data.content : undefined))
      .filter(nonNullable)
  } else if ('type' in node && node.type === 'topLevelDeclarations') {
    declarations = node.data.declarations
  } else {
    helpers.reporter.warn('Unhandled top-level syntaxNode type')
    return []
  }

  return declarations
    .map(x => convertDeclaration(x, helpers))
    .filter(nonNullable)
}
