import { LogicAST as AST } from '@lona/serialization'
import * as Serialization from '@lona/serialization'
import fs from 'fs'
import path from 'path'

import { createNamespace } from '../namespace'
import { createScopeContext } from '../scope'
import { findNode } from '../traversal'

function readLibrary(name: string): string {
  const librariesPath = path.join(__dirname, '../library')
  return fs.readFileSync(path.join(librariesPath, `${name}.logic`), 'utf8')
}

describe('Logic / Scope', () => {
  it('finds identifier expression references', () => {
    const file = `struct Number {}

let x: Number = 42

let y: Number = x`

    let rootNode = Serialization.decodeLogic(file)

    let namespace = createNamespace(rootNode)

    const variable = findNode(rootNode, node => {
      return node.type === 'variable' && node.data.name.name === 'x'
    }) as AST.VariableDeclaration

    const identifierExpression = findNode(rootNode, node => {
      return (
        node.type === 'identifierExpression' &&
        node.data.identifier.string === 'x'
      )
    }) as AST.IdentifierExpression

    expect(variable).not.toBeUndefined()

    expect(identifierExpression).not.toBeUndefined()

    let scope = createScopeContext(rootNode, namespace)

    expect(
      scope.identifierExpressionToPattern[identifierExpression.data.id]
    ).toEqual(variable.data.name.id)

    expect(Object.keys(scope.valueNames.flattened())).toEqual(['x', 'y'])
  })

  it('finds member expression references', () => {
    const file = `struct Number {}

extension Foo {
  let x: Number = 42
}

let y: Number = Foo.x`

    let rootNode = Serialization.decodeLogic(file)

    let namespace = createNamespace(rootNode)

    const variable = findNode(rootNode, node => {
      return node.type === 'variable' && node.data.name.name === 'x'
    }) as AST.VariableDeclaration

    const memberExpression = findNode(rootNode, node => {
      return (
        node.type === 'memberExpression' && node.data.memberName.string === 'x'
      )
    }) as AST.MemberExpression

    expect(variable).not.toBeUndefined()

    expect(memberExpression).not.toBeUndefined()

    let scope = createScopeContext(rootNode, namespace)

    expect(scope.memberExpressionToPattern[memberExpression.data.id]).toEqual(
      variable.data.name.id
    )

    expect(Object.keys(scope.valueNames.flattened())).toEqual(['y'])
  })

  it('finds type identifier references', () => {
    const file = `enum Foo {
    case bar()
  }

  let y: Foo = Foo.bar()`

    let rootNode = Serialization.decodeLogic(file)

    let namespace = createNamespace(rootNode)

    const enumeration = findNode(rootNode, node => {
      return node.type === 'enumeration' && node.data.name.name === 'Foo'
    }) as AST.EnumerationDeclaration

    const enumerationCase = findNode(rootNode, node => {
      return node.type === 'enumerationCase' && node.data.name.name === 'bar'
    }) as AST.EnumerationCase

    const memberExpression = findNode(rootNode, node => {
      return (
        node.type === 'memberExpression' &&
        node.data.memberName.string === 'bar'
      )
    }) as AST.MemberExpression

    const typeIdentifier = findNode(rootNode, node => {
      return (
        node.type === 'typeIdentifier' && node.data.identifier.string === 'Foo'
      )
    }) as AST.TypeIdentifierTypeAnnotation

    expect(enumeration).not.toBeUndefined()

    expect(enumerationCase).not.toBeUndefined()

    expect(memberExpression).not.toBeUndefined()

    expect(typeIdentifier).not.toBeUndefined()

    let scope = createScopeContext(rootNode, namespace)

    expect(scope.typeIdentifierToPattern[typeIdentifier.data.id]).toEqual(
      enumeration.data.name.id
    )

    // TODO: Fix EnumerationCase being a union with placeholder
    if (enumerationCase.type !== 'enumerationCase') {
      throw new Error('Bad enumeration case')
    }

    expect(scope.memberExpressionToPattern[memberExpression.data.id]).toEqual(
      enumerationCase.data.name.id
    )

    expect(Object.keys(scope.valueNames.flattened())).toEqual(['y'])
    expect(Object.keys(scope.typeNames.flattened())).toEqual(['Foo'])
  })

  it('finds function argument references', () => {
    const file = `
func bar(hello: Number) -> Number {
  let x: Number = hello
}
`
    let rootNode = Serialization.decodeLogic(file)

    let namespace = createNamespace(rootNode)

    const parameter = findNode(rootNode, node => {
      return (
        node.type === 'parameter' &&
        // TODO: Fix type issue
        (node.data as any).localName.name === 'hello'
      )
    }) as AST.FunctionParameter

    const identifierExpression = findNode(rootNode, node => {
      return (
        node.type === 'identifierExpression' &&
        node.data.identifier.string === 'hello'
      )
    }) as AST.IdentifierExpression

    expect(parameter).not.toBeUndefined()

    expect(identifierExpression).not.toBeUndefined()

    let scope = createScopeContext(rootNode, namespace)

    expect(
      scope.identifierExpressionToPattern[identifierExpression.data.id]
    ).toEqual((parameter.data as any).localName.id)

    expect(Object.keys(scope.valueNames.flattened())).toEqual(['bar'])
  })

  it('loads Prelude.logic', () => {
    let rootNode = Serialization.decodeLogic(readLibrary('Prelude'))

    let namespace = createNamespace(rootNode)

    let scope = createScopeContext(rootNode, namespace)

    expect(scope.undefinedIdentifierExpressions.size).toEqual(0)
    expect(scope.undefinedMemberExpressions.size).toEqual(0)
    expect(scope.undefinedTypeIdentifiers.size).toEqual(0)
  })

  it('loads Color.logic', () => {
    let rootNode = Serialization.decodeLogic(readLibrary('Color'))

    let namespace = createNamespace(rootNode)

    let scope = createScopeContext(rootNode, namespace)

    expect(scope.undefinedIdentifierExpressions.size).toEqual(0)
    expect(scope.undefinedMemberExpressions.size).toEqual(0)
    expect(scope.undefinedTypeIdentifiers.size).toEqual(7)

    let typeIdentifiers = [...scope.undefinedTypeIdentifiers.values()]
      .map(
        id =>
          findNode(
            rootNode,
            node => node.data.id === id
          ) as AST.TypeIdentifierTypeAnnotation
      )
      .map(node => node.data.identifier.string)

    expect(typeIdentifiers).toEqual([
      'Number',
      'Number',
      'Number',
      'Number',
      'Number',
      'Number',
      'Number',
    ])
  })

  it('loads TextStyle.logic', () => {
    let rootNode = Serialization.decodeLogic(readLibrary('TextStyle'))

    let namespace = createNamespace(rootNode)

    let scope = createScopeContext(rootNode, namespace)

    expect(scope.undefinedIdentifierExpressions.size).toEqual(0)
    expect(scope.undefinedMemberExpressions.size).toEqual(6)
    expect(scope.undefinedTypeIdentifiers.size).toEqual(0)

    let memberExpressions = [...scope.undefinedMemberExpressions.values()]
      .map(
        id =>
          findNode(
            rootNode,
            node => node.data.id === id
          ) as AST.MemberExpression
      )
      .map(node => node.data.memberName.string)

    expect(memberExpressions).toEqual([
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
    ])
  })
})
