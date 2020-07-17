export enum binaryOperator {
  Eq,
  LooseEq,
  Neq,
  LooseNeq,
  Gt,
  Gte,
  Lt,
  Lte,
  Plus,
  Minus,
  And,
  Or,
  Noop,
}

/* Types */
type InterfaceDeclaration = {
  type: 'interfaceDeclaration'
  data: {
    identifier: string
    typeParameters: JSType[]
    objectType: ObjectType
  }
}

type TypeAliasDeclaration = {
  type: 'typeAliasDeclaration'
  data: {
    identifier: string
    typeParameters: JSType[]
    type: JSType
  }
}

export type JSType =
  | { type: 'LiteralType'; data: string }
  | { type: 'UnionType'; data: JSType[] }
  /*   | IntersectionType
            | FunctionType
            | ConstructorType
            | ParenthesizedType
       | PredefinedType(predefinedType)*/
  | { type: 'TypeReference'; data: TypeReference }
  | { type: 'ObjectType'; data: ObjectType }
  /* | ArrayType */
  | { type: 'TupleType'; data: JSType[] }
/* | TypeQuery
   | ThisType */
/* and predefinedType =
   | Any
   | Number
   | Boolean
   | String
   | Symbol
   | Void */

export type ObjectType = { members: TypeMember[] }

export type TypeReference = {
  name: string
  arguments: JSType[]
}

type TypeMember = { type: 'PropertySignature'; data: PropertySignature }

type PropertySignature = {
  name: string
  type?: JSType
}

/* JS */
type ImportDeclaration = {
  source: string
  specifiers: { type: 'ImportSpecifier'; data: ImportSpecifier }[]
}
type ImportSpecifier = {
  imported: string
  local?: string
}
type ClassDeclaration = {
  id: string
  superClass?: string
  body: JSNode[]
}
type MethodDefinition = {
  key: string
  value: JSNode
}
type FunctionExpression = {
  id?: string
  params: JSNode[]
  body: JSNode[]
}
type CallExpression = {
  callee: JSNode
  arguments: JSNode[]
}
type MemberExpression = {
  memberName: string
  expression: JSNode
}
type JSXAttribute = {
  name: string
  value: JSNode
}
type JSXElement = {
  tag: string
  attributes: JSNode[]
  content: JSNode[]
}
type AssignmentExpression = {
  left: JSNode
  right: JSNode
}
type BinaryExpression = {
  left: JSNode
  operator: binaryOperator
  right: JSNode
}
type UnaryExpression = {
  prefix: boolean
  operator: string
  argument: JSNode
}
type IfStatement = {
  test: JSNode
  consequent: JSNode[]
  alternate: JSNode[]
}
type WhileStatement = {
  test: JSNode
  body: JSNode[]
}
type ConditionalExpression = {
  test: JSNode
  consequent: JSNode
  alternate: JSNode
}
type Property = {
  key: JSNode
  value?: JSNode
}
type LineEndComment = {
  comment: string
  line: JSNode
}

export type Literal =
  | { type: 'Null'; data: undefined }
  | { type: 'Undefined'; data: undefined }
  | { type: 'Boolean'; data: boolean }
  | { type: 'Number'; data: number }
  | { type: 'String'; data: string }
  | { type: 'Color'; data: string }
  | { type: 'Image'; data: string }
  | { type: 'Array'; data: JSNode[] }
  | { type: 'Object'; data: JSNode[] }

export type JSNode =
  /* Types */
  | { type: 'InterfaceDeclaration'; data: InterfaceDeclaration }
  | { type: 'TypeAliasDeclaration'; data: TypeAliasDeclaration }
  /* JS */
  | { type: 'Return'; data: JSNode }
  | { type: 'Literal'; data: Literal }
  | { type: 'Identifier'; data: string[] }
  | { type: 'ImportDeclaration'; data: ImportDeclaration }
  | { type: 'ClassDeclaration'; data: ClassDeclaration }
  | { type: 'MethodDefinition'; data: MethodDefinition }
  | { type: 'FunctionExpression'; data: FunctionExpression }
  | { type: 'ArrowFunctionExpression'; data: FunctionExpression }
  | { type: 'CallExpression'; data: CallExpression }
  | { type: 'MemberExpression'; data: MemberExpression }
  | { type: 'JSXAttribute'; data: JSXAttribute }
  | { type: 'JSXElement'; data: JSXElement }
  | { type: 'JSXExpressionContainer'; data: JSNode }
  | { type: 'JSXSpreadAttribute'; data: JSNode }
  | { type: 'SpreadElement'; data: JSNode }
  | { type: 'VariableDeclaration'; data: JSNode }
  | { type: 'AssignmentExpression'; data: AssignmentExpression }
  | { type: 'BinaryExpression'; data: BinaryExpression }
  | { type: 'UnaryExpression'; data: UnaryExpression }
  | { type: 'IfStatement'; data: IfStatement }
  | { type: 'WhileStatement'; data: WhileStatement }
  | { type: 'ConditionalExpression'; data: ConditionalExpression }
  | { type: 'Property'; data: Property }
  | {
      type: 'ExportNamedDeclaration'
      data: { type: 'AssignmentExpression'; data: AssignmentExpression }
    }
  | { type: 'Program'; data: JSNode[] }
  | { type: 'LineEndComment'; data: LineEndComment }
  | { type: 'Empty' }
  | { type: 'Unknown' }
