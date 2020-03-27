import { LogicAST } from '@lona/serialization'
import lowerFirst from 'lodash.lowerfirst'
import { Helpers, HardcodedMap, EvaluationContext } from '../../helpers'
import { nonNullable, typeNever } from '../../utils'
import * as JSAST from './js-ast'
import { enumName } from './format'
import { resolveImportPath } from './utils'

type LogicGenerationContext = {
  isStatic: boolean
  isTopLevel: boolean
  rootNode: LogicAST.SyntaxNode
  filePath: string
  importIdentifier: (identifier: string, from: string) => void
  helpers: Helpers
  resolveStandardLibrary: (
    node: LogicAST.SyntaxNode,
    evaluationContext: undefined | EvaluationContext,
    context: LogicGenerationContext
  ) => JSAST.JSNode | undefined
}

type RecordParameter = {
  name: string
  defaultValue: LogicAST.Expression
}

const createVariableOrProperty = (
  isStaticContext: boolean,
  isDynamic: boolean,
  name: string,
  value: JSAST.JSNode
): JSAST.JSNode => {
  if (isStaticContext) {
    if (isDynamic) {
      return {
        type: 'MethodDefinition',
        data: {
          key: `get ${name}`,
          value: {
            type: 'FunctionExpression',
            data: {
              params: [],
              body: [{ type: 'Return', data: value }],
            },
          },
        },
      }
    }

    return {
      type: 'Property',
      data: { key: { type: 'Identifier', data: [name] }, value: value },
    }
  } else {
    return {
      type: 'VariableDeclaration',
      data: {
        type: 'AssignmentExpression',
        data: { left: { type: 'Identifier', data: [name] }, right: value },
      },
    }
  }
}

const sharedPrefix = (
  rootNode: LogicAST.SyntaxNode,
  a: string,
  b: string,
  context: LogicGenerationContext
): string[] => {
  function inner(aPath: string[], bPath: string[]): string[] {
    const a = aPath.shift()
    const b = bPath.shift()
    if ((aPath.length > 0, a === b)) {
      return [aPath[0], ...inner(aPath, bPath)]
    }
    return []
  }

  const aPath = context.helpers.ast.traversal.declarationPathTo(rootNode, a)
  const bPath = context.helpers.ast.traversal.declarationPathTo(rootNode, b)
  return inner(aPath, bPath)
}

function fontWeight(weight: number): JSAST.JSNode {
  return { type: 'Literal', data: { type: 'Number', data: weight } }
}

function evaluateColor(
  node: LogicAST.SyntaxNode,
  context: LogicGenerationContext
): JSAST.JSNode | undefined {
  if (!context.helpers.evaluationContext) {
    return undefined
  }
  const color = context.helpers.evaluationContext.evaluate(node.data.id)

  if (
    !color ||
    color.type.type !== 'constant' ||
    color.type.name !== 'Color' ||
    color.memory.type !== 'record' ||
    !color.memory.value.value ||
    color.memory.value.value.memory.type !== 'string'
  ) {
    return undefined
  }

  return {
    type: 'Literal',
    data: {
      type: 'Color',
      data: color.memory.value.value.memory.value,
    },
  }
}

