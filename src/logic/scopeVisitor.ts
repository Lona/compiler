import { LogicAST as AST } from '@lona/serialization'
import { Namespace, UUID } from './namespace'
import { NodePath } from './nodePath'
import { createScopeVisitor } from './nodes/createNode'
import { Scope } from './scope'
import { visit } from './traversal'
import { Reporter } from '../utils/reporter'

export class ScopeVisitor {
  namespace: Namespace
  scope: Scope
  reporter: Reporter
  currentPath = new NodePath()
  targetId?: UUID

  constructor(
    namespace: Namespace,
    scope: Scope,
    reporter: Reporter,
    targetId?: string
  ) {
    this.namespace = namespace
    this.scope = scope
    this.reporter = reporter
    this.targetId = targetId
  }

  traverse(rootNode: AST.SyntaxNode) {
    visit(rootNode, {
      onEnter: (node: AST.SyntaxNode) => {
        if (node.data.id === this.targetId) return 'stop'
        return createScopeVisitor(node)?.scopeEnter(this)
      },
      onLeave: (node: AST.SyntaxNode) => {
        return createScopeVisitor(node)?.scopeLeave(this)
      },
    })
  }

  // Scope helpers

  pushScope() {
    this.scope.valueNames.push()
    this.scope.typeNames.push()
  }

  popScope() {
    this.scope.valueNames.pop()
    this.scope.typeNames.pop()
  }

  pushNamespace(name: string) {
    this.pushScope()
    this.currentPath.pushComponent(name)
  }

  popNamespace() {
    this.popScope()
    this.currentPath.popComponent()
  }

  addValueToScope(pattern: AST.Pattern) {
    this.scope.valueNames.set(pattern.name, pattern.id)
  }

  addTypeToScope(pattern: AST.Pattern) {
    this.scope.typeNames.set(pattern.name, pattern.id)
  }

  findValueIdentifierReference(name: string): UUID | undefined {
    const valueInScope = this.scope.valueNames.get(name)
    const valueInNamespace = this.namespace.values[name]
    const valueInParentNamespace = this.namespace.values[
      [...this.currentPath.components, name].join('.')
    ]

    return valueInScope || valueInNamespace || valueInParentNamespace
  }

  findTypeIdentifierReference(name: string): UUID | undefined {
    const typeInScope = this.scope.typeNames.get(name)
    const typeInNamespace = this.namespace.types[name]
    const typeInParentNamespace = this.namespace.types[
      [...this.currentPath.components, name].join('.')
    ]

    return typeInScope || typeInNamespace || typeInParentNamespace
  }
}
