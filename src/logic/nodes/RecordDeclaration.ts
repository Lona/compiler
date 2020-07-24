import { LogicAST as AST } from '@lona/serialization'
import { compact } from '../../utils/sequence'
import { EvaluationVisitor } from '../evaluationVisitor'
import { builtInTypeConstructorNames } from '../namespace'
import NamespaceVisitor from '../namespaceVisitor'
import { DefaultArguments } from '../runtime/memory'
import { ScopeVisitor } from '../scopeVisitor'
import { FunctionArgument, StaticType } from '../staticType'
import { TypeCheckerVisitor } from '../typeChecker'
import { IDeclaration, Node } from './interfaces'
import { substitute } from '../typeUnifier'
import { EnterReturnValue } from 'buffs'

export class RecordDeclaration extends Node<AST.RecordDeclaration>
  implements IDeclaration {
  namespaceEnter(visitor: NamespaceVisitor): void {
    const {
      name: { name, id },
    } = this.syntaxNode.data

    visitor.declareType(name, id)
    visitor.pushPathComponent(name)
  }

  namespaceLeave(visitor: NamespaceVisitor): void {
    const {
      name: { name, id },
    } = this.syntaxNode.data

    visitor.popPathComponent()

    // Built-ins should be constructed using literals
    if (builtInTypeConstructorNames.has(name)) return

    // Create constructor function
    visitor.declareValue(name, id)
  }

  scopeEnter(visitor: ScopeVisitor): EnterReturnValue {
    const { name, declarations, genericParameters } = this.syntaxNode.data

    visitor.addTypeToScope(name)

    visitor.pushNamespace(name.name)

    genericParameters.forEach(parameter => {
      switch (parameter.type) {
        case 'parameter':
          visitor.addTypeToScope(parameter.data.name)
        case 'placeholder':
          break
      }
    })

    // Handle variable initializers manually
    declarations.forEach(declaration => {
      switch (declaration.type) {
        case 'variable': {
          const { name: variableName, initializer } = declaration.data

          if (!initializer) break

          visitor.traverse(initializer)

          visitor.addValueToScope(variableName)
        }
        default:
          break
      }
    })

    visitor.popNamespace()

    // Don't introduce variables names into scope
    return 'skip'
  }

  scopeLeave(visitor: ScopeVisitor): void {}

  typeCheckerEnter(visitor: TypeCheckerVisitor): void {
    const { genericParameters, declarations, name } = this.syntaxNode.data
    const { typeChecker } = visitor

    const genericNames = compact(
      genericParameters.map(param =>
        param.type === 'parameter' ? param.data.name.name : undefined
      )
    )

    const genericsInScope = genericNames.map(x => [
      x,
      typeChecker.typeNameGenerator.next(),
    ])

    const universalTypes = genericNames.map<StaticType>((x, i) => ({
      type: 'generic',
      name: genericsInScope[i][1],
    }))

    let parameterTypes: FunctionArgument[] = []

    declarations.forEach(declaration => {
      if (declaration.type !== 'variable' || !declaration.data.annotation) {
        return
      }
      const { annotation, name } = declaration.data
      const annotationType = visitor.unificationType(
        [],
        () => typeChecker.typeNameGenerator.next(),
        annotation
      )
      parameterTypes.unshift({
        label: name.name,
        type: annotationType,
      })

      typeChecker.nodes[name.id] = annotationType
      typeChecker.patternTypes[name.id] = annotationType
    })

    const returnType: StaticType = {
      type: 'constructor',
      name: name.name,
      parameters: universalTypes,
    }

    const functionType: StaticType = {
      type: 'function',
      returnType,
      arguments: parameterTypes,
    }

    typeChecker.nodes[name.id] = functionType
    typeChecker.patternTypes[name.id] = functionType
  }

  typeCheckerLeave(visitor: TypeCheckerVisitor): void {}

  evaluationEnter(visitor: EvaluationVisitor) {
    const { name, declarations } = this.syntaxNode.data
    const { typeChecker, substitution, reporter } = visitor

    const type = typeChecker.patternTypes[name.id]

    if (!type) {
      reporter.error('Unknown record type')
      return
    }

    const recordType = substitute(substitution, type)

    const memberVariables: {
      pattern: AST.Pattern
      initializer: AST.Expression
      type: StaticType
    }[] = compact(
      declarations.map(declaration => {
        if (declaration.type === 'variable') {
          const { name: variableName, initializer } = declaration.data

          const memberType = typeChecker.patternTypes[variableName.id]

          if (!memberType || !initializer) return

          return {
            pattern: variableName,
            initializer: initializer,
            type: substitute(substitution, memberType),
          }
        }
      })
    )

    visitor.add(name.id, {
      label: 'Record initializer for ' + name.name,
      dependencies: memberVariables.map(member => member.initializer.data.id),
      f: values => {
        const defaultArguments: DefaultArguments = Object.fromEntries(
          memberVariables.map(({ pattern, type }, index) => {
            return [pattern.name, [type, values[index]]]
          })
        )

        return {
          type: recordType,
          memory: {
            type: 'function',
            value: {
              defaultArguments,
              f: record => {
                return {
                  type: 'record',
                  value: record,
                }
              },
            },
          },
        }
      },
    })
  }
}
