import { IExpression } from '../logic/nodes/interfaces'
import {
  sequencePrintPattern,
  indexReferencePrintPattern,
  literalPrintPattern,
  tokenReferencePrintPattern,
  TokenPrintPattern,
  IndexReferencePrintPattern,
  LiteralPrintPattern,
  TokenReferencePrintPattern,
  FieldReferencePrintPattern,
  fieldReferencePrintPattern,
  FieldPrintPattern,
  NodePrintPattern,
  PrintCommand,
  CommandPrintPattern,
  SelfReferencePrintPattern,
  selfReferencePrintPattern,
} from './Printer'
import { LiteralExpression } from '../logic/nodes/LiteralExpression'
import {
  ArrayLiteral,
  NumberLiteral,
  StringLiteral,
} from '../logic/nodes/literals'
import { MemberExpression } from '../logic/nodes/MemberExpression'
import { FunctionCallExpression } from '../logic/nodes/FunctionCallExpression'
import { IdentifierExpression } from '../logic/nodes/IdentifierExpression'
import { inspect } from 'util'

export function getPrintAttributeExpression(
  attributes: FunctionCallExpression[]
): IExpression | undefined {
  const printAttribute = attributes.find(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'print'
  )

  return printAttribute && printAttribute.argumentExpressionNodes.pattern
    ? printAttribute.argumentExpressionNodes.pattern
    : undefined
}

function getIndexReference(
  node: IExpression
): IndexReferencePrintPattern | undefined {
  if (
    node instanceof LiteralExpression &&
    node.literal instanceof NumberLiteral
  ) {
    return indexReferencePrintPattern(node.literal.value)
  }
}

function getTokenReference(
  node: IExpression
): TokenReferencePrintPattern | undefined {
  if (node instanceof MemberExpression) {
    const [owner, member] = node.names
    switch (owner) {
      case 'Token':
        return tokenReferencePrintPattern(member)
      default:
        break
    }
  }
}

function getFieldReference(
  node: IExpression
): FieldReferencePrintPattern | SelfReferencePrintPattern | undefined {
  if (node instanceof MemberExpression) {
    const [owner, member] = node.names
    switch (owner) {
      case 'self':
        if (member) {
          return fieldReferencePrintPattern(member)
        } else {
          return selfReferencePrintPattern()
        }
      default:
        break
    }
  }
}

function getSelfReference(
  node: IExpression
): SelfReferencePrintPattern | undefined {
  if (node instanceof IdentifierExpression && node.name === 'self') {
    return selfReferencePrintPattern()
  }
}

function getLiteral(node: IExpression): LiteralPrintPattern | undefined {
  if (
    node instanceof LiteralExpression &&
    node.literal instanceof StringLiteral
  ) {
    return literalPrintPattern(node.literal.value)
  }
}

function getSequence<T>(
  f: (node: IExpression) => T,
  node: IExpression
): { type: 'sequence'; value: T[] } | undefined {
  if (
    node instanceof LiteralExpression &&
    node.literal instanceof ArrayLiteral
  ) {
    return sequencePrintPattern(node.literal.elements.map(f))
  }
}

function getCommand<T>(
  f: (node: IExpression) => T,
  node: IExpression
): CommandPrintPattern<T> | undefined {
  if (node instanceof FunctionCallExpression) {
    return {
      type: 'command',
      value: getPrintCommand(f, node),
    }
  }
}

function getPrintCommand<T>(
  f: (node: IExpression) => T,
  node: IExpression
): PrintCommand<T> {
  if (
    node instanceof FunctionCallExpression &&
    node.callee instanceof IdentifierExpression
  ) {
    switch (node.callee.name) {
      case 'indent':
        const [value] = Object.values(node.argumentExpressionNodes)

        return {
          type: node.callee.name,
          value: f(value),
        }
      case 'join': {
        // const { leading, trailing, ...rest } = node.argumentExpressionNodes
        const [value, separator] = Object.values(node.argumentExpressionNodes)

        return {
          type: node.callee.name,
          value: f(value),
          ...(separator && { separator: f(separator) }),
        }
      }
      case 'line': {
        return {
          type: node.callee.name,
        }
      }
    }
  }

  throw new Error('Invalid print command')
}

export function getTokenPrintPattern(node: IExpression): TokenPrintPattern {
  const pattern =
    getIndexReference(node) ??
    getLiteral(node) ??
    getSequence(getTokenPrintPattern, node) ??
    getCommand(getTokenPrintPattern, node)

  if (!pattern) {
    throw new Error(
      `Invalid token print pattern: ${inspect(node, false, null)}`
    )
  }

  return pattern
}

export function getFieldPrintPattern(node: IExpression): FieldPrintPattern {
  const pattern =
    getTokenReference(node) ??
    getLiteral(node) ??
    getSequence(getFieldPrintPattern, node) ??
    getCommand(getFieldPrintPattern, node) ??
    getSelfReference(node)

  if (!pattern) {
    throw new Error(
      `Invalid field print pattern: ${inspect(node, false, null)}`
    )
  }

  return pattern
}

export function getNodePrintPattern(node: IExpression): NodePrintPattern {
  const pattern =
    getFieldReference(node) ??
    getTokenReference(node) ??
    getLiteral(node) ??
    getSequence(getNodePrintPattern, node) ??
    getCommand(getNodePrintPattern, node)

  if (!pattern) {
    throw new Error(`Invalid node print pattern: ${inspect(node, false, null)}`)
  }

  return pattern
}
