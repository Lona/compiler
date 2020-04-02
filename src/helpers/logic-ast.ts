import { LogicAST } from '@lona/serialization'
import { uuid } from '../utils'

export { LogicAST as AST }

/**
 * Takes an array of programs and returns a program containing
 * the statements of all programs
 */
export function joinPrograms(
  programs: (LogicAST.Program | void)[]
): LogicAST.Program {
  return {
    type: 'program',
    data: {
      id: uuid(),
      block: programs.reduce(
        (prev, x) => (x ? prev.concat(x.data.block) : prev),
        [] as LogicAST.Statement[]
      ),
    },
  }
}

/** tries to make a program out of any Logic node */
export function makeProgram(
  node: LogicAST.SyntaxNode
): LogicAST.Program | undefined {
  if (node.type === 'program') {
    return node
  }
  if (LogicAST.isStatement(node)) {
    return { type: 'program', data: { id: uuid(), block: [node] } }
  }
  if (LogicAST.isDeclaration(node)) {
    return makeProgram({
      type: 'declaration',
      data: { id: uuid(), content: node },
    })
  }
  if (node.type === 'topLevelDeclarations') {
    return {
      type: 'program',
      data: {
        id: uuid(),
        block: node.data.declarations.map(x => ({
          type: 'declaration',
          data: { id: uuid(), content: x },
        })),
      },
    }
  }

  return undefined
}

export function getPattern(
  node: LogicAST.SyntaxNode
): LogicAST.Pattern | undefined {
  if (
    node.type === 'variable' ||
    node.type === 'enumeration' ||
    node.type === 'namespace' ||
    node.type === 'record' ||
    node.type === 'importDeclaration' ||
    node.type === 'enumerationCase' ||
    node.type === 'function'
  ) {
    return node.data.name
  }

  if (node.type === 'parameter') {
    if ('localName' in node.data) {
      return node.data.localName
    }
    return node.data.name
  }
}

export function getIdentifier(
  node: LogicAST.SyntaxNode
): LogicAST.Identifier | undefined {
  if (node.type === 'identifierExpression' || node.type === 'typeIdentifier') {
    return node.data.identifier
  }
  if (node.type === 'memberExpression') {
    return node.data.memberName
  }
}

export function flattenedMemberExpression(
  memberExpression: LogicAST.Expression
): LogicAST.Identifier[] | void {
  if (memberExpression.type === 'identifierExpression') {
    return [memberExpression.data.identifier]
  }
  if (memberExpression.type !== 'memberExpression') {
    return undefined
  }
  if (memberExpression.data.expression.type === 'identifierExpression') {
    return [
      memberExpression.data.expression.data.identifier,
      memberExpression.data.memberName,
    ]
  }
  const flattenedChildren = flattenedMemberExpression(
    memberExpression.data.expression
  )
  if (!flattenedChildren) {
    return undefined
  }
  return flattenedChildren.concat(memberExpression.data.memberName)
}

export function getNode(
  rootNode: LogicAST.SyntaxNode,
  id: string
): LogicAST.SyntaxNode | undefined {
  if (rootNode.data.id === id) {
    return rootNode
  }

  if ('name' in rootNode.data && rootNode.data.name.id === id) {
    return rootNode
  }

  const children = LogicAST.subNodes(rootNode)

  for (let child of children) {
    const node = getNode(child, id)
    if (node) {
      return node
    }
  }

  return undefined
}

function pathTo(
  rootNode: LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier,
  id: string
):
  | (LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier)[]
  | undefined {
  if (id === ('id' in rootNode ? rootNode.id : rootNode.data.id)) {
    return [rootNode]
  }
  if (!('type' in rootNode)) {
    return undefined
  }

  const pattern = getPattern(rootNode)
  if (pattern && pattern.id === id) {
    return [pattern]
  }

  const identifier = getIdentifier(rootNode)
  if (identifier && identifier.id === id) {
    return [identifier]
  }

  for (let item of LogicAST.subNodes(rootNode)) {
    const subPath = pathTo(item, id)
    if (subPath) {
      return [rootNode, ...subPath]
    }
  }

  return undefined
}

export function findNode(
  rootNode: LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier,
  id: string
) {
  const path = pathTo(rootNode, id)
  if (!path) {
    return undefined
  }

  return path[path.length - 1]
}

export function findParentNode(
  node: LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier,
  id: string
) {
  const path = pathTo(node, id)
  if (!path || path.length <= 1) {
    return undefined
  }

  const parent = path[path.length - 2]

  if (!('type' in parent)) {
    return undefined
  }

  return parent
}

export function declarationPathTo(
  node: LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier,
  id: string
): string[] {
  const path = pathTo(node, id)
  if (!path) {
    return []
  }
  return path
    .map(x => {
      if (!('type' in x)) {
        return ''
      }
      switch (x.type) {
        case 'variable':
        case 'function':
        case 'enumeration':
        case 'namespace':
        case 'record':
        case 'importDeclaration': {
          return x.data.name.name
        }
        case 'argument': {
          return x.data.label || ''
        }
        case 'parameter': {
          if ('localName' in x.data) {
            return x.data.localName.name
          }
          return x.data.name.name
        }
        default:
          return ''
      }
    })
    .filter(x => !!x)
}
