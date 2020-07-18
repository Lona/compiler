import { TraversalConfig, emptyConfig, reduce } from '../helpers/logicTraversal'
import { LogicAST as AST } from '@lona/serialization'

// TODO: Reduce isn't returning a value correctly
export function findNode(
  rootNode: AST.SyntaxNode,
  predicate: (node: AST.SyntaxNode) => boolean
): AST.SyntaxNode | undefined {
  let found: AST.SyntaxNode | undefined

  reduce(
    rootNode,
    (_result, node, config) => {
      if (!found && predicate(node)) {
        config.stopTraversal = true
        found = node
      }
      return undefined
    },
    undefined
  )

  return found
}

export function findNodes(
  rootNode: AST.SyntaxNode,
  predicate: (node: AST.SyntaxNode) => boolean
): AST.SyntaxNode[] {
  let found: AST.SyntaxNode[] = []

  reduce(
    rootNode,
    (_result, node, config) => {
      if (predicate(node)) {
        found.push(node)
      }
      return undefined
    },
    undefined
  )

  return found
}

export function forEach(
  rootNode: AST.SyntaxNode,
  config: TraversalConfig,
  f: (node: AST.SyntaxNode, config: TraversalConfig) => void
) {
  reduce(
    rootNode,
    (_result, node, config) => {
      f(node, config)
      return undefined
    },
    undefined,
    config
  )
}

export function visit(
  rootNode: AST.SyntaxNode,
  config: TraversalConfig,
  {
    enter,
    leave,
    targetId,
  }: {
    enter?: (node: AST.SyntaxNode, config: TraversalConfig) => void
    leave?: (node: AST.SyntaxNode, config: TraversalConfig) => void
    targetId?: string
  }
) {
  forEach(rootNode, config, node => {
    if (node.data.id == targetId) {
      config.stopTraversal = true
      return
    }

    config.needsRevisitAfterTraversingChildren = true

    if (config._isRevisit) {
      if (leave) {
        leave(node, config)
      }
    } else {
      if (enter) {
        enter(node, config)
      }
    }
  })
}

export const Traversal = {
  get preorder(): TraversalConfig {
    return {
      ...emptyConfig(),
      order: 'PreOrder' as TraversalConfig['order'],
    }
  },
}
