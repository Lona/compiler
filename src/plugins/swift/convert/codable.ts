import { LogicAST } from '@lona/serialization'
import * as S from '../swiftAst'
import { EnumerationDeclaration } from '../../../logic/nodes/EnumerationDeclaration'
import { isNode } from '../../../logic/ast'
import { convertNativeType } from './nativeType'
import { LogicGenerationContext } from './LogicGenerationContext'
import upperFirst from 'lodash.upperfirst'

function valueBindingName(
  node: Extract<LogicAST.AssociatedValue, { type: 'associatedValue' }>,
  index: number,
  total: number
): string {
  return node.data.label?.name ?? total > 1 ? `value${index}` : 'value'
}

function convertTypeAnnotation(
  node: LogicAST.TypeAnnotation,
  context: LogicGenerationContext
): S.TypeAnnotation {
  switch (node.type) {
    case 'typeIdentifier':
      return S.typeName(
        convertNativeType(node.data.identifier.string, context),
        node.data.genericArguments.map(genericArgument =>
          convertTypeAnnotation(genericArgument, context)
        )
      )
    default:
      throw new Error('Unhandled Logic type')
  }
}

function associatedValueToType(
  node: Extract<LogicAST.AssociatedValue, { type: 'associatedValue' }>,
  context: LogicGenerationContext
): S.TypeAnnotation {
  const { annotation } = node.data

  return convertTypeAnnotation(annotation, context)
}

export function isCodable(
  node: LogicAST.EnumerationDeclaration | LogicAST.RecordDeclaration
): boolean {
  const { attributes } = node.data

  const isCodable = !!attributes.find(
    attribute =>
      attribute.data.expression.type === 'identifierExpression' &&
      attribute.data.expression.data.identifier.string === 'codable'
  )

  return isCodable
}

export function createUtilityTypes(
  declaration: EnumerationDeclaration,
  context: LogicGenerationContext
): S.SwiftNode[] {
  const cases: S.EnumCase[] = declaration.cases.map(enumCase =>
    S.enumCase(enumCase.data.name.name)
  )

  const typeNameEnum: S.SwiftNode = S.enumDeclaration(
    `_${declaration.name}Type`,
    {
      inherits: [S.typeName('String'), S.typeName('Codable')],
      modifier: S.AccessLevelModifier.FileprivateModifier,
    },
    cases
  )

  const typeContainer: S.SwiftNode = S.structDeclaration(
    `_TypeContainer`,
    {
      inherits: [S.typeName('Codable')],
      modifier: S.AccessLevelModifier.FileprivateModifier,
    },
    [
      S.constantDeclaration('type', undefined, {
        typeAnnotation: S.typeName(`_${declaration.name}Type`),
      }),
    ]
  )

  const associatedValueTypes: S.SwiftNode[] = declaration.cases.map(enumCase =>
    S.structDeclaration(
      `_${upperFirst(enumCase.data.name.name)}`,
      {
        inherits: [S.typeName('Codable')],
        modifier: S.AccessLevelModifier.FileprivateModifier,
      },
      [
        S.constantDeclaration('type', undefined, {
          typeAnnotation: S.typeName(`_${declaration.name}Type`),
        }),
        ...enumCase.data.associatedValues
          .filter(isNode)
          .map((associatedValue, index, array) =>
            S.constantDeclaration(
              valueBindingName(associatedValue, index, array.length),
              undefined,
              {
                typeAnnotation: associatedValueToType(associatedValue, context),
              }
            )
          ),
      ]
    )
  )

  return [typeNameEnum, typeContainer, ...associatedValueTypes]
}

