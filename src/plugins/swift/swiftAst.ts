export enum AccessLevelModifier {
  PrivateModifier = 'PrivateModifier',
  FileprivateModifier = 'FileprivateModifier',
  InternalModifier = 'InternalModifier',
  PublicModifier = 'PublicModifier',
  OpenModifier = 'OpenModifier',
}

export enum MutationModifier {
  MutatingModifier = 'MutatingModifier',
  NonmutatingModifier = 'NonmutatingModifier',
}

export enum OtherModifier {
  ClassModifier = 'ClassModifier',
  ConvenienceModifier = 'ConvenienceModifier',
  DynamicModifier = 'DynamicModifier',
  FinalModifier = 'FinalModifier',
  InfixModifier = 'InfixModifier',
  LazyModifier = 'LazyModifier',
  OptionalModifier = 'OptionalModifier',
  OverrideModifier = 'OverrideModifier',
  PostfixModifier = 'PostfixModifier',
  PrefixModifier = 'PrefixModifier',
  RequiredModifier = 'RequiredModifier',
  StaticModifier = 'StaticModifier',
  UnownedModifier = 'UnownedModifier',
  UnownedSafeModifier = 'UnownedSafeModifier',
  UnownedUnsafeModifier = 'UnownedUnsafeModifier',
  WeakModifier = 'WeakModifier',
}

type Attribute = string

export type DeclarationModifier =
  | AccessLevelModifier
  | MutationModifier
  | OtherModifier
export const DeclarationModifier = {
  ...AccessLevelModifier,
  ...MutationModifier,
  ...OtherModifier,
}

export type Literal =
  | { type: 'Nil'; data: undefined }
  | { type: 'Boolean'; data: boolean }
  | { type: 'Integer'; data: number }
  | { type: 'FloatingPoint'; data: number }
  | { type: 'String'; data: string }
  | { type: 'Color'; data: string }
  | { type: 'Image'; data: string }
  | { type: 'Array'; data: SwiftNode[] }

export type TupleTypeElement = {
  elementName?: string
  annotation: TypeAnnotation
}

export type TypeAnnotation =
  | {
      type: 'TypeName'
      data: { name: string; genericArguments: TypeAnnotation[] }
    }
  | {
      type: 'TypeIdentifier'
      data: {
        name: TypeAnnotation
        member: TypeAnnotation
      }
    }
  | { type: 'ArrayType'; data: TypeAnnotation }
  | {
      type: 'DictionaryType'
      data: {
        key: TypeAnnotation
        value: TypeAnnotation
      }
    }
  | { type: 'OptionalType'; data: TypeAnnotation }
  | { type: 'TupleType'; data: TupleTypeElement[] }
  | {
      type: 'FunctionType'
      data: {
        arguments: TypeAnnotation[]
        returnType?: TypeAnnotation
      }
    }
  | { type: 'TypeInheritanceList'; data: { list: TypeAnnotation[] } }
  | { type: 'ProtocolCompositionType'; data: TypeAnnotation[] }

export type Pattern =
  | { type: 'WildcardPattern' }
  | {
      type: 'IdentifierPattern'
      data: {
        identifier: SwiftNode
        annotation?: TypeAnnotation
      }
    }
  | {
      type: 'ValueBindingPattern'
      data: {
        kind: string
        pattern: Pattern
      }
    }
  | { type: 'TuplePattern'; data: Pattern[] }
  | { type: 'OptionalPattern'; data: { value: Pattern } }
  | { type: 'ExpressionPattern'; data: { value: SwiftNode } }
  | {
      type: 'EnumCasePattern'
      data: {
        typeIdentifier?: string
        caseName: string
        tuplePattern?: Pattern
      }
    }
/* | IsPattern */
/* | AsPattern */

export type InitializerBlock =
  | { type: 'GetterBlock'; data: SwiftNode[] }
  | {
      type: 'GetterSetterBlock'
      data: {
        get: SwiftNode[]
        set: SwiftNode[]
      }
    }
  | {
      type: 'WillSetDidSetBlock'
      data: {
        willSet?: SwiftNode[]
        didSet?: SwiftNode[]
      }
    }

export type LiteralExpression = { type: 'LiteralExpression'; data: Literal }

export type MemberExpression = { type: 'MemberExpression'; data: SwiftNode[] }

export type TupleExpression = { type: 'TupleExpression'; data: SwiftNode[] }

export type BinaryExpression = {
  type: 'BinaryExpression'
  data: {
    left: SwiftNode
    operator: string
    right: SwiftNode
  }
}

export type PrefixExpression = {
  type: 'PrefixExpression'
  data: {
    operator: string
    expression: SwiftNode
  }
}

