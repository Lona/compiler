import { LogicAST } from '@lona/serialization'
import { Helpers } from '../../helpers'
import { makeProgram } from '../../logic/ast'
import * as SwiftAST from './swiftAst'
import { typeNever, nonNullable } from '../../utils/typeHelpers'
import { Decode } from '../../logic/runtime/value'

type LogicGenerationContext = {
  isStatic: boolean
  isTopLevel: boolean
  helpers: Helpers
}

function fontWeight(weight: string): SwiftAST.SwiftNode {
  return {
    type: 'MemberExpression',
    data: [
      {
        type: 'MemberExpression',
        data: [
          { type: 'SwiftIdentifier', data: 'Font' },
          { type: 'SwiftIdentifier', data: 'Weight' },
        ],
      },
      { type: 'SwiftIdentifier', data: weight },
    ],
  }
}

function evaluateColor(
  node: LogicAST.SyntaxNode,
  context: LogicGenerationContext
): SwiftAST.SwiftNode | undefined {
  const color = context.helpers.module.evaluationContext.evaluate(node.data.id)

  if (
    !color ||
    color.type.type !== 'constructor' ||
    color.type.name !== 'Color' ||
    color.memory.type !== 'record' ||
    !color.memory.value.value ||
    color.memory.value.value.memory.type !== 'string'
  ) {
    return undefined
  }

  return {
    type: 'LiteralExpression',
    data: {
      type: 'Color',
      data: color.memory.value.value.memory.value,
    },
  }
}

export default function convert(
  node: LogicAST.SyntaxNode,
  helpers: Helpers
): SwiftAST.SwiftNode {
  const context: LogicGenerationContext = {
    isStatic: false,
    isTopLevel: true,
    helpers,
  }

  const program = makeProgram(node)

  if (!program) {
    helpers.reporter.warn(`Unhandled syntaxNode type "${node.type}"`)
    return { type: 'Empty' }
  }

  return {
    type: 'TopLevelDeclaration',
    data: {
      statements: program.data.block
        .filter(x => x.type !== 'placeholder')
        .map(x => statement(x, context)),
    },
  }
}

const statement = (
  node: LogicAST.Statement,
  context: LogicGenerationContext
): SwiftAST.SwiftNode => {
  switch (node.type) {
    case 'placeholder':
      return { type: 'Empty' }
    case 'declaration':
      return declaration(node.data.content, context)
    case 'branch': {
      return {
        type: 'IfStatement',
        data: {
          condition: expression(node.data.condition, context),
          block: node.data.block
            .filter(x => x.type !== 'placeholder')
            .map(x => statement(x, context)),
        },
      }
    }
    case 'expression':
      return expression(node.data.expression, context)
    case 'loop': {
      return {
        type: 'WhileStatement',
        data: {
          condition: expression(node.data.expression, context),
          block: node.data.block
            .filter(x => x.type !== 'placeholder')
            .map(x => statement(x, context)),
        },
      }
    }
    case 'return':
      return {
        type: 'ReturnStatement',
        data: expression(node.data.expression, context),
      }
    default: {
      typeNever(node, context.helpers.reporter.warn)
      return { type: 'Empty' }
    }
  }
}

function isVariableDeclaration(
  x: LogicAST.SyntaxNode
): x is LogicAST.VariableDeclaration {
  return x.type === 'variable'
}

