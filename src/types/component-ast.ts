import { LogicAST } from '@lona/serialization'
import { uuid, assertNever } from '../utils'
import { UserType } from './user-types-ast'

type Layer = {
  type:
    | 'Lona:View'
    | 'Lona:Text'
    | 'Lona:Image'
    | 'Lona:VectorGraphic'
    | 'Lona:Animation'
    | 'Lona:Children'
    | string
  id: string
  params: {
    styles?: { [property: string]: unknown }[]
    [key: string]: unknown
  }
  children?: Layer[]
  metadata?: {
    [field: string]: unknown
  }
}

/** Deprecated component's Logic AST */
type DeprecatedLogicNode =
  | {
      type: 'AssignExpr'
      assignee: DeprecatedLogicNode
      content: DeprecatedLogicNode
    }
  | {
      type: 'IfExpr'
      condition: DeprecatedLogicNode
      body: DeprecatedLogicNode[]
    }
  | {
      type: 'VarDeclExpr'
      content: DeprecatedLogicNode
      id: DeprecatedLogicNode
    }
  | {
      type: 'BinExpr'
      left: DeprecatedLogicNode
      op: string
      right: DeprecatedLogicNode
    }
  | {
      type: 'LitExpr'
      value: {
        type: string
        data: any
      }
    }
  | DeprecatedLogicNode[] // MemberExpression
  | string // IdentifierExpression
  | undefined // PlaceholderExpression

function getLogicExpression(node: DeprecatedLogicNode): LogicAST.Expression {
  let expression = convertDeprecatedLogicAST(node)
  if ('id' in expression) {
    expression = {
      type: 'identifierExpression',
      data: { id: uuid(), identifier: expression },
    }
  }

  if (!LogicAST.isExpression(expression)) {
    throw new Error('need an expression')
  }
  return expression
}

function getLogicStatement(node: DeprecatedLogicNode): LogicAST.Statement {
  let expression = getLogicExpression(node)

  return {
    type: 'expression',
    data: {
      id: uuid(),
      expression,
    },
  }
}

export function convertDeprecatedLogicAST(
  node: DeprecatedLogicNode
): LogicAST.SyntaxNode | LogicAST.Identifier {
  if (!node) {
    return {
      type: 'placeholder',
      data: {
        id: uuid(),
      },
    }
  }
  if (typeof node === 'string') {
    return {
      id: uuid(),
      string: node,
      isPlaceholder: false,
    }
  }
  if (Array.isArray(node)) {
    if (node.length === 0) {
      return {
        type: 'placeholder',
        data: {
          id: uuid(),
        },
      }
    }
    if (node.length === 1 && typeof node[0] === 'string') {
      return {
        type: 'identifierExpression',
        data: {
          id: uuid(),
          identifier: {
            id: uuid(),
            string: node[0],
            isPlaceholder: false,
          },
        },
      }
    }

    const memberName = node.pop()

    if (typeof memberName !== 'string') {
      throw new Error('need an string')
    }

    return {
      type: 'memberExpression',
      data: {
        id: uuid(),
        memberName: {
          id: uuid(),
          string: memberName,
          isPlaceholder: false,
        },
        expression: getLogicExpression(node),
      },
    }
  }

  switch (node.type) {
    case 'AssignExpr': {
      const right = getLogicExpression(node.content)
      const left = getLogicExpression(node.assignee)
      return {
        type: 'binaryExpression',
        data: {
          id: uuid(),
          left,
          op: {
            type: 'setEqualTo',
            data: {
              id: uuid(),
            },
          },
          right,
        },
      }
    }
    case 'BinExpr': {
      const left = getLogicExpression(node.left)
      const right = getLogicExpression(node.right)
      let op: LogicAST.BinaryOperator
      switch (node.op) {
        case '==': {
          op = {
            type: 'isEqualTo',
            data: {
              id: uuid(),
            },
          }
          break
        }
        case '!=': {
          op = {
            type: 'isNotEqualTo',
            data: {
              id: uuid(),
            },
          }
          break
        }
        case '>': {
          op = {
            type: 'isGreaterThan',
            data: {
              id: uuid(),
            },
          }
          break
        }
        case '>=': {
          op = {
            type: 'isGreaterThanOrEqual',
            data: {
              id: uuid(),
            },
          }
          break
        }
        case '<': {
          op = {
            type: 'isLessThan',
            data: {
              id: uuid(),
            },
          }
          break
        }
        case '<=': {
          op = {
            type: 'isLessThanOrEqual',
            data: {
              id: uuid(),
            },
          }
          break
        }
        default: {
          throw new Error('unknown binary operator')
        }
      }
      return {
        type: 'binaryExpression',
        data: {
          id: uuid(),
          left,
          op,
          right,
        },
      }
    }
    case 'IfExpr': {
      const block = node.body.map(getLogicStatement)

      if (
        node.condition &&
        typeof node.condition !== 'string' &&
        'type' in node.condition &&
        node.condition.type === 'VarDeclExpr'
      ) {
        const id = getLogicExpression(node.condition.id)
        const content = getLogicExpression(node.condition.content)
        return {
          type: 'branch',
          data: {
            id: uuid(),
            condition: {
              type: 'binaryExpression',
              data: {
                id: uuid(),
                left: content,
                op: {
                  type: 'isNotEqualTo',
                  data: {
                    id: uuid(),
                  },
                },
                right: {
                  type: 'literalExpression',
                  data: {
                    id: uuid(),
                    literal: {
                      type: 'none',
                      data: {
                        id: uuid(),
                      },
                    },
                  },
                },
              },
            },
            block: [
              {
                type: 'expression',
                data: {
                  id: uuid(),
                  expression: {
                    type: 'binaryExpression',
                    data: {
                      id: uuid(),
                      left: id,
                      op: {
                        type: 'setEqualTo',
                        data: {
                          id: uuid(),
                        },
                      },
                      right: content,
                    },
                  },
                },
              },
              ...block,
            ],
          },
        }
      }

      return {
        type: 'branch',
        data: {
          id: uuid(),
          condition: getLogicExpression(node.condition),
          block,
        },
      }
    }
    case 'LitExpr': {
      // TODO:
      // @ts-ignore
      return {
        type: 'literalExpression',
        data: {
          id: uuid(),
          literal: node.value,
        },
      }
    }
    case 'VarDeclExpr': {
      return {
        type: 'binaryExpression',
        data: {
          id: uuid(),
          left: getLogicExpression(node.id),
          op: {
            type: 'setEqualTo',
            data: {
              id: uuid(),
            },
          },
          right: getLogicExpression(node.content),
        },
      }
    }
    default: {
      assertNever(node)
    }
  }
}

export type Component = {
  params: {
    name: string
    type: UserType
    defaultValue?: any
  }[]
  root: Layer
  logic: DeprecatedLogicNode[]
}