const hardcoded: HardcodedMap<JSAST.JSNode, [LogicGenerationContext]> = {
  functionCallExpression: {
    'Color.saturate': evaluateColor,
    'Color.setHue': evaluateColor,
    'Color.setSaturation': evaluateColor,
    'Color.setLightness': evaluateColor,
    'Color.fromHSL': evaluateColor,
    'Boolean.or': (node, context) => {
      if (
        !node.data.arguments[0] ||
        node.data.arguments[0].type !== 'argument' ||
        !node.data.arguments[1] ||
        node.data.arguments[1].type !== 'argument'
      ) {
        throw new Error(
          'The first 2 arguments of `Boolean.or` need to be a value'
        )
      }

      return {
        type: 'BinaryExpression',
        data: {
          left: expression(node.data.arguments[0].data.expression, context),
          operator: JSAST.binaryOperator.Or,
          right: expression(node.data.arguments[1].data.expression, context),
        },
      }
    },
    'Boolean.and': (node, context) => {
      if (
        !node.data.arguments[0] ||
        node.data.arguments[0].type !== 'argument' ||
        !node.data.arguments[1] ||
        node.data.arguments[1].type !== 'argument'
      ) {
        throw new Error(
          'The first 2 arguments of `Boolean.and` need to be a value'
        )
      }

      return {
        type: 'BinaryExpression',
        data: {
          left: expression(node.data.arguments[0].data.expression, context),
          operator: JSAST.binaryOperator.And,
          right: expression(node.data.arguments[1].data.expression, context),
        },
      }
    },
    'String.concat': (node, context) => {
      if (
        !node.data.arguments[0] ||
        node.data.arguments[0].type !== 'argument' ||
        !node.data.arguments[1] ||
        node.data.arguments[1].type !== 'argument'
      ) {
        throw new Error(
          'The first 2 arguments of `String.concat` need to be a value'
        )
      }
      // TODO:
      return undefined
    },
    'Number.range': (node, context) => {
      if (
        !node.data.arguments[0] ||
        node.data.arguments[0].type !== 'argument' ||
        !node.data.arguments[1] ||
        node.data.arguments[1].type !== 'argument' ||
        !node.data.arguments[2] ||
        node.data.arguments[2].type !== 'argument'
      ) {
        throw new Error(
          'The first 3 arguments of `Number.range` need to be a value'
        )
      }
      // TODO:
      return undefined
    },
    'Array.at': (node, context) => {
      if (
        !node.data.arguments[0] ||
        node.data.arguments[0].type !== 'argument' ||
        !node.data.arguments[1] ||
        node.data.arguments[1].type !== 'argument'
      ) {
        throw new Error(
          'The first 2 arguments of `Array.at` need to be a value'
        )
      }
      // TODO:
      return undefined
    },
    'Optional.value': (node, context) => {
      if (
        !node.data.arguments[0] ||
        node.data.arguments[0].type !== 'argument'
      ) {
        throw new Error(
          'The first argument of `Optional.value` needs to be a value'
        )
      }
      return expression(node.data.arguments[0].data.expression, context)
    },
    Shadow: () => {
      // polyfilled
      return undefined
    },
    TextStyle: () => {
      // polyfilled
      return undefined
    },
    'Optional.none': () => ({
      type: 'Literal',
      data: { type: 'Undefined', data: undefined },
    }),
    'FontWeight.ultraLight': () => fontWeight(100),
    'FontWeight.thin': () => fontWeight(200),
    'FontWeight.light': () => fontWeight(300),
    'FontWeight.regular': () => fontWeight(400),
    'FontWeight.medium': () => fontWeight(500),
    'FontWeight.semibold': () => fontWeight(600),
    'FontWeight.bold': () => fontWeight(700),
    'FontWeight.heavy': () => fontWeight(800),
    'FontWeight.black': () => fontWeight(900),
  },
  memberExpression: {
    'FontWeight.w100': () => fontWeight(100),
    'FontWeight.w200': () => fontWeight(200),
    'FontWeight.w300': () => fontWeight(300),
    'FontWeight.w400': () => fontWeight(400),
    'FontWeight.w500': () => fontWeight(500),
    'FontWeight.w600': () => fontWeight(600),
    'FontWeight.w700': () => fontWeight(700),
    'FontWeight.w800': () => fontWeight(800),
    'FontWeight.w900': () => fontWeight(900),
  },
}

export default function convert(
  node: LogicAST.SyntaxNode,
  filePath: string,
  helpers: Helpers
): JSAST.JSNode {
  const imports: { [from: string]: Set<string> } = {}
  function importIdentifier(identifier: string, from: string) {
    if (!imports[from]) {
      imports[from] = new Set()
    }
    imports[from].add(identifier)
  }

  const context: LogicGenerationContext = {
    isStatic: false,
    isTopLevel: true,
    rootNode: node,
    filePath,
    helpers,
    importIdentifier,
    resolveStandardLibrary: helpers.createStandardLibraryResolver(hardcoded),
  }

  const program = helpers.ast.makeProgram(node)

  if (!program) {
    helpers.reporter.warn(`Unhandled syntaxNode type "${node.type}"`)
    return { type: 'Empty' }
  }

  const data = program.data.block
    .filter(x => x.type !== 'placeholder')
    .map(x => statement(x, context))

  const importNodes = Object.keys(imports).map<JSAST.JSNode>(source => {
    return {
      type: 'ImportDeclaration',
      data: {
        source: resolveImportPath(filePath, source),
        specifiers: Array.from(imports[source]).map(x => ({
          type: 'ImportSpecifier',
          data: {
            imported: x,
          },
        })),
      },
    }
  })

  return {
    type: 'Program',
    data: importNodes.concat(data),
  }
}