export function createDecoder(
  declaration: EnumerationDeclaration,
  context: LogicGenerationContext
): S.SwiftNode[] {
  //=> let container = try decoder.singleValueContainer()
  const container = S.constantDeclaration(
    'container',
    S.tryExpression(
      S.memberExpression([
        S.identifier('decoder'),
        S.functionCallExpression('singleValueContainer'),
      ])
    )
  )

  //=> try container.decode(_TypeContainer.self).type
  const type = S.memberExpression([
    S.tryExpression(
      S.memberExpression([
        S.identifier('container'),
        S.functionCallExpression('decode', [
          S.functionCallArgument(
            undefined,
            S.memberExpression([
              S.identifier(`_TypeContainer`),
              S.identifier('self'),
            ])
          ),
        ]),
      ])
    ),
    S.identifier('type'),
  ])

  //=> switch type {
  //=>   case _AccessLevelModifierType.privateModifier:
  //=>     self = AccessLevelModifier.privateModifier
  const switchStatement = S.switchStatement(type, [
    ...declaration.cases.map(enumCase => {
      const {
        name: { name },
      } = enumCase.data

      //=> let data = try try container.decode(_PrivateModifier.self)
      const decoded = S.constantDeclaration(
        'decoded',
        S.tryExpression(
          S.memberExpression([
            S.identifier('container'),
            S.functionCallExpression('decode', [
              S.memberExpression([
                S.identifier(`_${upperFirst(enumCase.data.name.name)}`),
                S.identifier('self'),
              ]),
            ]),
          ])
        )
      )

      const member = S.memberExpression([
        S.identifier(declaration.name),
        S.identifier(name),
      ])

      const associatedValues = enumCase.data.associatedValues.filter(isNode)

      const value =
        associatedValues.length > 0
          ? S.functionCallExpression(
              member,
              associatedValues.map((associatedValue, index, array) =>
                S.memberExpression([
                  S.identifier('decoded'),
                  S.identifier(
                    valueBindingName(associatedValue, index, array.length)
                  ),
                ])
              )
            )
          : member

      return S.caseLabel(
        [
          S.expressionPattern(
            S.memberExpression([
              S.identifier(`_${declaration.name}Type`),
              S.identifier(name),
            ])
          ),
        ],
        [
          ...(associatedValues.length > 0 ? [decoded] : []),
          S.binaryExpression(S.identifier('self'), '=', value),
        ]
      )
    }),
  ])

  //=> public init(from decoder: Decoder) throws
  const init = S.initializerDeclaration(
    [S.parameter('decoder', S.typeName('Decoder'), { externalName: 'from' })],
    [container, switchStatement],
    { throws: true, modifiers: [S.DeclarationModifier.PublicModifier] }
  )

  return [init]
}

export function createEncoder(
  declaration: EnumerationDeclaration,
  context: LogicGenerationContext
): S.SwiftNode[] {
  //=> var container = encoder.singleValueContainer()
  const container = S.variableDeclaration(
    'container',
    S.memberExpression([
      S.identifier('encoder'),
      S.functionCallExpression('singleValueContainer'),
    ])
  )

  //=> switch self {
  //=> case AccessLevelModifier.privateModifier:
  //=>   try container.encode("type", forKey: .type)
  const switchStatement = S.switchStatement(S.identifier('self'), [
    ...declaration.cases.map(enumCase => {
      const {
        name: { name },
      } = enumCase.data

      const associatedValues = enumCase.data.associatedValues.filter(isNode)

      return S.caseLabel(
        [
          associatedValues.length > 0
            ? S.enumCasePattern(
                declaration.name,
                name,
                S.tuplePattern(
                  associatedValues.map((associatedValue, index) =>
                    S.valueBindingPattern(
                      S.identifierPattern(
                        valueBindingName(
                          associatedValue,
                          index,
                          associatedValues.length
                        )
                      )
                    )
                  )
                )
              )
            : S.expressionPattern(
                S.memberExpression([
                  S.identifier(declaration.name),
                  S.identifier(name),
                ])
              ),
        ],
        [
          S.tryExpression(
            S.memberExpression([
              S.identifier('container'),
              S.functionCallExpression('encode', [
                S.functionCallExpression(
                  `_${upperFirst(enumCase.data.name.name)}`,
                  [
                    S.functionCallArgument(
                      'type',
                      S.memberExpression([
                        S.identifier(`_${declaration.name}Type`),
                        S.identifier(name),
                      ])
                    ),
                    ...associatedValues.map((associatedValue, index) => {
                      let label = valueBindingName(
                        associatedValue,
                        index,
                        associatedValues.length
                      )

                      return S.functionCallArgument(label, S.identifier(label))
                    }),
                  ]
                ),
              ]),
            ])
          ),
        ]
      )
    }),
  ])

  //=> public func encode(to encoder: Encoder) throws
  const encode = S.functionDeclaration(
    'encode',
    [S.parameter('encoder', S.typeName('Encoder'), { externalName: 'to' })],
    undefined,
    [container, switchStatement],
    { throws: true, modifiers: [S.DeclarationModifier.PublicModifier] }
  )

  return [encode]
}

export function createCodableImplementation(
  node: LogicAST.EnumerationDeclaration,
  context: LogicGenerationContext
): S.SwiftNode[] {
  const declaration = new EnumerationDeclaration(node)

  return [
    ...createUtilityTypes(declaration, context),
    ...createDecoder(declaration, context),
    ...createEncoder(declaration, context),
  ]
}