const declaration = (
  node: LogicAST.Declaration,
  context: LogicGenerationContext
): SwiftAST.SwiftNode => {
  switch (node.type) {
    case 'importDeclaration': {
      return { type: 'Empty' }
    }
    case 'namespace': {
      const newContext = { ...context, isStatic: true }
      return {
        type: 'EnumDeclaration',
        data: {
          name: node.data.name.name,
          isIndirect: true,
          inherits: [],
          genericParameters: [],
          modifier: SwiftAST.DeclarationModifier.PublicModifier,
          body: node.data.declarations
            .filter(x => x.type !== 'placeholder')
            .map(x => declaration(x, newContext)),
        },
      }
    }
    case 'variable': {
      return {
        type: 'ConstantDeclaration',
        data: {
          modifiers: (context.isStatic
            ? ([
                SwiftAST.DeclarationModifier.StaticModifier,
              ] as SwiftAST.DeclarationModifier[])
            : []
          ).concat([SwiftAST.DeclarationModifier.PublicModifier]),
          pattern: {
            type: 'IdentifierPattern',
            data: {
              identifier: {
                type: 'SwiftIdentifier',
                data: node.data.name.name,
              },
              annotation: node.data.annotation
                ? typeAnnotation(node.data.annotation, context)
                : undefined,
            },
          },
          init: node.data.initializer
            ? expression(node.data.initializer, context)
            : undefined,
        },
      }
    }
    case 'record': {
      const newContext = { ...context, isStatic: false }

      const memberVariables = node.data.declarations.filter(
        isVariableDeclaration
      )

      const initFunction: SwiftAST.SwiftNode = {
        type: 'InitializerDeclaration',
        data: {
          modifiers: [SwiftAST.DeclarationModifier.PublicModifier],
          parameters: memberVariables.map(x => ({
            type: 'Parameter',
            data: {
              localName: x.data.name.name,
              annotation: typeAnnotation(x.data.annotation, newContext),
              defaultValue: x.data.initializer
                ? expression(x.data.initializer, newContext)
                : undefined,
            },
          })),
          throws: false,
          body: memberVariables.map(x => ({
            type: 'BinaryExpression',
            data: {
              left: {
                type: 'MemberExpression',
                data: [
                  {
                    type: 'SwiftIdentifier',
                    data: 'self',
                  },
                  {
                    type: 'SwiftIdentifier',
                    data: x.data.name.name,
                  },
                ],
              },
              operator: '=',
              right: {
                type: 'SwiftIdentifier',
                data: x.data.name.name,
              },
            },
          })),
        },
      }

      return {
        type: 'StructDeclaration',
        data: {
          name: node.data.name.name,
          inherits: [
            {
              type: 'TypeName',
              data: { name: 'Equatable', genericArguments: [] },
            },
          ],
          modifier: SwiftAST.DeclarationModifier.PublicModifier,
          body: ((memberVariables.length
            ? [initFunction]
            : []) as SwiftAST.SwiftNode[]).concat(
            memberVariables.map(x =>
              declaration({ type: 'variable', data: { ...x.data } }, newContext)
            )
          ),
          /* TODO: Other declarations */
        },
      }
    }
    case 'enumeration': {
      return {
        type: 'EnumDeclaration',
        data: {
          name: node.data.name.name,
          isIndirect: true,
          genericParameters: node.data.genericParameters
            .filter(x => x.type !== 'placeholder')
            .map(x => genericParameter(x, context)),
          inherits: [],
          modifier: SwiftAST.DeclarationModifier.PublicModifier,
          body: node.data.cases
            .map(x => {
              if (x.type !== 'enumerationCase') {
                return undefined
              }
              const associatedValues = x.data.associatedValues.filter(
                y => y.type !== 'placeholder'
              )

              const associatedTypes: SwiftAST.TupleTypeElement[] = associatedValues.flatMap(
                associatedValue => {
                  if (associatedValue.type === 'placeholder') return []

                  const { annotation, label } = associatedValue.data

                  return {
                    elementName: label?.name,
                    annotation: typeAnnotation(annotation, context),
                  }
                }
              )

              const associatedType: SwiftAST.TypeAnnotation | undefined =
                associatedTypes.length === 0
                  ? undefined
                  : { type: 'TupleType', data: associatedTypes }

              const enumCase: SwiftAST.SwiftNode = {
                type: 'EnumCase',
                data: {
                  name: {
                    type: 'SwiftIdentifier',
                    data: x.data.name.name,
                  },
                  parameters: associatedType,
                },
              }
              return enumCase
            })
            .filter(nonNullable),
        },
      }
    }
    case 'placeholder': {
      return { type: 'Empty' }
    }
    case 'function': {
      return {
        type: 'FunctionDeclaration',
        data: {
          name: node.data.name.name,
          // TODO:
          attributes: [],
          modifiers: [],
          parameters: node.data.parameters
            .map<SwiftAST.SwiftNode | undefined>(x => {
              if (x.type === 'placeholder') {
                return undefined
              }

              return {
                type: 'Parameter',
                data: {
                  localName: x.data.localName.name,
                  annotation: typeAnnotation(x.data.annotation, context),
                  defaultValue:
                    x.data.defaultValue && x.data.defaultValue.type !== 'none'
                      ? expression(x.data.defaultValue.data.expression, context)
                      : undefined,
                },
              }
            })
            .filter(nonNullable),
          result:
            node.data.returnType.type !== 'placeholder'
              ? typeAnnotation(node.data.returnType, context)
              : undefined,
          body: node.data.block
            .filter(x => x.type !== 'placeholder')
            .map(x => statement(x, context)),
          throws: false,
        },
      }
    }
    default: {
      typeNever(node, context.helpers.reporter.warn)
      return { type: 'Empty' }
    }
  }
}