const statement = (
  node: LogicAST.Statement,
  context: LogicGenerationContext
): JSAST.JSNode => {
  const potentialHandled = context.resolveStandardLibrary(
    node,
    context.helpers.evaluationContext,
    context
  )
  if (potentialHandled) {
    return potentialHandled
  }

  switch (node.type) {
    case 'branch': {
      return {
        type: 'IfStatement',
        data: {
          test: expression(node.data.condition, context),
          consequent: node.data.block
            .filter(x => x.type !== 'placeholder')
            .map(x => statement(x, context)),
          alternate: [],
        },
      }
    }
    case 'declaration':
      return declaration(node.data.content, context)
    case 'expression':
      return expression(node.data.expression, context)
    case 'loop': {
      return {
        type: 'WhileStatement',
        data: {
          test: expression(node.data.expression, context),
          body: node.data.block
            .filter(x => x.type !== 'placeholder')
            .map(x => statement(x, context)),
        },
      }
    }
    case 'return': {
      return { type: 'Return', data: expression(node.data.expression, context) }
    }
    case 'placeholder':
      return { type: 'Empty' }
    default: {
      typeNever(node, context.helpers.reporter.warn)
      return { type: 'Empty' }
    }
  }
}

const declaration = (
  node: LogicAST.Declaration,
  context: LogicGenerationContext
): JSAST.JSNode => {
  const potentialHandled = context.resolveStandardLibrary(
    node,
    context.helpers.evaluationContext,
    context
  )
  if (potentialHandled) {
    return potentialHandled
  }
  switch (node.type) {
    case 'importDeclaration':
      return { type: 'Empty' }
    case 'function': {
      const newContext = { ...context, isTopLevel: false, isStatic: true }
      const variable = createVariableOrProperty(
        context.isStatic,
        false,
        lowerFirst(node.data.name.name),
        {
          type: 'ArrowFunctionExpression',
          data: {
            params: node.data.parameters
              .map<JSAST.JSNode | undefined>(x => {
                if (x.type !== 'parameter') {
                  return undefined
                }
                const identifier = {
                  type: 'Identifier' as const,
                  data: [x.data.localName.name],
                }
                if (
                  !x.data.defaultValue ||
                  x.data.defaultValue.type === 'none'
                ) {
                  return identifier
                }
                return {
                  type: 'AssignmentExpression',
                  data: {
                    left: identifier,
                    right: expression(
                      x.data.defaultValue.data.expression,
                      newContext
                    ),
                  },
                }
              })
              .filter(nonNullable),
            body: node.data.block
              .filter(x => x.type !== 'placeholder')
              .map(x => statement(x, newContext)),
          },
        }
      )

      if (
        context.isTopLevel &&
        variable.type === 'VariableDeclaration' &&
        variable.data.type === 'AssignmentExpression'
      ) {
        return {
          type: 'ExportNamedDeclaration',
          data: variable.data,
        }
      }

      return variable
    }
    case 'namespace': {
      const newContext = { ...context, isTopLevel: false, isStatic: true }
      const variable = createVariableOrProperty(
        context.isStatic,
        false,
        lowerFirst(node.data.name.name),
        {
          type: 'Literal',
          data: {
            type: 'Object',
            data: node.data.declarations
              .filter(x => x.type !== 'placeholder')
              .map(x => declaration(x, newContext)),
          },
        }
      )

      if (
        context.isTopLevel &&
        variable.type === 'VariableDeclaration' &&
        variable.data.type === 'AssignmentExpression'
      ) {
        return {
          type: 'ExportNamedDeclaration',
          data: variable.data,
        }
      }

      return variable
    }
    case 'variable': {
      const newContext = { ...context, isTopLevel: false }
      const initialValue: JSAST.JSNode = node.data.initializer
        ? expression(node.data.initializer, newContext)
        : { type: 'Identifier', data: ['undefined'] }

      const isDynamic = context.helpers.ast.traversal.reduce(
        {
          type: 'declaration',
          data: {
            id: '',
            content: node,
          },
        },
        (prev, child) => {
          if (
            child.type === 'expression' &&
            child.data.expression.type === 'identifierExpression'
          ) {
            const prefix = sharedPrefix(
              context.rootNode,
              node.data.id,
              child.data.expression.data.id,
              context
            )

            if (prefix.length === 0) {
              return prev
            }

            return true
          }

          return prev
        },
        false
      )

      const variable = createVariableOrProperty(
        context.isStatic,
        isDynamic,
        lowerFirst(node.data.name.name),
        initialValue
      )

      if (
        context.isTopLevel &&
        variable.type === 'VariableDeclaration' &&
        variable.data.type === 'AssignmentExpression'
      ) {
        return {
          type: 'ExportNamedDeclaration',
          data: variable.data,
        }
      }

      return variable
    }
    case 'record':
      return { type: 'Empty' }
    case 'enumeration':
      return {
        type: 'VariableDeclaration',
        data: {
          type: 'AssignmentExpression',
          data: {
            left: { type: 'Identifier', data: [enumName(node.data.name.name)] },
            right: {
              type: 'Literal',
              data: {
                type: 'Object',
                data: node.data.cases
                  .map<JSAST.JSNode | undefined>(x => {
                    if (x.type === 'placeholder') {
                      return undefined
                    }
                    /* TODO: Handle enums with associated data */

                    return {
                      type: 'Property',
                      data: {
                        key: {
                          type: 'Identifier',
                          data: [enumName(x.data.name.name)],
                        },
                        value: {
                          type: 'Literal',
                          data: { type: 'String', data: x.data.name.name },
                        },
                      },
                    }
                  })
                  .filter(nonNullable),
              },
            },
          },
        },
      }
    case 'placeholder':
      return { type: 'Empty' }
    default: {
      typeNever(node, context.helpers.reporter.warn)
      return { type: 'Empty' }
    }
  }
}

