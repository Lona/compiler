import * as LogicAST from './logic-ast'
import * as LogicTraversal from './logic-traversal'
import { Reporter } from './reporter'
import { ShallowMap } from '../utils/shallow-map'

class ScopeStack<K extends string, V> {
  private scopes: { [key: string]: V }[] = [{}]

  public get(k: K): V | void {
    return this.scopes.map(x => x[k]).filter(x => !!x)[0]
  }

  public set(k: K, v: V) {
    this.scopes[0][k] = v
  }
  public push() {
    this.scopes = [{}, ...this.scopes]
  }
  public pop(): { [key: string]: V } {
    const [hd, ...rest] = this.scopes
    this.scopes = rest
    return hd
  }
  public flattened(): { [key: string]: V } {
    let result: { [key: string]: V } = {}

    this.scopes.reverse().forEach(x =>
      Object.keys(x).forEach(k => {
        result[k] = x[k]
      })
    )

    return result
  }

  public copy() {
    const stack = new ScopeStack<K, V>()
    stack.scopes = this.scopes.map(x => ({ ...x }))
    return stack
  }
}

let pushNamespace = (name: string, context: ScopeContext) =>
  context._currentNamespacePath.push(name)

let popNamespace = (context: ScopeContext) =>
  context._currentNamespacePath.pop()

let setInCurrentNamespace = (
  name: string,
  value: { value: string; from: string },
  context: ScopeContext
) => context._namespace.set(context._currentNamespacePath.concat([name]), value)

let setGenericParameters = (
  genericParameters: LogicAST.AST.GenericParameter[],
  context: ScopeContext
) =>
  genericParameters.forEach(genericParameter => {
    if (genericParameter.type === 'parameter') {
      context._patternToTypeName[genericParameter.data.name.id] =
        genericParameter.data.name.name
    }
  })

export type ScopeContext = {
  /* Values in these are never removed, even if a variable is out of scope */

  identifierToPattern: {
    [key: string]: { pattern: string; in: string }
  }
  patternToIdentifier: {
    [key: string]: {
      identifier: string
      in: string
    }
  }
  _patternToName: { [key: string]: string }
  _patternToTypeName: { [key: string]: string }
  /* This keeps track of the current scope */
  _patternNames: ScopeStack<string, { value: string; from: string }>
  _namespace: ShallowMap<string[], { value: string; from: string }>
  _currentNamespacePath: string[]
  _currentScopeName?: string
}

const empty = (): ScopeContext => ({
  identifierToPattern: {},
  patternToIdentifier: {},
  _patternToName: {},
  _patternToTypeName: {},
  _patternNames: new ScopeStack(),
  _namespace: new ShallowMap(),
  _currentNamespacePath: [],
})

const builtInTypeConstructorNames = [
  'Boolean',
  'Number',
  'String',
  'Array',
  'Color',
]

