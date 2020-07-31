import { IExpression } from '../logic/nodes/interfaces'
import {
  PrintPattern,
  sequencePrintPattern,
  indexReferencePrintPattern,
  literalPrintPattern,
  tokenReferencePrintPattern,
} from './Printer'
import { LiteralExpression } from '../logic/nodes/LiteralExpression'
import {
  ArrayLiteral,
  NumberLiteral,
  StringLiteral,
} from '../logic/nodes/literals'
import { MemberExpression } from '../logic/nodes/MemberExpression'

export function getPrintPattern(node: IExpression): PrintPattern {
  if (node instanceof LiteralExpression) {
    if (node.literal instanceof ArrayLiteral) {
      return sequencePrintPattern(node.literal.elements.map(getPrintPattern))
    } else if (node.literal instanceof NumberLiteral) {
      return indexReferencePrintPattern(node.literal.value)
    } else if (node.literal instanceof StringLiteral) {
      return literalPrintPattern(node.literal.value)
    }
  } else if (node instanceof MemberExpression) {
    const [owner, member] = node.names
    switch (owner) {
      case 'Token':
        return tokenReferencePrintPattern(member)
      case 'self':
        return tokenReferencePrintPattern(member)
    }
  }

  throw new Error('Invalid print pattern')
}
