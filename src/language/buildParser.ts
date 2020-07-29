import { Helpers } from '../helpers'
import { EnumerationDeclaration } from '../logic/nodes/EnumerationDeclaration'
import { FunctionCallExpression } from '../logic/nodes/FunctionCallExpression'
import { IdentifierExpression } from '../logic/nodes/IdentifierExpression'
import { IExpression } from '../logic/nodes/interfaces'
import { LiteralExpression } from '../logic/nodes/LiteralExpression'
import { ArrayLiteral } from '../logic/nodes/literals'
import { MemberExpression } from '../logic/nodes/MemberExpression'
import { RecordDeclaration } from '../logic/nodes/RecordDeclaration'
import { VariableDeclaration } from '../logic/nodes/VariableDeclaration'
import { Definition, Field, Parser, Pattern, RecordNode } from './Parser'

export function isParser(
  node: RecordDeclaration | EnumerationDeclaration
): boolean {
  return node.attributes.some(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'parse'
  )
}

function getPattern(resolvedSelf: string, node: IExpression): Pattern {
  if (
    node instanceof FunctionCallExpression &&
    node.callee instanceof IdentifierExpression
  ) {
    switch (node.callee.name) {
      case 'or':
        return {
          type: node.callee.name,
          value: Object.values(node.argumentExpressionNodes).map(
            getPattern.bind(null, resolvedSelf)
          ),
        }
      case 'many':
      case 'option': {
        return {
          type: node.callee.name,
          value: Object.values(node.argumentExpressionNodes).map(
            getPattern.bind(null, resolvedSelf)
          )[0],
        }
      }
    }
  } else if (
    node instanceof LiteralExpression &&
    node.literal instanceof ArrayLiteral
  ) {
    return {
      type: 'sequence',
      value: node.literal.elements.map(getPattern.bind(null, resolvedSelf)),
    }
  } else if (node instanceof MemberExpression) {
    const names = node.names.map(name =>
      name === 'self' ? resolvedSelf : name
    )

    if (names[0] === 'Token') {
      return {
        type: 'reference',
        value: {
          type: 'token',
          name: `Token.${names[1]}`,
        },
      }
    } else {
      return {
        type: 'reference',
        value: {
          type: 'field',
          nodeName: names[0],
          fieldName: names[1],
        },
      }
    }
  } else if (node instanceof IdentifierExpression) {
    return {
      type: 'reference',
      value: {
        type: 'node',
        name: node.name,
      },
    }
  }

  throw new Error('Invalid pattern')
}

export function getParseAttribute(
  node: VariableDeclaration | RecordDeclaration
): Pattern | undefined {
  const attribute = node.attributes.find(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'parse'
  )

  if (!attribute) return

  const { pattern } = attribute.argumentExpressionNodes

  return getPattern(node.name, pattern)
}

export function buildParserDefinition(
  nodes: (EnumerationDeclaration | RecordDeclaration)[],
  context: Helpers
): Definition {
  const parserNodes = nodes.filter(isParser)

  const recordDeclarations = parserNodes.flatMap(node =>
    node instanceof RecordDeclaration ? [node] : []
  )

  const records: RecordNode[] = recordDeclarations.map(declaration => {
    return {
      type: 'record',
      name: declaration.name,
      pattern: getParseAttribute(declaration)!,
      fields: declaration.variables.flatMap((variable): Field[] => {
        const pattern = getParseAttribute(variable)

        if (!pattern) return []

        return [{ name: variable.name, pattern }]
      }),
    }
  })

  return {
    nodes: records,
  }
}

export function buildParser(
  nodes: (EnumerationDeclaration | RecordDeclaration)[],
  context: Helpers
): Parser {
  return new Parser(buildParserDefinition(nodes, context))
}
