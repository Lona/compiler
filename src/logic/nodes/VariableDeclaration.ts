import { LogicAST as AST } from '@lona/serialization'
import { IDeclaration, Node } from './interfaces'
import NamespaceVisitor from '../namespaceVisitor'
import { ScopeVisitor } from '../scopeVisitor'
import { TypeCheckerVisitor } from '../typeChecker'
import { EvaluationVisitor } from '../evaluationVisitor'
import { LeaveReturnValue } from 'tree-visit'
import { FunctionCallExpression } from './FunctionCallExpression'

export class VariableDeclaration extends Node<AST.VariableDeclaration>
  implements IDeclaration {
  get name(): string {
    return this.syntaxNode.data.name.name
  }

  get attributes(): FunctionCallExpression[] {
    return this.syntaxNode.data.attributes.map(
      attribute => new FunctionCallExpression(attribute)
    )
  }

  namespaceEnter(visitor: NamespaceVisitor): void {}

  namespaceLeave(visitor: NamespaceVisitor): void {
    const {
      name: { name, id },
    } = this.syntaxNode.data

    visitor.declareValue(name, id)
  }

  scopeEnter(visitor: ScopeVisitor): void {}

  scopeLeave(visitor: ScopeVisitor): void {
    const { name } = this.syntaxNode.data

    visitor.addValueToScope(name)
  }

  typeCheckerEnter(visitor: TypeCheckerVisitor): void {}

  typeCheckerLeave(visitor: TypeCheckerVisitor): LeaveReturnValue {
    const { initializer, annotation, name } = this.syntaxNode.data
    const { typeChecker, reporter } = visitor

    if (!initializer || !annotation || annotation.type === 'placeholder') {
      // TODO: This shouldn't do anything here, so why was it here?
      // traversalConfig.ignoreChildren = true
    } else {
      const annotationType = visitor.unificationType(
        [],
        () => typeChecker.typeNameGenerator.next(),
        annotation
      )
      const initializerId = initializer.data.id
      const initializerType = typeChecker.nodes[initializerId]

      if (initializerType) {
        typeChecker.constraints.push({
          head: annotationType,
          tail: initializerType,
          origin: this.syntaxNode,
        })
      } else {
        reporter.error(
          `WARNING: No initializer type for ${name.name} (${initializerId})`
        )
      }

      typeChecker.patternTypes[name.id] = annotationType
    }
  }

  evaluationEnter(visitor: EvaluationVisitor): void {
    const { initializer, name } = this.syntaxNode.data

    if (!initializer) return

    visitor.add(name.id, {
      label: 'Variable initializer for ' + name.name,
      dependencies: [initializer.data.id],
      f: values => values[0],
    })
  }
}
