export type Reference = 'URL' | 'Color' | string

export type Named = {
  name: 'Named'
  alias: string
  of: UserType
}

export type ResolvedEnum = {
  name: 'Enum' | 'Variant'
  cases: { tag: string; ltype: UserType }[]
}

export type Enum = {
  name: 'Enum' | 'Variant'
  cases?: (string | undefined)[]
  case?: string
  type?: UserType
}

export type Function = {
  name: 'Function'
  parameters?: { label: string; ltype: UserType }[]
  returnType?: UserType
}

export type Array = {
  name: 'Array'
  of: UserType
}

export type UserType = Reference | Named | Enum | Function | Array

export type TypesFile = {
  types: UserType[]
}

export function dereference(x: Reference): Reference | Named {
  if (x === 'URL') {
    return {
      name: 'Named',
      alias: 'URL',
      of: 'String',
    }
  }
  if (x === 'Color') {
    return {
      name: 'Named',
      alias: 'Color',
      of: 'String',
    }
  }
  return x
}

export function resolveEnum(x: Enum): ResolvedEnum {
  return {
    name: x.name,
    cases: x.cases
      ? x.cases.map(y => {
          if (y) {
            return { tag: y, ltype: 'Unit' }
          }
          if (x.case && x.type) {
            return { tag: x.case, ltype: x.type }
          }
          throw new Error('missing tag name')
        })
      : [],
  }
}
