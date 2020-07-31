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
  SelfReferencePrintPattern,
  selfReferencePrintPattern,
  FieldPrintPattern,
  NodePrintPattern,
} from './Printer'
import { LiteralExpression } from '../logic/nodes/LiteralExpression'
import {
  ArrayLiteral,
  NumberLiteral,
  StringLiteral,
} from '../logic/nodes/literals'
import { MemberExpression } from '../logic/nodes/MemberExpression'

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

function getSelfReference(
  node: IExpression
): SelfReferencePrintPattern | undefined {
  if (node instanceof MemberExpression) {
    const [owner, member] = node.names
    switch (owner) {
      case 'self':
        return selfReferencePrintPattern(member)
      default:
        break
    }
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
  node: IExpression,
  f: (node: IExpression) => T
): { type: 'sequence'; value: T[] } | undefined {
  if (
    node instanceof LiteralExpression &&
    node.literal instanceof ArrayLiteral
  ) {
    return sequencePrintPattern(node.literal.elements.map(f))
  }
}

export function getTokenPrintPattern(node: IExpression): TokenPrintPattern {
  const pattern =
    getIndexReference(node) ??
    getLiteral(node) ??
    getSequence(node, getTokenPrintPattern)

  if (!pattern) throw new Error('Invalid token print pattern')

  return pattern
}

export function getFieldPrintPattern(node: IExpression): FieldPrintPattern {
  const pattern =
    getTokenReference(node) ??
    getLiteral(node) ??
    getSequence(node, getFieldPrintPattern)

  if (!pattern) throw new Error('Invalid token print pattern')

  return pattern
}

export function getNodePrintPattern(node: IExpression): NodePrintPattern {
  const pattern =
    getSelfReference(node) ??
    getTokenReference(node) ??
    getLiteral(node) ??
    getSequence(node, getNodePrintPattern)

  if (!pattern) throw new Error('Invalid token print pattern')

  return pattern
}
