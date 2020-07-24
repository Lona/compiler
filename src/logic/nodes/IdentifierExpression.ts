import { LogicAST as AST } from '@lona/serialization'
import { ScopeVisitor } from '../scopeVisitor'
import { IExpression, Node } from './interfaces'
import { TypeCheckerVisitor } from '../typeChecker'
import { EvaluationVisitor } from '../evaluationVisitor'

export class IdentifierExpression extends Node<AST.IdentifierExpression>
  implements IExpression {
  get name(): string {
    return this.syntaxNode.data.identifier.string
  }

  scopeEnter(visitor: ScopeVisitor): void {}

  scopeLeave(visitor: ScopeVisitor): void {
    const { id, identifier } = this.syntaxNode.data

    if (identifier.isPlaceholder) return

    const found = visitor.findValueIdentifierReference(identifier.string)

    if (found) {
      visitor.scope.identifierExpressionToPattern[id] = found

      // TEMPORARY. We shouldn't add an identifier to this, only identifierExpression
      visitor.scope.identifierExpressionToPattern[identifier.id] = found
    } else {
      visitor.reporter.warn(
        `No identifier: ${identifier.string}`,
        visitor.scope.valueNames
      )
      visitor.scope.undefinedIdentifierExpressions.add(id)
    }
  }

  typeCheckerEnter(visitor: TypeCheckerVisitor): void {}

  typeCheckerLeave(visitor: TypeCheckerVisitor): void {
    const { id, identifier } = this.syntaxNode.data
    const { scope, typeChecker } = visitor

    let type = visitor.specificIdentifierType(scope, typeChecker, identifier.id)

    typeChecker.nodes[id] = type
    typeChecker.nodes[identifier.id] = type
  }

  evaluationEnter(visitor: EvaluationVisitor): void {
    const {
      id,
      identifier: { string, id: identifierId },
    } = this.syntaxNode.data

    const patternId = visitor.scope.identifierExpressionToPattern[id]

    if (!patternId) return

    visitor.add(identifierId, {
      label: `Identifier (${string})`,
      dependencies: [patternId],
      f: values => values[0],
    })

    visitor.add(id, {
      label: `IdentifierExpression (${string})`,
      dependencies: [patternId],
      f: values => values[0],
    })
  }
}
