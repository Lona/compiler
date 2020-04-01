import * as LogicUnify from './logic-unify'
import * as LogicAST from './logic-ast'
import * as LogicScope from './logic-scope'
import { isHardcodedMapCall } from './hardcoded-mapping'
import { hardcoded } from './logic-evaluation-hardcoded-map'
import { Reporter } from './reporter'
import { nonNullable, ShallowMap, assertNever } from '../utils'
import { STANDARD_LIBRARY } from './evaluation-context'

export type Memory =
  | { type: 'unit' }
  | { type: 'bool'; value: boolean }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'array'; value: Value[] }
  | { type: 'enum'; value: string; data: Value[] }
  | { type: 'record'; value: { [key: string]: Value } }
  | {
      type: 'function'
      value:
        | { type: 'path'; value: string[] }
        | {
            type: 'recordInit'
            value: { [key: string]: [LogicUnify.Unification, Value | void] }
          }
        | { type: 'enumInit'; value: string }
    }

export type Value = {
  type: LogicUnify.Unification
  memory: Memory
}

type Thunk = {
  label: string
  dependencies: string[]
  f: (args: Value[]) => Value
}

/**
 * The evaluation context of the Lona Workspace.
 *
 * It contains some mapping between the identifiers and what they reference,
 * eg. `Optional.none` -> the function declaration in Prelude.logic
 * which is used to evaluate `Optional.none` to
 * `{ type: unit, memory: { type: 'unit' } }` for example. It takes care of
 * the scope of the identifier to determine the reference.
 *
 * Additionally, it keeps track of where declaration are from.
 */
export class EvaluationContext {
  private values: { [uuid: string]: Value } = {}
  private thunks: { [uuid: string]: Thunk } = {}
  private scopeContext: LogicScope.ScopeContext
  private reporter: Reporter

  /** The root Logic node used to build the evaluation context  */
  public rootNode: LogicAST.AST.SyntaxNode

  constructor(
    scopeContext: LogicScope.ScopeContext,
    rootNode: LogicAST.AST.SyntaxNode,
    reporter: Reporter
  ) {
    this.scopeContext = scopeContext
    this.rootNode = rootNode
    this.reporter = reporter
  }

  add(uuid: string, thunk: Thunk) {
    this.thunks[uuid] = thunk
  }

  addValue(uuid: string, value: Value) {
    this.values[uuid] = value
  }

  /** Whether the id references something from the Lona's standard library */
  isFromStandardLibrary(uuid: string): boolean {
    return this.getOriginalFile(uuid) === STANDARD_LIBRARY
  }

  /** Whether the id references something from another file,
   * and returns that file if true */
  isFromOtherFile(uuid: string, currentFile: string): string | undefined {
    const otherFile = this.getOriginalFile(uuid)
    if (
      otherFile &&
      otherFile !== currentFile &&
      otherFile !== STANDARD_LIBRARY
    ) {
      return otherFile
    }
    return undefined
  }

  getPattern(uuid: string): string | undefined {
    return (
      this.scopeContext.identifierToPattern[uuid] || {
        pattern: undefined,
      }
    ).pattern
  }

  private getOriginalFile(uuid: string): string | undefined {
    return (
      this.scopeContext.identifierToPattern[uuid] || {
        in: undefined,
      }
    ).in
  }

  /** Evaluate the id to a value, resolving any dependency along the way */
  evaluate(uuid: string): Value | undefined {
    const value = this.values[uuid]
    if (value) {
      return value
    }
    const thunk = this.thunks[uuid]
    if (!thunk) {
      this.reporter.error(`no thunk for ${uuid}`)
      return undefined
    }

    const resolvedDependencies = thunk.dependencies.map(x => this.evaluate(x))
    if (resolvedDependencies.some(x => !x)) {
      this.reporter.error(
        `Failed to evaluate thunk ${uuid} - missing dep ${
          thunk.dependencies[resolvedDependencies.findIndex(x => !x)]
        }`
      )
      return undefined
    }

    const result = thunk.f(resolvedDependencies as Value[])
    this.values[uuid] = result
    return result
  }
}

const makeEmpty = (
  scopeContext: LogicScope.ScopeContext,
  rootNode: LogicAST.AST.SyntaxNode,
  reporter: Reporter
) => new EvaluationContext(scopeContext, rootNode, reporter)

