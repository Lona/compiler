import { LogicAST as AST } from '@lona/serialization'
import { Node, IExpression } from './interfaces'
import { createExpressionNode } from './createNode'

export class ReturnStatement extends Node<AST.ReturnStatement> {
  get expression(): IExpression {
    return createExpressionNode(this.syntaxNode.data.expression)!
  }
}