function createLiteralArgument(
  label: string,
  literal: SwiftAST.Literal
): SwiftAST.SwiftNode {
  return {
    type: 'FunctionCallArgument',
    data: {
      name: { type: 'SwiftIdentifier', data: label },
      value: { type: 'LiteralExpression', data: literal },
    },
  }
}

const expression = (
  node: LogicAST.Expression,
  context: LogicGenerationContext
): SwiftAST.SwiftNode => {
  const { evaluationContext } = context.helpers.module

  switch (node.type) {
    case 'identifierExpression': {
      return {
        type: 'SwiftIdentifier',
        data: node.data.identifier.string,
      }
    }
    case 'literalExpression': {
      return literal(node.data.literal, context)
    }
    case 'memberExpression': {
      return {
        type: 'MemberExpression',
        data: [
          expression(node.data.expression, context),
          { type: 'SwiftIdentifier', data: node.data.memberName.string },
        ],
      }
    }
    case 'functionCallExpression': {
      const result = evaluationContext.evaluate(node.data.id)

      if (result?.type.type === 'constructor') {
        switch (result.type.name) {
          case 'Color': {
            const color = Decode.color(result) ?? 'black'

            return {
              type: 'LiteralExpression',
              data: { type: 'Color', data: color },
            }
          }
          case 'Shadow': {
            const shadow: Decode.EvaluatedShadow = Decode.shadow(result) ?? {
              x: 0,
              y: 0,
              blur: 0,
              radius: 0,
              color: 'black',
            }

            return {
              type: 'FunctionCallExpression',
              data: {
                name: { type: 'SwiftIdentifier', data: 'Shadow' },
                arguments: [
                  createLiteralArgument('x', {
                    type: 'FloatingPoint',
                    data: shadow.x,
                  }),
                  createLiteralArgument('y', {
                    type: 'FloatingPoint',
                    data: shadow.y,
                  }),
                  createLiteralArgument('blur', {
                    type: 'FloatingPoint',
                    data: shadow.blur,
                  }),
                  createLiteralArgument('radius', {
                    type: 'FloatingPoint',
                    data: shadow.radius,
                  }),
                  createLiteralArgument('color', {
                    type: 'Color',
                    data: shadow.color,
                  }),
                ],
              },
            }
          }
          case 'TextStyle': {
            const textStyle: Decode.EvaluatedTextStyle =
              Decode.textStyle(result) ?? {}

            return {
              type: 'FunctionCallExpression',
              data: {
                name: { type: 'SwiftIdentifier', data: 'TextStyle' },
                arguments: [
                  ...(textStyle.fontName
                    ? [
                        createLiteralArgument('fontName', {
                          type: 'String',
                          data: textStyle.fontName,
                        }),
                      ]
                    : []),
                  ...(textStyle.fontFamily
                    ? [
                        createLiteralArgument('fontFamily', {
                          type: 'String',
                          data: textStyle.fontFamily,
                        }),
                      ]
                    : []),
                  ...(textStyle.fontSize
                    ? [
                        createLiteralArgument('fontSize', {
                          type: 'FloatingPoint',
                          data: textStyle.fontSize,
                        }),
                      ]
                    : []),
                  ...(textStyle.fontWeight
                    ? [
                        {
                          type: 'FunctionCallArgument',
                          data: {
                            name: {
                              type: 'SwiftIdentifier',
                              data: 'fontWeight',
                            },
                            value: fontWeight(
                              Decode.fontNumberToWeightMapping[
                                String(textStyle.fontWeight)
                              ]
                            ),
                          },
                        } as SwiftAST.SwiftNode,
                      ]
                    : []),
                  ...(textStyle.lineHeight
                    ? [
                        createLiteralArgument('lineHeight', {
                          type: 'FloatingPoint',
                          data: textStyle.lineHeight,
                        }),
                      ]
                    : []),
                  ...(textStyle.letterSpacing
                    ? [
                        createLiteralArgument('kerning', {
                          type: 'FloatingPoint',
                          data: textStyle.letterSpacing,
                        }),
                      ]
                    : []),
                  ...(textStyle.color
                    ? [
                        createLiteralArgument('color', {
                          type: 'Color',
                          data: textStyle.color,
                        }),
                      ]
                    : []),
                ],
              },
            }
          }
        }
      }

      return {
        type: 'FunctionCallExpression',
        data: {
          name: expression(node.data.expression, context),
          arguments: node.data.arguments
            .map<SwiftAST.SwiftNode | undefined>(arg => {
              if (arg.type === 'placeholder') {
                return undefined
              }
              return {
                type: 'FunctionCallArgument',
                data: {
                  name: arg.data.label
                    ? { type: 'SwiftIdentifier', data: arg.data.label }
                    : undefined,
                  value: expression(arg.data.expression, context),
                },
              }
            })
            .filter(nonNullable),
        },
      }
    }
    case 'placeholder': {
      context.helpers.reporter.warn('Placeholder expression remaining')
      return { type: 'Empty' }
    }
    case 'assignmentExpression':
      return {
        type: 'BinaryExpression',
        data: {
          left: expression(node.data.left, context),
          operator: '=',
          right: expression(node.data.right, context),
        },
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
): SwiftAST.SwiftNode => {
  switch (node.type) {
    case 'none': {
      return {
        type: 'LiteralExpression',
        data: { type: 'Nil', data: undefined },
      }
    }
    case 'boolean': {
      return {
        type: 'LiteralExpression',
        data: { type: 'Boolean', data: node.data.value },
      }
    }
    case 'number': {
      return {
        type: 'LiteralExpression',
        data: { type: 'FloatingPoint', data: node.data.value },
      }
    }
    case 'string': {
      return {
        type: 'LiteralExpression',
        data: { type: 'String', data: node.data.value },
      }
    }
    case 'color': {
      return {
        type: 'LiteralExpression',
        data: { type: 'Color', data: node.data.value },
      }
    }
    case 'array': {
      return {
        type: 'LiteralExpression',
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

const convertNativeType = (
  typeName: string,
  _context: LogicGenerationContext
): string => {
  switch (typeName) {
    case 'Boolean':
      return 'Bool'
    case 'Number':
      return 'CGFloat'
    case 'WholeNumber':
      return 'Int'
    case 'String':
      return 'String'
    case 'Optional':
      return 'Optional'
    case 'URL':
      return 'Image'
    case 'Color':
      return 'Color'
    default:
      return typeName
  }
}

const typeAnnotation = (
  node: LogicAST.TypeAnnotation | undefined,
  context: LogicGenerationContext
): SwiftAST.TypeAnnotation => {
  if (!node) {
    context.helpers.reporter.warn(
      'no type annotation when needed remaining in file'
    )
    return { type: 'TypeName', data: { name: '_', genericArguments: [] } }
  }
  switch (node.type) {
    case 'typeIdentifier': {
      const { identifier, genericArguments } = node.data

      return {
        type: 'TypeName',
        data: {
          name: convertNativeType(identifier.string, context),
          genericArguments: genericArguments.map(arg =>
            typeAnnotation(arg, context)
          ),
        },
      }
    }
    case 'placeholder': {
      context.helpers.reporter.warn('Type placeholder remaining in file')
      return { type: 'TypeName', data: { name: '_', genericArguments: [] } }
    }
    case 'functionType': {
      return {
        type: 'FunctionType',
        data: {
          arguments: node.data.argumentTypes
            .filter(x => x.type !== 'placeholder')
            .map(x => typeAnnotation(x, context)),
          returnType:
            node.data.returnType.type !== 'placeholder'
              ? typeAnnotation(node.data.returnType, context)
              : undefined,
        },
      }
    }
    default: {
      typeNever(node, context.helpers.reporter.warn)
      return { type: 'TypeName', data: { name: '_', genericArguments: [] } }
    }
  }
}

const genericParameter = (
  node: LogicAST.GenericParameter,
  context: LogicGenerationContext
): SwiftAST.TypeAnnotation => {
  switch (node.type) {
    case 'parameter': {
      return {
        type: 'TypeName',
        data: {
          name: convertNativeType(node.data.name.name, context),
          genericArguments: [],
        },
      }
    }
    case 'placeholder': {
      context.helpers.reporter.warn(
        'Generic type placeholder remaining in file'
      )
      return { type: 'TypeName', data: { name: '_', genericArguments: [] } }
    }
    default: {
      typeNever(node, context.helpers.reporter.warn)
      return { type: 'TypeName', data: { name: '_', genericArguments: [] } }
    }
  }
}
