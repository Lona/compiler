import { LogicAST as AST } from '@lona/serialization'
import NamespaceVisitor from './namespaceVisitor'

export type UUID = string

export type Namespace = {
  values: { [key: string]: UUID }
  types: { [key: string]: UUID }
}

export const builtInTypeConstructorNames: Set<String> = new Set([
  'Boolean',
  'Number',
  'String',
  'Array',
  'Color',
])

/**
 * Merge namespaces, throwing an error in the case of collisions
 */
export function mergeNamespaces(namespaces: Namespace[]): Namespace {
  return namespaces.reduce((result, namespace) => {
    Object.entries(namespace.values).forEach(([key, value]) => {
      if (key in result.values) {
        throw new Error(`Namespace error: value ${key} declared more than once`)
      }

      result.values[key] = value
    })

    Object.entries(namespace.types).forEach(([key, type]) => {
      if (key in result.types) {
        throw new Error(`Namespace error: type ${key} declared more than once`)
      }

      result.types[key] = type
    })

    return result
  }, createNamespace())
}

/**
 * Copy a namespace
 */
export function copy(namespace: Namespace): Namespace {
  return {
    values: { ...namespace.values },
    types: { ...namespace.types },
  }
}

/**
 * Build the global namespace by visiting each node.
 */
export function createNamespace(topLevelNode?: AST.SyntaxNode): Namespace {
  let namespace: Namespace = { types: {}, values: {} }

  if (topLevelNode) {
    let visitor = new NamespaceVisitor(namespace)

    visitor.traverse(topLevelNode)
  }

  return namespace
}
