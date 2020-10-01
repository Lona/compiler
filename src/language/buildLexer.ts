import { LogicAST } from '@lona/serialization'
import { Helpers } from '../helpers'
import { isNode } from '../logic/ast'
import { EnumerationDeclaration } from '../logic/nodes/EnumerationDeclaration'
import { FunctionCallExpression } from '../logic/nodes/FunctionCallExpression'
import { IdentifierExpression } from '../logic/nodes/IdentifierExpression'
import { IExpression } from '../logic/nodes/interfaces'
import { LiteralExpression } from '../logic/nodes/LiteralExpression'
import { BooleanLiteral, StringLiteral } from '../logic/nodes/literals'
import { valueBindingName } from '../plugins/swift/convert/codable'
// import { getTokenPrintPattern } from './buildPrinter'
import {
  Action,
  Lexer,
  Rule,
  StateDefinition,
  Token,
  rule,
} from 'language-tools'
// import { TokenPrintPattern } from './Printer'

const getStringLiteral = (node: IExpression): string | undefined =>
  node instanceof LiteralExpression && node.literal instanceof StringLiteral
    ? node.literal.value
    : undefined

const getBooleanLiteral = (node: IExpression): boolean | undefined =>
  node instanceof LiteralExpression && node.literal instanceof BooleanLiteral
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
  const attributes = node.data.attributes.map(
    attribute => new FunctionCallExpression(attribute)
  )

  const printAttribute = attributes.find(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'print'
  )

  // const printPattern =
  //   printAttribute && printAttribute.argumentExpressionNodes.pattern
  //     ? getTokenPrintPattern(printAttribute.argumentExpressionNodes.pattern)
  //     : undefined

  const tokenAttributes = attributes.filter(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'token'
  )

  if (tokenAttributes.length === 0) {
    return [
      {
        parentState: 'main',
        rule: rule(node.data.name.name),
        transform: (token: Token) => ({ type: token.type }),
      },
    ]
  }

  return tokenAttributes.flatMap(attribute => {
    const {
      pattern,
      state,
      action,
      discard,
    } = attribute.argumentExpressionNodes

    const {
      name: { name },
    } = node.data

    const parsedPattern = getStringLiteral(pattern)

    if (!parsedPattern) {
      throw new Error(`No pattern associated with token type ${name}`)
    }

    const r: Rule = rule(name, parsedPattern, {
      discard: getBooleanLiteral(discard),
      // ...(printPattern && { print: printPattern }),
      ...(action && { action: getAction(action) }),
    })

    const parentState = getStringLiteral(state) ?? 'main'

    const associatedValues = node.data.associatedValues.filter(isNode)

    return {
      parentState,
      rule: r,
      transform: token => {
        return {
          type: token.type,
          ...Object.fromEntries(
            associatedValues.map((associatedValue, index, array) => [
              valueBindingName(associatedValue, index, array.length),
              token.values[index],
            ])
          ),
        }
      },
    }
  })
}

export function buildLexerDefinition(
  node: EnumerationDeclaration
): StateDefinition[] {
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

  return states
}

export function buildLexer(node: EnumerationDeclaration): Lexer {
  return new Lexer(buildLexerDefinition(node))
}

/**
 * Transform tokens into a format that matches how our generated data types
 * serialize to and from JSON.
 */
export function buildTokenTransformer(
  node: EnumerationDeclaration
): (tokens: Token[]) => unknown[] {
  const generators = node.cases.flatMap(getTokenAttributes)

  return tokens =>
    tokens.map(token => {
      const generator = generators.find(
        generator => generator.rule.name === token.type
      )

      if (!generator) {
        throw new Error(`Missing token generator for: ${token.type}`)
      }

      return generator.transform(token)
    })
}