export type TryExpression = {
  type: 'TryExpression'
  data: {
    forced: boolean
    optional: boolean
    expression: SwiftNode
  }
}

export type ClassDeclaration = {
  type: 'ClassDeclaration'
  data: {
    name: string
    inherits: TypeAnnotation[]
    modifier?: AccessLevelModifier
    isFinal: boolean
    body: SwiftNode[]
  }
}

export type StructDeclaration = {
  type: 'StructDeclaration'
  data: {
    name: string
    inherits: TypeAnnotation[]
    modifier?: AccessLevelModifier
    body: SwiftNode[]
  }
}

export type EnumDeclaration = {
  type: 'EnumDeclaration'
  data: {
    name: string
    isIndirect: boolean
    genericParameters: TypeAnnotation[]
    inherits: TypeAnnotation[]
    modifier?: AccessLevelModifier
    body: SwiftNode[]
  }
}

export type TypealiasDeclaration = {
  type: 'TypealiasDeclaration'
  data: {
    name: string
    modifier?: AccessLevelModifier
    annotation: TypeAnnotation
  }
}

export type ExtensionDeclaration = {
  type: 'ExtensionDeclaration'
  data: {
    name: string
    protocols: TypeAnnotation[]
    where?: SwiftNode
    modifier?: AccessLevelModifier
    body: SwiftNode[]
  }
}

export type SwiftIdentifier = { type: 'SwiftIdentifier'; data: string }

export type ConstantDeclaration = {
  type: 'ConstantDeclaration'
  data: {
    modifiers: DeclarationModifier[]
    pattern: Pattern
    init?: SwiftNode
  }
}

export type VariableDeclaration = {
  type: 'VariableDeclaration'
  data: {
    modifiers: DeclarationModifier[]
    pattern: Pattern
    init?: SwiftNode
    block?: InitializerBlock
  }
}

export type InitializerDeclaration = {
  type: 'InitializerDeclaration'
  data: {
    modifiers: DeclarationModifier[]
    parameters: SwiftNode[]
    failable?: string
    throws: boolean
    body: SwiftNode[]
  }
}

export type DeinitializerDeclaration = {
  type: 'DeinitializerDeclaration'
  data: SwiftNode[]
}

export type FunctionDeclaration = {
  type: 'FunctionDeclaration'
  data: {
    name: string
    attributes: Attribute[]
    modifiers: DeclarationModifier[]
    parameters: SwiftNode[]
    result?: TypeAnnotation
    body: SwiftNode[]
    throws: boolean
  }
}

export type ImportDeclaration = { type: 'ImportDeclaration'; data: string }

export type IfStatement = {
  type: 'IfStatement'
  data: {
    condition: SwiftNode
    block: SwiftNode[]
  }
}

export type WhileStatement = {
  type: 'WhileStatement'
  data: {
    condition: SwiftNode
    block: SwiftNode[]
  }
}

export type ForInStatement = {
  type: 'ForInStatement'
  data: {
    item: Pattern
    collection: SwiftNode
    block: SwiftNode[]
  }
}

export type SwitchStatement = {
  type: 'SwitchStatement'
  data: {
    expression: SwiftNode
    cases: SwiftNode[]
  }
}

export type CaseLabel = {
  type: 'CaseLabel'
  data: {
    patterns: Pattern[]
    statements: SwiftNode[]
  }
}

export type DefaultCaseLabel = {
  type: 'DefaultCaseLabel'
  data: { statements: SwiftNode[] }
}

export type ReturnStatement = { type: 'ReturnStatement'; data?: SwiftNode }

export type Parameter = {
  type: 'Parameter'
  data: {
    externalName?: string
    localName: string
    annotation: TypeAnnotation
    defaultValue?: SwiftNode
  }
}

export type FunctionCallArgument = {
  type: 'FunctionCallArgument'
  data: { name?: SwiftNode; value: SwiftNode }
}

export type FunctionCallExpression = {
  type: 'FunctionCallExpression'
  data: { name: SwiftNode; arguments: SwiftNode[] }
}

export type EnumCase = {
  type: 'EnumCase'
  data: { name: SwiftNode; parameters?: TypeAnnotation; value?: SwiftNode }
}

export type ConditionList = { type: 'ConditionList'; data: SwiftNode[] }

export type OptionalBindingCondition = {
  type: 'OptionalBindingCondition'
  data: { const: boolean; pattern: Pattern; init: SwiftNode }
}

export type CaseCondition = {
  type: 'CaseCondition'
  data: { pattern: Pattern; init: SwiftNode }
}

export type Empty = { type: 'Empty' }

export type LineComment = { type: 'LineComment'; data: string }

export type DocComment = { type: 'DocComment'; data: string }

