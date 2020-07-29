import { EnumerationDeclaration } from '../logic/nodes/EnumerationDeclaration'
import { Helpers } from '../helpers'
import { Lexer, Rule, Token, StateDefinition, Action } from './Lexer'
import { IdentifierExpression } from '../logic/nodes/IdentifierExpression'
import { LiteralExpression } from '../logic/nodes/LiteralExpression'
import { StringLiteral } from '../logic/nodes/literals'
import { LogicAST } from '@lona/serialization'
import { FunctionCallExpression } from '../logic/nodes/FunctionCallExpression'
import { isNode } from '../logic/ast'
import { valueBindingName } from '../plugins/swift/convert/codable'
import { IExpression } from '../logic/nodes/interfaces'

const getStringLiteral = (node: IExpression): string | undefined =>
  node instanceof LiteralExpression && node.literal instanceof StringLiteral
    ? node.literal.value
    : undefined

export function isTokenizer(node: EnumerationDeclaration): boolean {
  return node.attributes.some(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'tokenize'
  )
}

type TokenGenerator = {
  parentState: string
  rule: Rule
  transform: (token: Token) => unknown
}

function getAction(node: IExpression): Action {
  if (
    node instanceof FunctionCallExpression &&
    node.callee instanceof IdentifierExpression
  ) {
    switch (node.callee.name) {
      case 'pop':
        return { type: node.callee.name }
      case 'push':
      case 'next': {
        const value = getStringLiteral(node.argumentExpressionNodes[0])

        if (value) {
          return { type: node.callee.name, value }
        }
      }
    }
  }

  throw new Error('Invalid action')
}

export function getTokenAttributes(
  node: Extract<LogicAST.EnumerationCase, { type: 'enumerationCase' }>
): TokenGenerator[] {
  return node.data.attributes
    .map(attribute => new FunctionCallExpression(attribute))
    .flatMap(attribute => {
      if (
        attribute.callee instanceof IdentifierExpression &&
        attribute.callee.name === 'token'
      ) {
        const { pattern, state, action } = attribute.argumentExpressionNodes

        const rule = {
          name: node.data.name.name,
          pattern: getStringLiteral(pattern) ?? node.data.name.name,
          ...(action && { action: getAction(action) }),
        }

        const parentState = getStringLiteral(state) ?? 'main'

        const associatedValues = node.data.associatedValues.filter(isNode)

        return {
          parentState,
          rule,
          transform: token => {
            return {
              type: token.type,
              ...Object.fromEntries(
                associatedValues.map((associatedValue, index, array) => [
                  valueBindingName(associatedValue, index, array.length),
                  token.groups[index],
                ])
              ),
            }
          },
        }
      }
      return []
    })
}

export function buildLexer(
  node: EnumerationDeclaration,
  context: Helpers
): (source: string) => unknown {
  const generators = node.cases.flatMap(getTokenAttributes)

  const states: StateDefinition[] = []

  generators.forEach(generator => {
    const state = states.find(state => state.name === generator.parentState)

    if (state) {
      state.rules.push(generator.rule)
    } else {
      states.push({ name: generator.parentState, rules: [generator.rule] })
    }
  })

  const lexer = new Lexer(states, 'main')

  return source => {
    const tokens = lexer.tokenize(source)

    return tokens.map(token => {
      const generator = generators.find(
        generator => generator.rule.name === token.type
      )!
      return generator.transform(token)
    })
  }
}
