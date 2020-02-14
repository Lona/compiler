// ⚠️ THIS FILE IS AUTO GENERATED. DO NOT MODIFY IT.

import { AST as LogicAST, flattenedMemberExpression } from './logic-ast'
import { EvaluationContext } from './logic-evaluate'

export type HardcodedMap<T, U extends any[]> = {
  functionCallExpression: {
    'Color.setHue': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Color.setSaturation': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Color.setLightness': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Color.fromHSL': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Color.saturate': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Boolean.or': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Boolean.and': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Number.range': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'String.concat': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Array.at': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Optional.value': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'Optional.none': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    Shadow: (node: LogicAST.FunctionCallExpression, ...args: U) => T | undefined
    'FontWeight.ultraLight': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.thin': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.light': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.regular': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.medium': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.semibold': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.bold': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.heavy': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.black': (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
    TextStyle: (
      node: LogicAST.FunctionCallExpression,
      ...args: U
    ) => T | undefined
  }
  memberExpression: {
    'FontWeight.w100': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.w200': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.w300': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.w400': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.w500': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.w600': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.w700': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.w800': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
    'FontWeight.w900': (
      node: LogicAST.MemberExpression,
      ...args: U
    ) => T | undefined
  }
}

export const isHardcodedMapCall = {
  functionCallExpression: <T, U extends any[]>(
    k: string,
    map: HardcodedMap<T, U>
  ): k is keyof HardcodedMap<T, U>['functionCallExpression'] => {
    return k in map.functionCallExpression
  },
  memberExpression: <T, U extends any[]>(
    k: string,
    map: HardcodedMap<T, U>
  ): k is keyof HardcodedMap<T, U>['memberExpression'] => {
    return k in map.memberExpression
  },
}

export const createStandardLibraryResolver = <T, U extends any[]>(
  hardcodedMap: HardcodedMap<T, U>
) => (
  node: LogicAST.SyntaxNode,
  evaluationContext: undefined | EvaluationContext,
  ...args: U
): T | undefined => {
  if (!evaluationContext) {
    return undefined
  }

  let matchedHardcodedNode: T | undefined

  if (node.type === 'functionCallExpression') {
    let memberExpression = node.data.expression

    if (!evaluationContext.isFromStandardLibrary(memberExpression.data.id)) {
      return
    }

    const path = (flattenedMemberExpression(memberExpression) || [])
      .map(y => y.string)
      .join('.')

    if (isHardcodedMapCall.functionCallExpression(path, hardcodedMap)) {
      matchedHardcodedNode = hardcodedMap.functionCallExpression[path](
        node,
        ...args
      )
    }
  }

  if (node.type === 'memberExpression') {
    let memberExpression = node

    if (!evaluationContext.isFromStandardLibrary(memberExpression.data.id)) {
      return
    }

    const path = (flattenedMemberExpression(memberExpression) || [])
      .map(y => y.string)
      .join('.')

    if (isHardcodedMapCall.memberExpression(path, hardcodedMap)) {
      matchedHardcodedNode = hardcodedMap.memberExpression[path](node, ...args)
    }
  }

  return matchedHardcodedNode
}
