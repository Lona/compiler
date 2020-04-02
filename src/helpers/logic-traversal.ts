import * as LogicAST from './logic-ast'

enum TraversalOrder {
  PreOrder = 'PreOrder',
  PostOrder = 'PostOrder',
}

export type TraversalConfig = {
  order: TraversalOrder
  ignoreChildren: boolean
  stopTraversal: boolean
  needsRevisitAfterTraversingChildren: boolean
  _isRevisit: boolean
}

export let emptyConfig = (): TraversalConfig => ({
  order: TraversalOrder.PreOrder,
  ignoreChildren: false,
  stopTraversal: false,
  needsRevisitAfterTraversingChildren: false,
  _isRevisit: false,
})

function reduceChildren<T>(
  node: LogicAST.AST.SyntaxNode,
  callbackfn: (
    previousValue: T,
    currentNode: LogicAST.AST.SyntaxNode,
    config: TraversalConfig
  ) => T,
  initialResult: T,
  config: TraversalConfig
): T {
  if (!LogicAST.AST.subNodes(node)) {
    console.log(node)
  }
  return LogicAST.AST.subNodes(node).reduce<T>((prev, x) => {
    if (config.stopTraversal) {
      return prev
    }
    return reduce(x, callbackfn, prev, config)
  }, initialResult)
}

/**
 * The `reduce()` method executes a reducer function (that you provide) on each node of the AST, resulting in a single output value.
 * Your reducer function's returned value is assigned to the accumulator, whose value is remembered across each iteration throughout the AST, and ultimately becomes the final, single resulting value.
 * The traversal is depth-first, you can specify whether it should be pre-order or post-order in the config.
 */
export const reduce = <T>(
  node: LogicAST.AST.SyntaxNode,
  callbackfn: (
    previousValue: T,
    currentNode: LogicAST.AST.SyntaxNode,
    config: TraversalConfig
  ) => T,
  initialResult: T,
  config: TraversalConfig = emptyConfig()
) => {
  if (config.stopTraversal) {
    return initialResult
  }

  if (config.order === TraversalOrder.PostOrder) {
    const result = reduceChildren(node, callbackfn, initialResult, config)

    if (config.stopTraversal) {
      return result
    }

    return callbackfn(result, node, config)
  } else {
    let result = callbackfn(initialResult, node, config)

    const shouldRevisit = config.needsRevisitAfterTraversingChildren

    if (config.ignoreChildren) {
      config.ignoreChildren = false
    } else {
      result = reduceChildren(node, callbackfn, result, config)
    }

    if (!config.stopTraversal && shouldRevisit) {
      config._isRevisit = true
      result = callbackfn(result, node, config)
      config._isRevisit = false
      config.ignoreChildren = false
    }

    return result
  }
}
