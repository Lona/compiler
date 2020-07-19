import { LogicAST as AST } from '@lona/serialization'
import { ITypeAnnotation, Node } from './interfaces'
import { ScopeVisitor } from '../scopeVisitor'
import { EnterReturnValue } from 'buffs'

export class IdentifierTypeAnnotation
  extends Node<AST.TypeIdentifierTypeAnnotation>
  implements ITypeAnnotation {
  scopeEnter(visitor: ScopeVisitor): EnterReturnValue {
    const { genericArguments, id, identifier } = this.syntaxNode.data

    genericArguments.forEach(arg => {
      visitor.traverse(arg)
    })

    if (identifier.isPlaceholder) return

    const found = visitor.findTypeIdentifierReference(identifier.string)

    if (found) {
      visitor.scope.typeIdentifierToPattern[id] = found
    } else {
      visitor.reporter.warn(
        `No type identifier: ${identifier.string}`,
        visitor.scope.valueNames
      )
      visitor.scope.undefinedTypeIdentifiers.add(id)
    }

    return 'skip'
  }

  scopeLeave(visitor: ScopeVisitor): void {}
}

export class FunctionTypeAnnotation extends Node<AST.FunctionTypeTypeAnnotation>
  implements ITypeAnnotation {
  scopeEnter(visitor: ScopeVisitor): EnterReturnValue {
    return 'skip'
  }

  scopeLeave(visitor: ScopeVisitor): void {}
}