export type LineEndComment = {
  type: 'LineEndComment'
  data: { comment: string; line: SwiftNode }
}

export type CodeBlock = { type: 'CodeBlock'; data: { statements: SwiftNode[] } }

export type StatementListHelper = {
  type: 'StatementListHelper'
  data: SwiftNode[]
}

export type TopLevelDeclaration = {
  type: 'TopLevelDeclaration'
  data: { statements: SwiftNode[] }
}

export type SwiftNode =
  | LiteralExpression
  | MemberExpression
  | TupleExpression
  | BinaryExpression
  | PrefixExpression
  | TryExpression
  | ClassDeclaration
  | StructDeclaration
  | EnumDeclaration
  | TypealiasDeclaration
  | ExtensionDeclaration
  | SwiftIdentifier
  | ConstantDeclaration
  | VariableDeclaration
  | InitializerDeclaration
  | DeinitializerDeclaration
  | FunctionDeclaration
  | ImportDeclaration
  | IfStatement
  | WhileStatement
  | ForInStatement
  | SwitchStatement
  | CaseLabel
  | DefaultCaseLabel
  | ReturnStatement
  | Parameter
  | FunctionCallArgument
  | FunctionCallExpression
  | EnumCase
  | ConditionList
  | OptionalBindingCondition
  | CaseCondition
  | Empty
  | LineComment
  | DocComment
  | LineEndComment
  | CodeBlock
  | StatementListHelper
  | TopLevelDeclaration

export function enumDeclaration(
  name: string,
  options: {
    isIndirect?: boolean
    genericParameters?: TypeAnnotation[]
    inherits?: TypeAnnotation[]
    modifier?: AccessLevelModifier
  },
  body: SwiftNode[]
): EnumDeclaration {
  return {
    type: 'EnumDeclaration',
    data: {
      name,
      isIndirect: options.isIndirect ?? false,
      genericParameters: options.genericParameters ?? [],
      inherits: options.inherits ?? [],
      modifier: options.modifier,
      body,
    },
  }
}

export function structDeclaration(
  name: string,
  options: {
    isIndirect?: boolean
    genericParameters?: TypeAnnotation[]
    inherits?: TypeAnnotation[]
    modifier?: AccessLevelModifier
  },
  body: SwiftNode[]
): StructDeclaration {
  return {
    type: 'StructDeclaration',
    data: {
      name,
      inherits: options.inherits ?? [],
      modifier: options.modifier,
      body,
    },
  }
}

export function identifier(name: string): SwiftIdentifier {
  return { type: 'SwiftIdentifier', data: name }
}

export function tryExpression(
  expression: SwiftNode,
  options: { forced?: boolean; optional?: boolean } = {}
): TryExpression {
  return {
    type: 'TryExpression',
    data: {
      forced: options.forced ?? false,
      optional: options.optional ?? false,
      expression: expression,
    },
  }
}

export function functionCallExpression(
  name: string | SwiftNode,
  args: SwiftNode[] = []
): FunctionCallExpression {
  return {
    type: 'FunctionCallExpression',
    data: {
      name: typeof name === 'string' ? identifier(name) : name,
      arguments: args,
    },
  }
}

export function functionCallArgument(
  name: string | undefined,
  value: SwiftNode
): FunctionCallArgument {
  return {
    type: 'FunctionCallArgument',
    data: {
      ...(name && { name: identifier(name) }),
      value,
    },
  }
}

export function memberExpression(nodes: SwiftNode[]): MemberExpression {
  return {
    type: 'MemberExpression',
    data: nodes,
  }
}

export function literalExpression(literal: Literal): LiteralExpression {
  return {
    type: 'LiteralExpression',
    data: literal,
  }
}

export function binaryExpression(
  left: SwiftNode,
  operator: string,
  right: SwiftNode
): BinaryExpression {
  return {
    type: 'BinaryExpression',
    data: {
      left,
      operator,
      right,
    },
  }
}

export function constantDeclaration(
  name: string,
  expression?: SwiftNode,
  options: {
    typeAnnotation?: TypeAnnotation
    modifiers?: DeclarationModifier[]
  } = {}
): ConstantDeclaration {
  return {
    type: 'ConstantDeclaration',
    data: {
      pattern: {
        type: 'IdentifierPattern',
        data: {
          identifier: identifier(name),
          ...(options.typeAnnotation && { annotation: options.typeAnnotation }),
        },
      },
      modifiers: options.modifiers ?? [],
      init: expression,
    },
  }
}

