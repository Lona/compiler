export type FunctionArgument = {
  label?: string
  type: StaticType
}

export type Variable = {
  type: 'variable'
  value: string
}

export type Constructor = {
  type: 'constant'
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
  type: 'constant',
  name: 'Void',
  parameters: [],
}

export const bool: Constructor = {
  type: 'constant',
  name: 'Boolean',
  parameters: [],
}

export const number: Constructor = {
  type: 'constant',
  name: 'Number',
  parameters: [],
}

export const string: Constructor = {
  type: 'constant',
  name: 'String',
  parameters: [],
}

export const color: Constructor = {
  type: 'constant',
  name: 'Color',
  parameters: [],
}

export const shadow: Constructor = {
  type: 'constant',
  name: 'Shadow',
  parameters: [],
}

export const textStyle: Constructor = {
  type: 'constant',
  name: 'TextStyle',
  parameters: [],
}

export const optional = (type: StaticType): Constructor => ({
  type: 'constant',
  name: 'Optional',
  parameters: [type],
})

export const array = (typeUnification: StaticType): Constructor => ({
  type: 'constant',
  name: 'Array',
  parameters: [typeUnification],
})
