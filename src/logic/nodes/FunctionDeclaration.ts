import { LogicAST as AST } from '@lona/serialization'
import { compact } from '../../utils/sequence'
import { evaluateIsTrue } from '../evaluation'
import { EvaluationVisitor } from '../evaluationVisitor'
import { UUID } from '../namespace'
import NamespaceVisitor from '../namespaceVisitor'
import { DefaultArguments } from '../runtime/memory'
import { Encode, Value } from '../runtime/value'
import { ScopeVisitor } from '../scopeVisitor'
import { FunctionArgument, StaticType } from '../staticType'
import { TypeCheckerVisitor } from '../typeChecker'
import { IDeclaration, Node } from './interfaces'
import { ReturnStatement } from './ReturnStatement'
import { FunctionParameter } from './FunctionParameter'
import { createNode } from './createNode'

export class FunctionDeclaration extends Node<AST.FunctionDeclaration>
  implements IDeclaration {
  get parameters(): FunctionParameter[] {
    return compact(
      this.syntaxNode.data.parameters.map(
        node => createNode(node) as FunctionParameter | undefined
      )
    )
  }

  get returnStatements(): ReturnStatement[] {
    const syntaxNodes = this.findAll(
      node => node.type === 'return'
    ) as AST.ReturnStatement[]

    return syntaxNodes.map(node => new ReturnStatement(node))
  }

  namespaceEnter(visitor: NamespaceVisitor): void {}

  namespaceLeave(visitor: NamespaceVisitor): void {
    const {
      name: { name, id },
    } = this.syntaxNode.data

    visitor.declareValue(name, id)
  }

  scopeEnter(visitor: ScopeVisitor): void {
    const { name, parameters, genericParameters } = this.syntaxNode.data

    visitor.addValueToScope(name)

    visitor.pushScope()

    parameters.forEach(parameter => {
      switch (parameter.type) {
        case 'parameter':
          visitor.addValueToScope(parameter.data.localName)
        case 'placeholder':
          break
      }
    })

    genericParameters.forEach(parameter => {
      switch (parameter.type) {
        case 'parameter':
          visitor.addTypeToScope(parameter.data.name)
        case 'placeholder':
          break
      }
    })
  }

  scopeLeave(visitor: ScopeVisitor): void {
    visitor.popScope()
  }

  typeCheckerEnter(visitor: TypeCheckerVisitor): void {
    const { genericParameters, parameters, name } = this.syntaxNode.data
    const { typeChecker } = visitor

    const genericNames = compact(
      genericParameters.map(param =>
        param.type === 'parameter' ? param.data.name.name : undefined
      )
    )

    const genericsInScope: [string, string][] = genericNames.map(x => [
      x,
      typeChecker.typeNameGenerator.next(),
    ])

    let parameterTypes: FunctionArgument[] = []

    parameters.forEach(param => {
      if (param.type === 'placeholder') return

      const { name, id } = param.data.localName

      let annotationType = visitor.unificationType(
        [],
        () => typeChecker.typeNameGenerator.next(),
        param.data.annotation
      )

      parameterTypes.unshift({ label: name, type: annotationType })

      typeChecker.nodes[id] = annotationType
      typeChecker.patternTypes[id] = annotationType
    })

    let returnType = visitor.unificationType(
      genericsInScope,
      () => typeChecker.typeNameGenerator.next(),
      this.syntaxNode.data.returnType
    )

    let functionType: StaticType = {
      type: 'function',
      returnType,
      arguments: parameterTypes,
    }

    typeChecker.nodes[name.id] = functionType
    typeChecker.patternTypes[name.id] = functionType
  }

  typeCheckerLeave(visitor: TypeCheckerVisitor): void {}

  evaluationEnter(visitor: EvaluationVisitor) {
    const { name, block, parameters } = this.syntaxNode.data
    const { resolveType } = visitor

    const functionType = resolveType(name.id)

    if (!functionType) return

    const explicitDefaults: [string, UUID][] = compact(
      parameters.map(parameter => {
        if (
          parameter.type !== 'parameter' ||
          parameter.data.defaultValue.type !== 'value'
        ) {
          return
        }

        const { localName } = parameter.data
        const {
          expression,
          id: defaultValueId,
        } = parameter.data.defaultValue.data

        visitor.add(defaultValueId, {
          label: `func '${name}' default value for param '${localName.name}'`,
          dependencies: [expression.data.id],
          f: ([value]) => value,
        })

        return [localName.name, defaultValueId]
      })
    )

    visitor.add(name.id, {
      label: `function ${name.name}`,
      dependencies: explicitDefaults.map(value => value[1]),
      f: values => {
        const defaultArguments: DefaultArguments = Object.fromEntries(
          compact(
            parameters.map(parameter => {
              if (parameter.type !== 'parameter') return

              const parameterType = resolveType(parameter.data.localName.id)

              if (!parameterType) return

              const defaultIndex = explicitDefaults.findIndex(
                def => def[0] === parameter.data.localName.name
              )
              const defaultValue =
                defaultIndex !== -1 ? values[defaultIndex] : undefined

              return [
                parameter.data.localName.name,
                [parameterType, defaultValue],
              ]
            })
          )
        )

        return {
          type: functionType,
          memory: {
            type: 'function',
            value: {
              defaultArguments,
              f: args => {
                const newContext = visitor.evaluation.copy()

                parameters.forEach((p, i) => {
                  if (p.type === 'parameter') {
                    newContext.addValue(
                      p.data.localName.id,
                      args[p.data.localName.name]
                    )
                  }
                })

                function evaluateBlock(
                  block: AST.Statement[]
                ): Value | undefined {
                  for (let statement of block) {
                    switch (statement.type) {
                      case 'branch': {
                        if (
                          evaluateIsTrue(newContext, statement.data.condition)
                        ) {
                          const res = evaluateBlock(statement.data.block)
                          if (res) {
                            return res
                          }
                        }
                        break
                      }
                      case 'placeholder':
                      case 'expression':
                      case 'declaration': {
                        break
                      }
                      case 'loop': {
                        while (
                          evaluateIsTrue(newContext, statement.data.expression)
                        ) {
                          const res = evaluateBlock(statement.data.block)
                          if (res) {
                            return res
                          }
                        }
                      }
                      case 'return': {
                        return newContext.evaluate(
                          statement.data.expression.data.id
                        )
                      }
                    }
                  }
                }

                return evaluateBlock(block)?.memory || Encode.unit().memory
              },
            },
          },
        }
      },
    })
  }
}
