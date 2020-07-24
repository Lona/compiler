import { StaticType } from '../staticType'
import { Value } from './value'

export type RecordMemory = { [key: string]: Value }

export type DefaultArguments = {
  [key: string]: [StaticType, Value | void]
}

export type FuncImplementation = (args: RecordMemory) => Memory

export type FuncMemory = {
  f: FuncImplementation
  defaultArguments: DefaultArguments
}

export type Memory =
  | { type: 'unit' }
  | { type: 'bool'; value: boolean }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'array'; value: Value[] }
  | { type: 'enum'; value: string; data: Value[] }
  | { type: 'record'; value: RecordMemory }
  | {
      type: 'function'
      value: FuncMemory
    }

export const unit = (): Memory => ({ type: 'unit' })

export const bool = (value: boolean): Memory => ({ type: 'bool', value })

export const number = (value: number): Memory => ({ type: 'number', value })

export const string = (value: string): Memory => ({ type: 'string', value })

export const array = (value: Value[]): Memory => ({ type: 'array', value })
