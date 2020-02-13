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

export function getPattern(node: LogicAST.SyntaxNode): LogicAST.Pattern | void {
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
): LogicAST.Identifier | void {
  if (node.type === 'identifierExpression' || node.type === 'typeIdentifier') {
    return node.data.identifier
  }
  if (node.type === 'memberExpression') {
    return node.data.memberName
  }
}

export function subNodes(node: LogicAST.SyntaxNode): LogicAST.SyntaxNode[] {
  if (node.type === 'loop') {
    return ([node.data.expression] as LogicAST.SyntaxNode[]).concat(
      node.data.block
    )
  }
  if (node.type === 'branch') {
    return ([node.data.condition] as LogicAST.SyntaxNode[]).concat(
      node.data.block
    )
  }
  if (node.type === 'declaration') {
    return [node.data.content]
  }
  if (node.type === 'expression') {
    return [node.data.expression]
  }

  if (node.type === 'variable') {
    return ([] as LogicAST.SyntaxNode[])
      .concat(node.data.annotation ? [node.data.annotation] : [])
      .concat(node.data.initializer ? [node.data.initializer] : [])
  }
  if (node.type === 'function') {
    return ([node.data.returnType] as LogicAST.SyntaxNode[])
      .concat(node.data.genericParameters)
      .concat(node.data.parameters)
      .concat(node.data.block)
  }
  if (node.type === 'enumeration') {
    return ([] as LogicAST.SyntaxNode[])
      .concat(node.data.genericParameters)
      .concat(node.data.cases)
  }
  if (node.type === 'namespace') {
    return node.data.declarations
  }
  if (node.type === 'record') {
    return ([] as LogicAST.SyntaxNode[])
      .concat(node.data.declarations)
      .concat(node.data.genericParameters)
  }
  if (node.type === 'binaryExpression') {
    return [node.data.left, node.data.right, node.data.op]
  }
  if (node.type === 'functionCallExpression') {
    return ([node.data.expression] as LogicAST.SyntaxNode[]).concat(
      node.data.arguments
    )
  }
  if (node.type === 'literalExpression') {
    return [node.data.literal]
  }
  if (node.type === 'memberExpression') {
    return [node.data.expression]
  }

  if (node.type === 'program') {
    return node.data.block
  }

  if (node.type === 'parameter') {
    if ('localName' in node.data) {
      return [node.data.annotation, node.data.defaultValue]
    }
  }

  if (node.type === 'value') {
    return [node.data.expression]
  }

  if (node.type === 'typeIdentifier') {
    return node.data.genericArguments
  }
  if (node.type === 'functionType') {
    return ([node.data.returnType] as LogicAST.SyntaxNode[]).concat(
      node.data.argumentTypes
    )
  }

  if (node.type === 'array') {
    return node.data.value
  }

  if (node.type === 'topLevelParameters') {
    return node.data.parameters
  }

  if (node.type === 'enumerationCase') {
    return node.data.associatedValueTypes
  }

  if (node.type === 'topLevelDeclarations') {
    return node.data.declarations
  }

  if (node.type === 'argument') {
    return [node.data.expression]
  }

  return []
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

  const children = subNodes(rootNode)

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

  return subNodes(rootNode).reduce<
    (LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier)[] | undefined
  >((prev, item) => {
    if (prev) {
      return prev
    }
    const subPath = pathTo(item, id)
    if (subPath) {
      return [rootNode, ...subPath]
    }
    return undefined
  }, undefined)
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
  return path.filter(LogicAST.isDeclaration).map(x => {
    switch (x.type) {
      case 'variable':
      case 'function':
      case 'enumeration':
      case 'namespace':
      case 'record':
      case 'importDeclaration': {
        return x.data.name.name
      }
      case 'placeholder': {
        return ''
      }
    }
  })
}
