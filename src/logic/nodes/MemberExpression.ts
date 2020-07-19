import { LogicAST as AST } from '@lona/serialization'
import { ScopeVisitor } from '../scopeVisitor'
import { IExpression, Node } from './interfaces'
import { TypeCheckerVisitor } from '../typeChecker'
import { EvaluationVisitor } from '../evaluationVisitor'
import { flattenedMemberExpression } from '../ast'
import { EnterReturnValue } from 'tree-visit'

export class MemberExpression extends Node<AST.MemberExpression>
  implements IExpression {
  scopeEnter(visitor: ScopeVisitor): EnterReturnValue {
    const { id } = this.syntaxNode.data

    const identifiers = flattenedMemberExpression(this.syntaxNode)

    if (identifiers) {
      const keyPath = identifiers.map(x => x.string).join('.')

      const patternId = visitor.namespace.values[keyPath]

      if (patternId) {
        visitor.scope.memberExpressionToPattern[id] = patternId
      } else {
        visitor.reporter.warn(`No identifier path: ${keyPath}`)
        visitor.scope.undefinedMemberExpressions.add(id)
      }
    }

    return 'skip'
  }

  scopeLeave(visitor: ScopeVisitor): void {}

  typeCheckerEnter(visitor: TypeCheckerVisitor): EnterReturnValue {
    const { id } = this.syntaxNode.data
    const { scope, typeChecker } = visitor

    typeChecker.nodes[id] = visitor.specificIdentifierType(
      scope,
      typeChecker,
      id
    )

    return 'skip'
  }

  typeCheckerLeave(visitor: TypeCheckerVisitor): void {}

  evaluationEnter(visitor: EvaluationVisitor) {
    const { id } = this.syntaxNode.data
    const { scope } = visitor

    const patternId = scope.memberExpressionToPattern[id]

    if (!patternId) return

    visitor.add(id, {
      label: 'Member expression',
      dependencies: [patternId],
      f: values => values[0],
    })
  }
}