export const evaluate = (
  node: LogicAST.AST.SyntaxNode,
  rootNode: LogicAST.AST.SyntaxNode,
  scopeContext: LogicScope.ScopeContext,
  unificationContext: LogicUnify.UnificationContext,
  substitution: ShallowMap<LogicUnify.Unification, LogicUnify.Unification>,
  reporter: Reporter,
  context_: EvaluationContext = makeEmpty(scopeContext, rootNode, reporter)
): EvaluationContext | undefined => {
  const context = LogicAST.AST.subNodes(node).reduce<
    EvaluationContext | undefined
  >((prev, subNode) => {
    if (!prev) {
      return undefined
    }
    return evaluate(
      subNode,
      rootNode,
      scopeContext,
      unificationContext,
      substitution,
      reporter,
      prev
    )
  }, context_)

  if (!context) {
    return undefined
  }

  switch (node.type) {
    case 'none': {
      context.addValue(node.data.id, {
        type: LogicUnify.unit,
        memory: {
          type: 'unit',
        },
      })
      break
    }
    case 'boolean': {
      const { value, id } = node.data
      context.addValue(id, {
        type: LogicUnify.bool,
        memory: {
          type: 'bool',
          value,
        },
      })
      break
    }
    case 'number': {
      const { value, id } = node.data
      context.addValue(id, {
        type: LogicUnify.number,
        memory: {
          type: 'number',
          value,
        },
      })
      break
    }
    case 'string': {
      const { value, id } = node.data
      context.addValue(id, {
        type: LogicUnify.string,
        memory: {
          type: 'string',
          value,
        },
      })
      break
    }
    case 'color': {
      const { value, id } = node.data
      context.addValue(id, {
        type: LogicUnify.color,
        memory: {
          type: 'record',
          value: {
            value: {
              type: LogicUnify.string,
              memory: {
                type: 'string',
                value,
              },
            },
          },
        },
      })
      break
    }
    case 'array': {
      const type = unificationContext.nodes[node.data.id]
      if (!type) {
        reporter.error('Failed to unify type of array')
        break
      }
      const resolvedType = LogicUnify.substitute(substitution, type)
      const dependencies = node.data.value
        .filter(x => x.type !== 'placeholder')
        .map(x => x.data.id)
      context.add(node.data.id, {
        label: 'Array Literal',
        dependencies,
        f: values => ({
          type: resolvedType,
          memory: {
            type: 'array',
            value: values,
          },
        }),
      })
      break
    }
    case 'literalExpression': {
      context.add(node.data.id, {
        label: 'Literal expression',
        dependencies: [node.data.literal.data.id],
        f: values => values[0],
      })
      break
    }
    case 'identifierExpression': {
      const { id, string } = node.data.identifier
      const patternId = scopeContext.identifierToPattern[id]

      if (!patternId) {
        break
      }
      context.add(id, {
        label: 'Identifier ' + string,
        dependencies: [patternId.pattern],
        f: values => values[0],
      })
      context.add(node.data.id, {
        label: 'IdentifierExpression ' + string,
        dependencies: [patternId.pattern],
        f: values => values[0],
      })

      break
    }
    case 'memberExpression': {
      const patternId = scopeContext.identifierToPattern[node.data.id]
      if (!patternId) {
        break
      }
      context.add(node.data.id, {
        label: 'Member expression',
        dependencies: [patternId.pattern],
        f: values => values[0],
      })

      break
    }
    case 'functionCallExpression': {
      const { expression, arguments: args } = node.data
      let functionType = unificationContext.nodes[expression.data.id]
      if (!functionType) {
        reporter.error('Unknown type of functionCallExpression')
        break
      }

      const resolvedType = LogicUnify.substitute(substitution, functionType)
      if (resolvedType.type !== 'function') {
        reporter.error(
          'Invalid functionCallExpression type (only functions are valid)',
          resolvedType
        )
        break
      }

      const dependencies = [expression.data.id].concat(
        args
          .map(arg => {
            if (
              arg.type === 'placeholder' ||
              arg.data.expression.type === 'placeholder' ||
              (arg.data.expression.type === 'identifierExpression' &&
                arg.data.expression.data.identifier.isPlaceholder)
            ) {
              return undefined
            }
            return arg.data.expression.data.id
          })
          .filter(nonNullable)
      )

      context.add(node.data.id, {
        label: 'FunctionCallExpression',
        dependencies,
        f: values => {
          const [functionValue, ...functionArgs] = values

          if (functionValue.memory.type !== 'function') {
            reporter.error(
              'tried to evaluate a function that is not a function'
            )
            return { type: LogicUnify.unit, memory: { type: 'unit' } }
          }

          if (functionValue.memory.value.type === 'path') {
            const functionName = functionValue.memory.value.value.join('.')
            if (
              context.isFromStandardLibrary(expression.data.id) &&
              isHardcodedMapCall.functionCallExpression(functionName, hardcoded)
            ) {
              const value = hardcoded.functionCallExpression[functionName](
                node,
                ...functionArgs
              )
              if (value) {
                return value
              }
            }

            // this is a custom function that we have no idea what it is
            // so let's warn about it and ignore it
            reporter.error(
              `Failed to evaluate "${node.data.id}": Unknown function ${functionName}`
            )
            return { type: LogicUnify.unit, memory: { type: 'unit' } }
          }

          if (functionValue.memory.value.type === 'enumInit') {
            return {
              type: resolvedType.returnType,
              memory: {
                type: 'enum',
                value: functionValue.memory.value.value,
                data: functionArgs,
              },
            }
          }

          if (functionValue.memory.value.type === 'recordInit') {
            const members: [string, Value | void][] = Object.entries(
              functionValue.memory.value.value
            ).map(([key, value]) => {
              const arg = args.find(
                x =>
                  x.type === 'argument' &&
                  !!x.data.label &&
                  x.data.label === key
              )
              let argumentValue: Value | void

              if (arg && arg.type === 'argument') {
                const { expression } = arg.data
                if (
                  expression.type !== 'identifierExpression' ||
                  !expression.data.identifier.isPlaceholder
                ) {
                  const dependencyIndex = dependencies.indexOf(
                    expression.data.id
                  )

                  if (dependencyIndex !== -1) {
                    argumentValue = values[dependencyIndex]
                  }
                }
              }

              if (argumentValue) {
                return [key, argumentValue]
              }
              return [key, value[1]]
            })

            return {
              type: resolvedType.returnType,
              memory: {
                type: 'record',
                value: members.reduce<{ [field: string]: Value }>((prev, m) => {
                  if (!m[1]) {
                    return prev
                  }
                  prev[m[0]] = m[1]
                  return prev
                }, {}),
              },
            }
          }

          assertNever(functionValue.memory.value)
        },
      })
      break
    }
    case 'variable': {
      if (node.data.initializer) {
        context.add(node.data.name.id, {
          label: 'Variable initializer for ' + node.data.name.name,
          dependencies: [node.data.initializer.data.id],
          f: values => values[0],
        })
      }
      break
    }
    case 'function': {
      const { name } = node.data
      const type = unificationContext.patternTypes[name.id]
      const fullPath = LogicAST.declarationPathTo(rootNode, node.data.id)

      if (!type) {
        reporter.error('Unknown function type')
        break
      }
      context.addValue(name.id, {
        type,
        memory: {
          type: 'function',
          value: {
            type: 'path',
            value: fullPath,
          },
        },
      })

      break
    }
    case 'record': {
      const { name, declarations } = node.data
      const type = unificationContext.patternTypes[name.id]
      if (!type) {
        reporter.error('Unknown record type')
        break
      }
      const resolvedType = LogicUnify.substitute(substitution, type)
      const dependencies = declarations
        .map(x =>
          x.type === 'variable' && x.data.initializer
            ? x.data.initializer.data.id
            : undefined
        )
        .filter(nonNullable)

      context.add(name.id, {
        label: 'Record declaration for ' + name.name,
        dependencies,
        f: values => {
          const parameterTypes: {
            [key: string]: [LogicUnify.Unification, Value | void]
          } = {}
          let index = 0

          declarations.forEach(declaration => {
            if (declaration.type !== 'variable') {
              return
            }
            const parameterType =
              unificationContext.patternTypes[declaration.data.name.id]
            if (!parameterType) {
              return
            }

            let initialValue: Value | void
            if (declaration.data.initializer) {
              initialValue = values[index]
              index += 1
            }

            parameterTypes[declaration.data.name.name] = [
              parameterType,
              initialValue,
            ]
          })

          return {
            type: resolvedType,
            memory: {
              type: 'function',
              value: {
                type: 'recordInit',
                value: parameterTypes,
              },
            },
          }
        },
      })

      break
    }
    case 'enumeration': {
      const type = unificationContext.patternTypes[node.data.name.id]

      if (!type) {
        reporter.error('unknown enumberation type')
        break
      }
      node.data.cases.forEach(enumCase => {
        if (enumCase.type !== 'enumerationCase') {
          return
        }
        const resolvedConsType = LogicUnify.substitute(substitution, type)
        const { name } = enumCase.data
        context.addValue(name.id, {
          type: resolvedConsType,
          memory: {
            type: 'function',
            value: {
              type: 'enumInit',
              value: name.name,
            },
          },
        })
      })

      break
    }
    case 'assignmentExpression': {
      context.add(node.data.left.data.id, {
        label:
          'Assignment for ' +
          LogicAST.declarationPathTo(
            context.rootNode,
            node.data.left.data.id
          ).join('.'),
        dependencies: [node.data.right.data.id],
        f: values => values[0],
      })
      break
    }
    case 'functionType':
    case 'typeIdentifier':
    case 'program':
    case 'parameter':
    case 'value':
    case 'topLevelParameters':
    case 'topLevelDeclarations':
    case 'enumerationCase': // handled in 'enumeration'
    case 'argument': // handled in 'functionCallExpression'
    case 'namespace':
    case 'importDeclaration':
    case 'placeholder':
    case 'return':
    case 'loop':
    case 'expression':
    case 'declaration':
    case 'branch': {
      break
    }
    default: {
      assertNever(node)
    }
  }

  return context
}