export const build = (
  rootNodes: { node: LogicAST.AST.SyntaxNode; in: string }[],
  reporter: Reporter,
  initialContext: ScopeContext = empty()
): ScopeContext => {
  // instead of joining the programs before, we can be passed an array of program
  // and for each reduce them. It doesn't matter since the traversal is depth first
  // so we get an array of { program, file } and `walk` takes the file name to pass it where it's needed
  // That also means that we probably don't need to care about `initialNamespace`
  // it's just when `file` is `prelude`

  const config = LogicTraversal.emptyConfig()

  function namespaceDeclarations(
    context: ScopeContext,
    node: LogicAST.AST.SyntaxNode,
    config: LogicTraversal.TraversalConfig
  ) {
    config.needsRevisitAfterTraversingChildren = true

    if (node.type === 'variable' && config._isRevisit) {
      setInCurrentNamespace(
        node.data.name.name,
        { value: node.data.name.id, from: context._currentScopeName || '' },
        context
      )
    }
    if (node.type === 'function' && config._isRevisit) {
      setInCurrentNamespace(
        node.data.name.name,
        { value: node.data.name.id, from: context._currentScopeName || '' },
        context
      )
    }
    if (node.type === 'record') {
      if (!config._isRevisit) {
        /* Avoid introducing member variables into the namespace */
        config.ignoreChildren = true
      } else {
        const patternName = node.data.name.name
        /* Built-ins should be constructed using literals */
        if (builtInTypeConstructorNames.indexOf(patternName) === -1) {
          /* Create constructor function */
          setInCurrentNamespace(
            patternName,
            { value: node.data.name.id, from: context._currentScopeName || '' },
            context
          )
        }
      }
    }

    if (node.type === 'enumeration' && config._isRevisit) {
      const patternName = node.data.name.name
      pushNamespace(patternName, context)

      /* Add initializers for each case into the namespace */
      node.data.cases.forEach(enumCase => {
        if (enumCase.type === 'enumerationCase') {
          setInCurrentNamespace(
            enumCase.data.name.name,
            {
              value: enumCase.data.name.id,
              from: context._currentScopeName || '',
            },
            context
          )
        }
      })

      popNamespace(context)
    }
    if (node.type === 'namespace') {
      if (config._isRevisit) {
        popNamespace(context)
      } else {
        pushNamespace(node.data.name.name, context)
      }
    }

    return context
  }

  let walk = (
    context: ScopeContext,
    node: LogicAST.AST.SyntaxNode,
    config: LogicTraversal.TraversalConfig
  ) => {
    config.needsRevisitAfterTraversingChildren = true

    if (LogicAST.AST.isTypeAnnotation(node) && !config._isRevisit) {
      config.ignoreChildren = true
      config.needsRevisitAfterTraversingChildren = false
    }

    if (node.type === 'memberExpression' && !config._isRevisit) {
      config.ignoreChildren = true
      const identifiers = LogicAST.flattenedMemberExpression(node)
      if (identifiers) {
        const keyPath = identifiers.map(x => x.string)
        const patternId = context._namespace.get(keyPath)

        if (patternId) {
          context.identifierToPattern[node.data.id] = {
            pattern: patternId.value,
            in: patternId.from,
          }
          context.patternToIdentifier[patternId.value] = {
            identifier: node.data.id,
            in: context._currentScopeName || '',
          }
        }
      }
    }

    if (node.type === 'variable' && config._isRevisit) {
      const { id: variableId, name: variableName } = node.data.name
      context._patternNames.set(variableName, {
        value: variableId,
        from: context._currentScopeName || '',
      })
      context._patternToName[variableId] = variableName
    }
    if (node.type === 'function') {
      if (config._isRevisit) {
        context._patternNames.pop()
      } else {
        const { id: functionId, name: functionName } = node.data.name
        context._patternToName[functionId] = functionName
        context._patternNames.set(functionName, {
          value: functionId,
          from: context._currentScopeName || '',
        })
        context._patternNames.push()

        node.data.parameters.forEach(parameter => {
          if (parameter.type === 'parameter') {
            const {
              id: parameterId,
              name: parameterName,
            } = parameter.data.localName
            context._patternToName[parameterId] = parameterName
            context._patternNames.set(parameterName, {
              value: parameterId,
              from: context._currentScopeName || '',
            })
          }
        })

        setGenericParameters(node.data.genericParameters, context)
      }
    }
    if (node.type === 'record') {
      const { id: recordId, name: recordName } = node.data.name
      if (!config._isRevisit) {
        context._patternToTypeName[recordId] = recordName
        setGenericParameters(node.data.genericParameters, context)

        node.data.declarations.forEach(declaration => {
          if (declaration.type === 'variable' && declaration.data.initializer) {
            LogicTraversal.reduce(
              declaration.data.initializer,
              walk,
              context,
              config
            )
          }
        })

        config.ignoreChildren = true
      } else {
        if (builtInTypeConstructorNames.indexOf(recordName) === -1) {
          context._patternToName[recordId] = recordName
          context._patternNames.set(recordName, {
            value: recordId,
            from: context._currentScopeName || '',
          })
        }
      }
    }
    if (node.type === 'enumeration') {
      if (!config._isRevisit) {
        pushNamespace(node.data.name.name, context)

        setGenericParameters(node.data.genericParameters, context)
      } else {
        popNamespace(context)
      }
    }
    if (node.type === 'namespace') {
      if (!config._isRevisit) {
        context._patternNames.push()
        pushNamespace(node.data.name.name, context)
      } else {
        context._patternNames.pop()
        popNamespace(context)
      }
    }

    const identifier = LogicAST.getIdentifier(node)
    if (identifier && !config.ignoreChildren && !config._isRevisit) {
      if (!identifier.isPlaceholder) {
        const lookup =
          context._patternNames.get(identifier.string) ||
          context._namespace.get([identifier.string]) ||
          context._namespace.get(
            context._currentNamespacePath.concat([identifier.string])
          )

        if (lookup) {
          context.identifierToPattern[identifier.id] = {
            pattern: lookup.value,
            in: lookup.from,
          }
          context.patternToIdentifier[lookup.value] = {
            identifier: identifier.id,
            in: context._currentScopeName || '',
          }
        } else {
          reporter.error(
            'Failed to find pattern for identifier:',
            identifier.string,
            node
          )
        }
      }
    }

    return context
  }

  let contextWithNamespaceDeclarations: ScopeContext = initialContext

  rootNodes.forEach(rootNode => {
    contextWithNamespaceDeclarations._currentScopeName = rootNode.in
    contextWithNamespaceDeclarations = LogicTraversal.reduce(
      rootNode.node,
      namespaceDeclarations,
      contextWithNamespaceDeclarations,
      config
    )
    delete contextWithNamespaceDeclarations._currentScopeName
  })

  let finalContext: ScopeContext = contextWithNamespaceDeclarations

  rootNodes.forEach(rootNode => {
    finalContext._currentScopeName = rootNode.in
    finalContext = LogicTraversal.reduce(
      rootNode.node,
      walk,
      finalContext,
      config
    )
    delete finalContext._currentScopeName
  })

  return finalContext
}