export function variableDeclaration(
  name: string,
  expression: SwiftNode,
  options: {
    typeAnnotation?: TypeAnnotation
    modifiers?: DeclarationModifier[]
  } = {}
): VariableDeclaration {
  return {
    type: 'VariableDeclaration',
    data: {
      pattern: {
        type: 'IdentifierPattern',
        data: {
          identifier: identifier(name),
          ...(options.typeAnnotation && { annotation: options.typeAnnotation }),
        },
      },
      modifiers: options.modifiers ?? [],
      init: expression,
    },
  }
}

export function parameter(
  name: string,
  typeAnnotation: TypeAnnotation,
  options: {
    defaultValue?: SwiftNode
    externalName?: string
  } = {}
): Parameter {
  return {
    type: 'Parameter',
    data: {
      localName: name,
      annotation: typeAnnotation,
      externalName: options.externalName,
      defaultValue: options.defaultValue,
    },
  }
}

export function functionDeclaration(
  name: string,
  parameters: Parameter[],
  returnType: TypeAnnotation | undefined,
  body: SwiftNode[],
  options: {
    typeAnnotation?: TypeAnnotation
    modifiers?: DeclarationModifier[]
    attributes?: Attribute[]
    throws?: boolean
  } = {}
): FunctionDeclaration {
  return {
    type: 'FunctionDeclaration',
    data: {
      name,
      body,
      parameters,
      attributes: options.attributes ?? [],
      modifiers: options.modifiers ?? [],
      throws: options.throws ?? false,
      result: returnType,
    },
  }
}

export function initializerDeclaration(
  parameters: Parameter[],
  body: SwiftNode[],
  options: {
    typeAnnotation?: TypeAnnotation
    modifiers?: DeclarationModifier[]
    attributes?: Attribute[]
    throws?: boolean
    failable?: string
  } = {}
): InitializerDeclaration {
  return {
    type: 'InitializerDeclaration',
    data: {
      body,
      parameters,
      modifiers: options.modifiers ?? [],
      throws: options.throws ?? false,
      failable: options.failable,
    },
  }
}

export function typeName(
  name: string,
  genericArguments: TypeAnnotation[] = []
): TypeAnnotation {
  return {
    type: 'TypeName',
    data: { name, genericArguments },
  }
}

export function switchStatement(
  expression: SwiftNode,
  cases: (CaseLabel | DefaultCaseLabel)[]
): SwitchStatement {
  return {
    type: 'SwitchStatement',
    data: {
      expression,
      cases,
    },
  }
}

export function caseCondition(
  pattern: Pattern,
  init: SwiftNode
): CaseCondition {
  return {
    type: 'CaseCondition',
    data: { pattern, init },
  }
}

export function caseLabel(
  patterns: Pattern[],
  statements: SwiftNode[]
): CaseLabel {
  return {
    type: 'CaseLabel',
    data: {
      patterns,
      statements,
    },
  }
}

export function enumCase(
  name: string,
  typeAnnotation?: TypeAnnotation
): EnumCase {
  return {
    type: 'EnumCase',
    data: {
      name: identifier(name),
      parameters: typeAnnotation,
    },
  }
}

export function defaultCaseLabel(
  statements: SwiftNode[] = []
): DefaultCaseLabel {
  return {
    type: 'DefaultCaseLabel',
    data: {
      statements,
    },
  }
}

export function identifierPattern(
  name: string,
  annotation?: TypeAnnotation
): Pattern {
  return {
    type: 'IdentifierPattern',
    data: { identifier: identifier(name), annotation },
  }
}

export function expressionPattern(expression: SwiftNode): Pattern {
  return { type: 'ExpressionPattern', data: { value: expression } }
}

export function tuplePattern(patterns: Pattern[]): Pattern {
  return { type: 'TuplePattern', data: patterns }
}

export function valueBindingPattern(
  pattern: Pattern,
  options: { kind?: string } = {}
): Pattern {
  return {
    type: 'ValueBindingPattern',
    data: {
      kind: options.kind || 'let',
      pattern,
    },
  }
}

export function enumCasePattern(
  typeIdentifier: string | undefined,
  name: string,
  tuplePattern: Pattern
): Pattern {
  return {
    type: 'EnumCasePattern',
    data: {
      caseName: name,
      tuplePattern,
      typeIdentifier,
    },
  }
}

export function nil(data: undefined): Literal {
  return { type: 'Nil', data }
}

export function boolean(data: boolean): Literal {
  return { type: 'Boolean', data }
}

export function integer(data: number): Literal {
  return { type: 'Integer', data }
}

export function floatingPoint(data: number): Literal {
  return { type: 'FloatingPoint', data }
}

export function string(data: string): Literal {
  return { type: 'String', data }
}

export function color(data: string): Literal {
  return { type: 'Color', data }
}

export function image(data: string): Literal {
  return { type: 'Image', data }
}

export function array(data: SwiftNode[]): Literal {
  return { type: 'Array', data }
}
