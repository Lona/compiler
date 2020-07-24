import { LogicAST as AST } from '@lona/serialization'
import { IDeclaration, Node } from './interfaces'
import NamespaceVisitor from '../namespaceVisitor'
import { ScopeVisitor } from '../scopeVisitor'

export class NamespaceDeclaration extends Node<AST.NamespaceDeclaration>
  implements IDeclaration {
  namespaceEnter(visitor: NamespaceVisitor): void {
    const {
      name: { name, id },
    } = this.syntaxNode.data

    visitor.pushPathComponent(name)
  }

  namespaceLeave(visitor: NamespaceVisitor): void {
    const {
      name: { name, id },
    } = this.syntaxNode.data

    visitor.popPathComponent()
  }

  scopeEnter(visitor: ScopeVisitor): void {
    const {
      name: { name },
    } = this.syntaxNode.data

    visitor.pushNamespace(name)
  }

  scopeLeave(visitor: ScopeVisitor): void {
    visitor.popNamespace()
  }
}
