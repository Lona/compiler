import { LogicAST as AST } from '@lona/serialization'
import { EnterReturnValue } from 'tree-visit'
import { flattenedMemberExpression } from '../ast'
import { EvaluationVisitor } from '../evaluationVisitor'
import { ScopeVisitor } from '../scopeVisitor'
import { TypeCheckerVisitor } from '../typeChecker'
import { IExpression, Node } from './interfaces'

export class MemberExpression extends Node<AST.MemberExpression>
  implements IExpression {
  get names(): string[] {
    const { expression, memberName } = this.syntaxNode.data

    let names: string[] = []

    if (expression.type === 'identifierExpression') {
      names.push(expression.data.identifier.string)
    } else if (expression.type === 'memberExpression') {
      names.push(...new MemberExpression(expression).names)
    }

    names.push(memberName.string)

    return names
  }

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
