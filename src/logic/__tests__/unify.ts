import * as Serialization from '@lona/serialization'
import isEqual from 'lodash.isequal'
import { createNamespace } from '../namespace'
import { createScopeContext } from '../scope'
import { StaticType } from '../staticType'
import { createUnificationContext } from '../typeChecker'
import { substitute, unify } from '../typeUnifier'
import { silentReporter } from '../../utils/silentReporter'

describe('Logic / Scope', () => {
  it('finds identifier expression references', () => {
    const file = `struct Array<T> {}

let x: Array<Number> = []`

    let rootNode = Serialization.decodeLogic(file)

    let namespace = createNamespace(rootNode)

    let scope = createScopeContext(rootNode, namespace)

    let unification = createUnificationContext(rootNode, scope, silentReporter)

    const substitution = unify(unification.constraints, silentReporter)

    let type: StaticType = { type: 'variable', value: '?5' }

    let result = substitute(substitution, type)

    while (!isEqual(result, substitute(substitution, result))) {
      result = substitute(substitution, result)
    }

    expect(result).toEqual({
      type: 'constructor',
      name: 'Number',
      parameters: [],
    })
  })
})
