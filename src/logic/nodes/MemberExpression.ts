import { LogicAST as AST } from '@lona/serialization'
import { ScopeVisitor } from '../scopeVisitor'
import { IExpression, Node } from './interfaces'
import { TypeCheckerVisitor } from '../typeChecker'
import { EvaluationVisitor } from '../evaluationVisitor'
import { flattenedMemberExpression } from '../../helpers/logicAst'

export class MemberExpression extends Node<AST.MemberExpression>
  implements IExpression {
  scopeEnter(visitor: ScopeVisitor): void {
    visitor.traversalConfig.ignoreChildren = true
  }

  scopeLeave(visitor: ScopeVisitor): void {
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
  }

  typeCheckerEnter(visitor: TypeCheckerVisitor): void {
    const { traversalConfig } = visitor

    traversalConfig.ignoreChildren = true
  }

  typeCheckerLeave(visitor: TypeCheckerVisitor): void {
    const { id } = this.syntaxNode.data
    const { scope, typeChecker } = visitor

    typeChecker.nodes[id] = visitor.specificIdentifierType(
      scope,
      typeChecker,
      id
    )
  }

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
