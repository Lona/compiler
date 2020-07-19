import { LogicAST as AST } from '@lona/serialization'
import { EvaluationVisitor } from '../evaluationVisitor'
import { Value } from '../runtime/value'
import { ScopeVisitor } from '../scopeVisitor'
import { FunctionArgument, StaticType, unit } from '../staticType'
import { TypeCheckerVisitor } from '../typeChecker'
import { IExpression, Node, INode } from './interfaces'
import { createExpressionNode } from './createNode'
import { compact } from '../../utils/sequence'
import { nonNullable } from '../../utils/typeHelpers'

export class FunctionCallExpression extends Node<AST.FunctionCallExpression>
  implements IExpression {
  get callee(): IExpression {
    return createExpressionNode(this.syntaxNode.data.expression)!
  }

  get argumentExpressionNodes(): { [key: string]: IExpression } {
    return Object.fromEntries(
      compact(
        this.syntaxNode.data.arguments.map((arg, index) => {
          if (arg.type === 'placeholder') return

          const expressionNode = createExpressionNode(arg.data.expression)

          if (!expressionNode) return

          return [arg.data.label ?? index.toString(), expressionNode]
        })
      )
    )
  }

  scopeEnter(visitor: ScopeVisitor): void {}

  scopeLeave(visitor: ScopeVisitor): void {}

  typeCheckerEnter(visitor: TypeCheckerVisitor): void {}

  typeCheckerLeave(visitor: TypeCheckerVisitor): void {
    const {
      expression,
      arguments: functionArguments,
      id,
    } = this.syntaxNode.data
    const { typeChecker } = visitor

    const calleeType = typeChecker.nodes[expression.data.id]

    /* Unify against these to enforce a function type */
    const placeholderReturnType: StaticType = {
      type: 'variable',
      value: typeChecker.typeNameGenerator.next(),
    }

    const placeholderArgTypes = functionArguments
      .map<FunctionArgument | undefined>(arg => {
        if (arg.type === 'placeholder') return

        return {
          label: arg.data.label,
          type: {
            type: 'variable',
            value: typeChecker.typeNameGenerator.next(),
          },
        }
      })
      .filter(nonNullable)

    const placeholderFunctionType: StaticType = {
      type: 'function',
      returnType: placeholderReturnType,
      arguments: placeholderArgTypes,
    }

    typeChecker.constraints.push({
      head: calleeType,
      tail: placeholderFunctionType,
      origin: this.syntaxNode,
    })

    typeChecker.nodes[id] = placeholderReturnType

    let argumentValues = functionArguments
      .map(arg =>
        arg.type === 'placeholder' ? undefined : arg.data.expression
      )
      .filter(nonNullable)

    const constraints = placeholderArgTypes.map((argType, i) => ({
      head: argType.type,
      tail: typeChecker.nodes[argumentValues[i].data.id],
      origin: this.syntaxNode,
    }))

    typeChecker.constraints = typeChecker.constraints.concat(constraints)
  }

  evaluationEnter(visitor: EvaluationVisitor) {
    const { expression, arguments: args, id } = this.syntaxNode.data
    const { reporter, resolveType } = visitor

    const type = resolveType(expression.data.id)

    if (!type) return

    if (type.type !== 'function') {
      reporter.error(
        'Invalid functionCallExpression type (only functions are valid)',
        type
      )
      return
    }

    // TODO: Fix union between argument and placeholder type
    const isValidArgument = (arg: AST.FunctionCallArgument) => {
      if (
        arg.type === 'placeholder' ||
        arg.data.expression.type === 'placeholder' ||
        (arg.data.expression.type === 'identifierExpression' &&
          arg.data.expression.data.identifier.isPlaceholder)
      ) {
        return false
      }
      return true
    }

    const validArguments = args.filter(isValidArgument)

    const dependencies = [
      expression.data.id,
      ...validArguments.map(arg => {
        if (arg.type === 'placeholder') throw new Error('Invalid argument')
        return arg.data.expression.data.id
      }),
    ]

    visitor.add(id, {
      label: 'FunctionCallExpression',
      dependencies,
      f: values => {
        const [functionValue] = values

        if (functionValue.memory.type !== 'function') {
          reporter.error('tried to evaluate a function that is not a function')
          return { type: unit, memory: { type: 'unit' } }
        }

        const { f, defaultArguments } = functionValue.memory.value

        const alreadyMatched = new Set<string>()

        const members: [string, Value | void][] = Object.entries(
          defaultArguments
        ).map(([key, value]) => {
          const match = validArguments.find(
            x =>
              x.type === 'argument' &&
              !alreadyMatched.has(x.data.id) &&
              (x.data.label == null || x.data.label === key)
          )

          // If an argument is explicitly passed, use it
          if (match && match.type === 'argument' && isValidArgument(match)) {
            const dependencyIndex = dependencies.indexOf(
              match.data.expression.data.id
            )

            if (dependencyIndex !== -1) {
              alreadyMatched.add(match.data.id)

              return [key, values[dependencyIndex]]
            } else {
              throw new Error(
                `Failed to find arg dependency ${match.data.expression.data.id}`
              )
            }
          } else {
            // Fall back to default argument
            return [key, value[1]]
          }
        })

        const namedArguments = Object.fromEntries(
          members.flatMap(([key, value]) => (value ? [[key, value]] : []))
        )

        return {
          type: type.returnType,
          memory: f(namedArguments),
        }
      },
    })
  }
}
