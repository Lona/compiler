import { LogicAST as AST } from '@lona/serialization'
import { ScopeVisitor } from '../scopeVisitor'
import { TypeCheckerVisitor } from '../typeChecker'
import { IExpression, Node, ILiteral } from './interfaces'
import { EvaluationVisitor } from '../evaluationVisitor'
import { createLiteralNode } from './createNode'

export class LiteralExpression extends Node<AST.LiteralExpression>
  implements IExpression {
  get literal(): ILiteral {
    return createLiteralNode(this.syntaxNode.data.literal)!
  }

  scopeEnter(visitor: ScopeVisitor): void {}

  scopeLeave(visitor: ScopeVisitor): void {}

  typeCheckerEnter(visitor: TypeCheckerVisitor): void {}

  typeCheckerLeave(visitor: TypeCheckerVisitor): void {
    const { id, literal } = this.syntaxNode.data

    visitor.setType(id, visitor.getType(literal.data.id))
  }

  evaluationEnter(visitor: EvaluationVisitor) {
    const { id, literal } = this.syntaxNode.data

    visitor.add(id, {
      label: 'Literal expression',
      dependencies: [literal.data.id],
      f: values => values[0],
    })
  }
}
