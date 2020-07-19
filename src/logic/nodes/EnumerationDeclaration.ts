import { LogicAST as AST } from '@lona/serialization'
import { compact } from '../../utils/sequence'
import { EvaluationVisitor } from '../evaluationVisitor'
import NamespaceVisitor from '../namespaceVisitor'
import { DefaultArguments, RecordMemory } from '../runtime/memory'
import { ScopeVisitor } from '../scopeVisitor'
import { StaticType } from '../staticType'
import { TypeCheckerVisitor } from '../typeChecker'
import { substitute } from '../typeUnifier'
import { IDeclaration, Node } from './interfaces'

export class EnumerationDeclaration extends Node<AST.EnumerationDeclaration>
  implements IDeclaration {
  namespaceEnter(visitor: NamespaceVisitor): void {
    const {
      name: { name, id },
    } = this.syntaxNode.data

    visitor.declareType(name, id)
    visitor.pushPathComponent(name)
  }

  namespaceLeave(visitor: NamespaceVisitor): void {
    const { cases } = this.syntaxNode.data

    // Add initializers for each case into the namespace
    cases.forEach(enumCase => {
      switch (enumCase.type) {
        case 'placeholder':
          break
        case 'enumerationCase':
          visitor.declareValue(enumCase.data.name.name, enumCase.data.name.id)
      }
    })

    visitor.popPathComponent()
  }

  scopeEnter(visitor: ScopeVisitor): void {
    const { name, genericParameters } = this.syntaxNode.data

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
  }

  scopeLeave(visitor: ScopeVisitor): void {
    visitor.popNamespace()
  }

  typeCheckerEnter(visitor: TypeCheckerVisitor): void {
    const { genericParameters, cases, name } = this.syntaxNode.data
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

    const universalTypes = genericNames.map<StaticType>((x, i) => ({
      type: 'generic',
      name: genericsInScope[i][1],
    }))

    const returnType: StaticType = {
      type: 'constant',
      name: name.name,
      parameters: universalTypes,
    }

    cases.forEach(enumCase => {
      if (enumCase.type === 'placeholder') return

      const parameterTypes = compact(
        enumCase.data.associatedValueTypes.map(annotation => {
          if (annotation.type === 'placeholder') return

          return {
            label: undefined,
            type: visitor.unificationType(
              genericsInScope,
              () => typeChecker.typeNameGenerator.next(),
              annotation
            ),
          }
        })
      )

      const functionType: StaticType = {
        type: 'function',
        returnType,
        arguments: parameterTypes,
      }

      typeChecker.nodes[enumCase.data.name.id] = functionType
      typeChecker.patternTypes[enumCase.data.name.id] = functionType
    })

    /* Not used for unification, but used for convenience in evaluation */
    typeChecker.nodes[name.id] = returnType
    typeChecker.patternTypes[name.id] = returnType
  }

  typeCheckerLeave(visitor: TypeCheckerVisitor): void {}

  evaluationEnter(visitor: EvaluationVisitor) {
    const { name, cases } = this.syntaxNode.data
    const { typeChecker, substitution, reporter } = visitor

    const type = typeChecker.patternTypes[name.id]

    if (!type) {
      reporter.error('unknown enumberation type')
      return
    }

    const enumType = substitute(substitution, type)

    cases.forEach(enumCase => {
      if (enumCase.type !== 'enumerationCase') return

      const { name: caseName } = enumCase.data

      const caseType = substitute(
        substitution,
        typeChecker.nodes[enumCase.data.name.id]
      )

      if (caseType.type !== 'function') {
        throw new Error('Enum case type must be a function')
      }

      const defaultArguments: DefaultArguments = Object.fromEntries(
        caseType.arguments.map(({ label, type }, index) => {
          return [
            typeof label === 'string' ? label : index.toString(),
            [substitute(substitution, type), undefined],
          ]
        })
      )

      visitor.addValue(caseName.id, {
        type: enumType,
        memory: {
          type: 'function',
          value: {
            f: (record: RecordMemory) => {
              return {
                type: 'enum',
                value: caseName.name,
                data: Object.values(record),
              }
            },
            defaultArguments,
          },
        },
      })
    })
  }
}