const expression = (
  node: LogicAST.Expression,
  context: LogicGenerationContext
): JSAST.JSNode => {
  const potentialHandled = context.resolveStandardLibrary(
    node,
    context.helpers.evaluationContext,
    context
  )
  if (potentialHandled) {
    return potentialHandled
  }
  switch (node.type) {
    case 'identifierExpression': {
      const isFromOtherFile = context.helpers.evaluationContext?.isFromOtherFile(
        node.data.identifier.id,
        context.filePath
      )

      const standard: JSAST.JSNode = {
        type: 'Identifier',
        data: [lowerFirst(node.data.identifier.string)],
      }
      // const patternId = context.helpers.evaluationContext?.getPattern(
      //   node.data.identifier.id
      // )

      // if (!patternId) {
      if (isFromOtherFile) {
        context.importIdentifier(standard.data[0], isFromOtherFile)
      }
      return standard
      // }

      // const pattern = context.helpers.ast.traversal.declarationPathTo(
      //   context.rootNode,
      //   patternId
      // )

      // if (!pattern.length) {
      //   if (isFromOtherFile) {
      //     context.importIdentifier(standard.data[0], isFromOtherFile)
      //   }
      //   return standard
      // }

      // if (isFromOtherFile) {
      //   context.importIdentifier(lowerFirst(pattern[0]), isFromOtherFile)
      // }

      // return {
      //   type: 'Identifier',
      //   data: pattern.map(lowerFirst),
      // }
    }
    case 'literalExpression':
      return literal(node.data.literal, context)
    case 'memberExpression':
      return {
        type: 'MemberExpression',
        data: {
          memberName: lowerFirst(node.data.memberName.string),
          expression: expression(node.data.expression, context),
        },
      }
    case 'functionCallExpression': {
      const validArguments = node.data.arguments.filter(
        x => x.type !== 'placeholder'
      )
      const standard = (): JSAST.JSNode => ({
        type: 'CallExpression',
        data: {
          callee: expression(node.data.expression, context),
          arguments: validArguments
            .map(x =>
              x.type === 'placeholder'
                ? undefined
                : expression(x.data.expression, context)
            )
            .filter(nonNullable),
        },
      })

      const lastIdentifier =
        node.data.expression.type === 'identifierExpression'
          ? node.data.expression.data.identifier
          : node.data.expression.type === 'memberExpression'
          ? node.data.expression.data.memberName
          : undefined

      if (!lastIdentifier) {
        return standard()
      }

      /* Does the identifier point to a defined pattern? */
      const identifierPatternId = context.helpers.evaluationContext?.getPattern(
        lastIdentifier.id
      )
      /* Does the expression point to a defined pattern? (used for member expressions) */
      const expressionPatternId = context.helpers.evaluationContext?.getPattern(
        node.data.expression.data.id
      )

      const patternId = identifierPatternId || expressionPatternId

      if (!patternId || !context.helpers.evaluationContext) {
        return standard()
      }

      const parent = context.helpers.ast.traversal.findParentNode(
        context.helpers.evaluationContext.rootNode,
        patternId
      )

      if (!parent) {
        return standard()
      }

      // initialization of a record
      if (
        'type' in parent &&
        parent.type === 'declaration' &&
        parent.data.content.type === 'record'
      ) {
        const recordDefinition = parent.data.content.data.declarations
          .map<RecordParameter | undefined>(x =>
            x.type === 'variable' && x.data.initializer
              ? { name: x.data.name.name, defaultValue: x.data.initializer }
              : undefined
          )
          .filter(nonNullable)

        return {
          type: 'Literal',
          data: {
            type: 'Object',
            data: recordDefinition.map(x => {
              const found = validArguments.find(
                arg =>
                  arg.type !== 'placeholder' &&
                  arg.data.label &&
                  arg.data.label === x.name
              )

              if (found && found.type === 'argument') {
                return {
                  type: 'Property',
                  data: {
                    key: { type: 'Identifier', data: [x.name] },
                    value: expression(found.data.expression, context),
                  },
                }
              }

              return {
                type: 'Property',
                data: {
                  key: { type: 'Identifier', data: [x.name] },
                  value: expression(x.defaultValue, context),
                },
              }
            }),
          },
        }
      }

      // initialization of an enum
      if (
        'type' in parent &&
        parent.type === 'declaration' &&
        parent.data.content.type === 'enumeration'
      ) {
        const enumeration = context.helpers.ast.traversal.findParentNode(
          context.helpers.evaluationContext.rootNode,
          parent.data.id
        )

        if (
          enumeration &&
          'type' in enumeration &&
          enumeration.type === 'enumerationCase'
        ) {
          return {
            type: 'Literal',
            data: {
              type: 'String',
              data: enumeration.data.name.name,
            },
          }
        }
      }

      return standard()
    }
    case 'assignmentExpression': {
      return {
        type: 'AssignmentExpression',
        data: {
          left: expression(node.data.left, context),
          right: expression(node.data.right, context),
        },
      }
    }
    case 'placeholder': {
      context.helpers.reporter.warn('Placeholder expression remaining')
      return { type: 'Empty' }
    }
    default: {
      typeNever(node, context.helpers.reporter.warn)
      return { type: 'Empty' }
    }
  }
}

const literal = (
  node: LogicAST.Literal,
  context: LogicGenerationContext
): JSAST.JSNode => {
  const potentialHandled = context.resolveStandardLibrary(
    node,
    context.helpers.evaluationContext,
    context
  )
  if (potentialHandled) {
    return potentialHandled
  }
  switch (node.type) {
    case 'none': {
      return {
        type: 'Literal',
        data: { type: 'Undefined', data: undefined },
      }
    }
    case 'boolean': {
      return {
        type: 'Literal',
        data: { type: 'Boolean', data: node.data.value },
      }
    }
    case 'number': {
      return {
        type: 'Literal',
        data: { type: 'Number', data: node.data.value },
      }
    }
    case 'string': {
      return {
        type: 'Literal',
        data: { type: 'String', data: node.data.value },
      }
    }
    case 'color': {
      return {
        type: 'Literal',
        data: { type: 'Color', data: node.data.value },
      }
    }
    case 'array': {
      return {
        type: 'Literal',
        data: {
          type: 'Array',
          data: node.data.value
            .filter(x => x.type !== 'placeholder')
            .map(x => expression(x, context)),
        },
      }
    }
    default: {
      typeNever(node, context.helpers.reporter.warn)
      return { type: 'Empty' }
    }
  }
}
