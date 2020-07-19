import { LogicAST as AST } from '@lona/serialization'
import { FunctionDeclaration } from './nodes/FunctionDeclaration'
import { findNode } from './traversal'
import { FunctionCallExpression } from './nodes/FunctionCallExpression'
import { IdentifierExpression } from './nodes/IdentifierExpression'
import { IExpression } from './nodes/interfaces'
import { ComponentVisitor } from './components/ComponentVisitor'
import { LonaView, LonaViewConstructor } from './components/LonaView'
import { LonaText } from './components/LonaText'
import { LonaStack } from './components/LonaStack'

export type ComponentContext = {
  intrinsicNameCount: { [key: string]: number }
  viewAttributeAssignment: {
    [key: string]: { [key: string]: IExpression }
  }
}

export function createViewHierarchy(
  visitor: ComponentVisitor,
  node: IExpression
): LonaView {
  if (node instanceof FunctionCallExpression) {
    const { callee, argumentExpressionNodes } = node

    if (!(callee instanceof IdentifierExpression)) {
      throw new Error('Element function must be an identifier (for now)')
    }

    switch (callee.name) {
      case 'View': {
        return new LonaView(node as LonaViewConstructor, visitor)
      }
      case 'VerticalStack':
      case 'HorizontalStack': {
        return new LonaStack(node as LonaViewConstructor, visitor)
      }
      case 'Text': {
        return new LonaText(node as LonaViewConstructor, visitor)
      }
      default:
        throw new Error(`Unknown element name: ${callee.name}`)
    }
  }

  throw new Error('Unhandled element')
}

export function findComponentFunction(
  node: AST.SyntaxNode
): FunctionDeclaration | undefined {
  const syntaxNode = findNode(node, child => child.type === 'function') as
    | AST.FunctionDeclaration
    | undefined

  if (syntaxNode) {
    const node = new FunctionDeclaration(syntaxNode)
    return node
  }
}
