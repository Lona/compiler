import { LogicAST as AST } from '@lona/serialization'
import { withOptions, IndexPath } from 'tree-visit'

const { visit, find, findAll } = withOptions({
  getChildren: AST.subNodes,
})

// Overload to support type guard
export function findNode<
  A extends AST.SyntaxNode['type'],
  T extends AST.SyntaxNode & { type: A }
>(
  rootNode: AST.SyntaxNode,
  predicate: (node: AST.SyntaxNode, indexPath: IndexPath) => node is T
): T | undefined

export function findNode(
  node: AST.SyntaxNode,
  predicate: (node: AST.SyntaxNode, indexPath: IndexPath) => boolean
): ReturnType<typeof find> {
  return find(node, predicate)
}

export const findNodes = findAll

export { visit }
