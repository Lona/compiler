import intersection from 'lodash.intersection'
import { MultiMap } from './multiMap'
import { StaticType } from './staticType'
import { Reporter } from '../utils/reporter'
import { assertNever, nonNullable } from '../utils/typeHelpers'

export type Constraint = {
  head: StaticType
  tail: StaticType
  origin?: any
}

export type Substitution = MultiMap<StaticType, StaticType>

export function substitute(
  substitution: Substitution,
  type: StaticType
): StaticType {
  let resolvedType = substitution.get(type)
  if (!resolvedType) {
    resolvedType = type
  }

  if (resolvedType.type === 'variable' || resolvedType.type === 'generic') {
    return resolvedType
  }

  if (resolvedType.type === 'constructor') {
    return {
      type: 'constructor',
      name: resolvedType.name,
      parameters: resolvedType.parameters.map(x => substitute(substitution, x)),
    }
  }

  if (resolvedType.type === 'function') {
    return {
      type: 'function',
      returnType: substitute(substitution, resolvedType.returnType),
      arguments: resolvedType.arguments.map(arg => ({
        label: arg.label,
        type: substitute(substitution, arg.type),
      })),
    }
  }

  assertNever(resolvedType)
}

export const unify = (
  constraints: Constraint[],
  reporter: Reporter,
  substitution: Substitution = new MultiMap()
): Substitution => {
  while (constraints.length > 0) {
    const constraint = constraints.shift()
    if (!constraint) {
      // that's not possible, so it's just for TS
      continue
    }
    let { head, tail } = constraint

    if (head == tail) {
      continue
    }

    if (head.type === 'function' && tail.type === 'function') {
      const headArguments = head.arguments
      const tailArguments = tail.arguments
      const headContainsLabels = headArguments.some(x => x.label)
      const tailContainsLabels = tailArguments.some(x => x.label)

      if (
        (headContainsLabels && !tailContainsLabels && tailArguments.length) ||
        (tailContainsLabels && !headContainsLabels && headArguments.length)
      ) {
        reporter.error(headArguments, tailArguments)
        throw new Error(`[UnificationError] [GenericArgumentsLabelMismatch]`)
      }

      if (!headContainsLabels && !tailContainsLabels) {
        if (headArguments.length !== tailArguments.length) {
          throw new Error(
            `[UnificationError] [GenericArgumentsCountMismatch] ${head} ${tail}`
          )
        }

        headArguments.forEach((a, i) => {
          constraints.push({
            head: a.type,
            tail: tailArguments[i].type,
            origin: constraint,
          })
        })
      } else {
        const headLabels = headArguments
          .map(arg => arg.label)
          .filter(nonNullable)
        const tailLabels = tailArguments
          .map(arg => arg.label)
          .filter(nonNullable)

        let common = intersection(headLabels, tailLabels)

        common.forEach(label => {
          const headArgumentType = headArguments.find(
            arg => arg.label === label
          )
          const tailArgumentType = tailArguments.find(
            arg => arg.label === label
          )

          if (!headArgumentType || !tailArgumentType) {
            // not possible but here for TS
            return
          }

          constraints.push({
            head: headArgumentType.type,
            tail: tailArgumentType.type,
            origin: constraint,
          })
        })
      }

      constraints.push({
        head: head.returnType,
        tail: tail.returnType,
        origin: constraint,
      })
    } else if (head.type === 'constructor' && tail.type === 'constructor') {
      if (head.name !== tail.name) {
        reporter.error(JSON.stringify(constraint, null, '  '))
        throw new Error(
          `[UnificationError] [NameMismatch] ${head.name} <> ${tail.name}`
        )
      }
      const headParameters = head.parameters
      const tailParameters = tail.parameters
      if (headParameters.length !== tailParameters.length) {
        throw new Error(
          `[UnificationError] [GenericArgumentsCountMismatch] ${head} <> ${tail}`
        )
      }
      headParameters.forEach((a, i) => {
        constraints.push({
          head: a,
          tail: tailParameters[i],
          origin: constraint,
        })
      })
    } else if (head.type === 'generic' || tail.type === 'generic') {
      reporter.error(JSON.stringify(constraint, null, '  '))
      reporter.error('tried to unify generics (problem?)', head, tail)
    } else if (head.type === 'variable') {
      substitution.set(head, tail)
    } else if (tail.type === 'variable') {
      substitution.set(tail, head)
    } else if (
      (head.type === 'constructor' && tail.type === 'function') ||
      (head.type === 'function' && tail.type === 'constructor')
    ) {
      throw new Error(`[UnificationError] [KindMismatch] ${head} ${tail}`)
    }

    constraints = constraints.map(c => {
      const head = substitution.get(c.head)
      const tail = substitution.get(c.tail)

      if (head && tail) {
        return { head, tail, origin: c }
      }
      if (head) {
        return {
          head,
          tail: c.tail,
          origin: c,
        }
      }
      if (tail) {
        return {
          head: c.head,
          tail,
          origin: c,
        }
      }
      return c
    })
  }

  return substitution
}
