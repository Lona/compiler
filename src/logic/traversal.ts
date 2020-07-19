import { LogicAST as AST } from '@lona/serialization'
import { withOptions } from 'tree-visit'

const { visit, find, findAll } = withOptions({
  getChildren: AST.subNodes,
})

export const findNode = find

export const findNodes = findAll

export { visit }
