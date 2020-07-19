export type FunctionArgument = {
  label?: string
  type: StaticType
}

export type Variable = {
  type: 'variable'
  value: string
}

export type Constructor = {
  type: 'constructor'
  name: string
  parameters: StaticType[]
}

export type Generic = {
  type: 'generic'
  name: string
}

export type Function = {
  type: 'function'
  arguments: FunctionArgument[]
  returnType: StaticType
}

export type StaticType = Variable | Constructor | Generic | Function

export const unit: Constructor = {
  type: 'constructor',
  name: 'Void',
  parameters: [],
}

export const bool: Constructor = {
  type: 'constructor',
  name: 'Boolean',
  parameters: [],
}

export const number: Constructor = {
  type: 'constructor',
  name: 'Number',
  parameters: [],
}

export const string: Constructor = {
  type: 'constructor',
  name: 'String',
  parameters: [],
}

export const color: Constructor = {
  type: 'constructor',
  name: 'Color',
  parameters: [],
}

export const shadow: Constructor = {
  type: 'constructor',
  name: 'Shadow',
  parameters: [],
}

export const textStyle: Constructor = {
  type: 'constructor',
  name: 'TextStyle',
  parameters: [],
}

export const optional = (type: StaticType): Constructor => ({
  type: 'constructor',
  name: 'Optional',
  parameters: [type],
})

export const array = (typeUnification: StaticType): Constructor => ({
  type: 'constructor',
  name: 'Array',
  parameters: [typeUnification],
})
