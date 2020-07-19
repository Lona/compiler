import { LogicAST as AST } from '@lona/serialization'
import { NodePath } from './nodePath'
import { createDeclarationNode } from './nodes/createNode'
import { Namespace, UUID } from './namespace'
import { visit } from './traversal'

export default class NamespaceVisitor {
  namespace: Namespace
  currentPath = new NodePath()

  constructor(namespace: Namespace) {
    this.namespace = namespace
  }

  pushPathComponent(name: string) {
    this.currentPath.pushComponent(name)
  }

  popPathComponent() {
    this.currentPath.popComponent()
  }

  declareValue(name: string, value: UUID) {
    const path = this.currentPath.pathString(name)

    if (this.namespace.values[path]) {
      throw new Error(`Value already declared: ${path}`)
    }

    this.namespace.values[path] = value
  }

  declareType(name: string, type: UUID) {
    const path = this.currentPath.pathString(name)

    if (this.namespace.types[path]) {
      throw new Error(`Type already declared: ${path}`)
    }

    this.namespace.types[path] = type
  }

  traverse(rootNode: AST.SyntaxNode) {
    visit(rootNode, {
      onEnter: node => createDeclarationNode(node)?.namespaceEnter(this),
      onLeave: node => createDeclarationNode(node)?.namespaceLeave(this),
    })
  }
}
