import { LogicAST } from '@lona/serialization'
import * as S from './swiftAst'
import { EnumerationDeclaration } from '../../logic/nodes/EnumerationDeclaration'

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

export function createCodingKeysEnum(): S.SwiftNode[] {
  const typeCase: S.EnumCase = {
    type: 'EnumCase',
    data: {
      name: S.identifier('type'),
    },
  }

  const codingKeysEnum: S.EnumDeclaration = {
    type: 'EnumDeclaration',
    data: {
      name: 'CodingKeys',
      inherits: [
        { type: 'TypeName', data: { name: 'CodingKey', genericArguments: [] } },
      ],
      body: [typeCase],
      genericParameters: [],
      isIndirect: true,
    },
  }

  // new EnumerationDeclaration(node)

  return [codingKeysEnum]
}

export function createDecoder(
  declaration: EnumerationDeclaration
): S.SwiftNode[] {
  //=> let container = try decoder.container(keyedBy: CodingKeys.self)
  const container = S.constantDeclaration(
    'container',
    S.tryExpression(
      S.memberExpression([
        S.identifier('decoder'),
        S.functionCallExpression('container', [
          S.functionCallArgument(
            'keyedBy',
            S.memberExpression([
              S.identifier('CodingKeys'),
              S.identifier('self'),
            ])
          ),
        ]),
      ])
    )
  )

  //=> let type = try container.decode(String.self, forKey: .type)
  const type = S.constantDeclaration(
    'type',
    S.tryExpression(
      S.memberExpression([
        S.identifier('container'),
        S.functionCallExpression('decode', [
          S.functionCallArgument(
            undefined,
            S.memberExpression([S.identifier('String'), S.identifier('self')])
          ),
          S.functionCallArgument(
            'forKey',
            S.memberExpression([
              S.identifier('CodingKeys'),
              S.identifier('type'),
            ])
          ),
        ]),
      ])
    )
  )

  //=> let data = try decoder.singleValueContainer()
  const data = S.constantDeclaration(
    'data',
    S.tryExpression(
      S.memberExpression([
        S.identifier('decoder'),
        S.functionCallExpression('singleValueContainer'),
      ])
    )
  )
  //=> switch type {
  //=>   case "privateModifier":
  //=>     self = .privateModifier
  const switchStatement = S.switchStatement(S.identifier('type'), [
    ...declaration.cases.map(enumCase => {
      const {
        data: {
          name: { name },
        },
      } = enumCase

      return S.caseLabel(
        [S.expressionPattern(S.literalExpression(S.string(name)))],
        [
          S.binaryExpression(
            S.identifier('self'),
            '=',
            S.memberExpression([
              S.identifier(declaration.name),
              S.identifier(name),
            ])
          ),
        ]
      )
    }),
    S.defaultCaseLabel([
      S.functionCallExpression('fatalError', [
        S.literalExpression(S.string('Problem decoding')),
      ]),
    ]),
  ])

  //=> public init(from decoder: Decoder) throws
  const init = S.initializerDeclaration(
    [S.parameter('decoder', S.typeName('Decoder'), { externalName: 'from' })],
    [
      container,
      type,
      ...(declaration.hasAssociatedData ? [data] : []),
      switchStatement,
    ],
    { throws: true, modifiers: [S.DeclarationModifier.PublicModifier] }
  )

  return [init]
}

export function createEncoder(
  declaration: EnumerationDeclaration
): S.SwiftNode[] {
  //=> var container = encoder.container(keyedBy: CodingKeys.self)
  const container = S.variableDeclaration(
    'container',
    S.memberExpression([
      S.identifier('encoder'),
      S.functionCallExpression('container', [
        S.functionCallArgument(
          'keyedBy',
          S.memberExpression([S.identifier('CodingKeys'), S.identifier('self')])
        ),
      ]),
    ])
  )

  //=> switch self {
  //=> case .privateModifier:
  //=>   try container.encode("type", forKey: .type)
  const switchStatement = S.switchStatement(S.identifier('self'), [
    ...declaration.cases.map(enumCase => {
      const {
        data: {
          name: { name },
        },
      } = enumCase

      return S.caseLabel(
        [
          S.expressionPattern(
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
                S.literalExpression(S.string(name)),
                S.functionCallArgument(
                  'forKey',
                  S.memberExpression([
                    S.identifier('CodingKeys'),
                    S.identifier('type'),
                  ])
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
  node: LogicAST.EnumerationDeclaration
): S.SwiftNode[] {
  const declaration = new EnumerationDeclaration(node)

  return [
    ...createCodingKeysEnum(),
    ...createDecoder(declaration),
    ...createEncoder(declaration),
  ]
}
