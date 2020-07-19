import { createNamespace } from '../namespace'
import * as Serialization from '@lona/serialization'
import fs from 'fs'
import path from 'path'

function readLibrary(name: string): string {
  const librariesPath = path.join(__dirname, '../library')
  return fs.readFileSync(path.join(librariesPath, `${name}.logic`), 'utf8')
}

describe('Logic / Namespace', () => {
  it('adds records to the namespace', () => {
    const file = `
struct Color {
  let value: String = ""
}
`
    let rootNode = Serialization.decodeLogic(file)

    let namespace = createNamespace(rootNode)

    expect(Object.keys(namespace.types)).toEqual(['Color'])
    expect(Object.keys(namespace.values)).toEqual(['Color.value'])
  })

  it('adds enums to the namespace', () => {
    const file = `
enum TextAlign {
  case left()
  case center()
  case right()
}
`
    let rootNode = Serialization.decodeLogic(file)

    let namespace = createNamespace(rootNode)

    expect(Object.keys(namespace.types)).toEqual(['TextAlign'])
    expect(Object.keys(namespace.values)).toEqual([
      'TextAlign.left',
      'TextAlign.center',
      'TextAlign.right',
    ])
  })

  it('adds functions to the namespace', () => {
    const file = `extension Foo {
  func bar(hello: Number) -> Number {}
}

func baz() -> Number {}
`
    let rootNode = Serialization.decodeLogic(file)

    let namespace = createNamespace(rootNode)

    expect(Object.keys(namespace.types)).toEqual([])
    expect(Object.keys(namespace.values)).toEqual(['Foo.bar', 'baz'])
  })

  it('loads Color.logic', () => {
    let rootNode = Serialization.decodeLogic(readLibrary('Color'))

    let namespace = createNamespace(rootNode)

    expect(Object.keys(namespace.types)).toEqual(['Color'])
    expect(Object.keys(namespace.values)).toEqual([
      'Color.value',
      'Color.setHue',
      'Color.setSaturation',
      'Color.setLightness',
      'Color.fromHSL',
      'Color.saturate',
    ])
  })

  it('loads TextStyle.logic', () => {
    let rootNode = Serialization.decodeLogic(readLibrary('TextStyle'))

    let namespace = createNamespace(rootNode)

    expect(Object.keys(namespace.types)).toEqual(['FontWeight', 'TextStyle'])
    expect(Object.keys(namespace.values)).toEqual([
      'FontWeight.ultraLight',
      'FontWeight.thin',
      'FontWeight.light',
      'FontWeight.regular',
      'FontWeight.medium',
      'FontWeight.semibold',
      'FontWeight.bold',
      'FontWeight.heavy',
      'FontWeight.black',
      'FontWeight.w100',
      'FontWeight.w200',
      'FontWeight.w300',
      'FontWeight.w400',
      'FontWeight.w500',
      'FontWeight.w600',
      'FontWeight.w700',
      'FontWeight.w800',
      'FontWeight.w900',
      'TextStyle.fontName',
      'TextStyle.fontFamily',
      'TextStyle.fontWeight',
      'TextStyle.fontSize',
      'TextStyle.lineHeight',
      'TextStyle.letterSpacing',
      'TextStyle.color',
      'TextStyle',
    ])
  })
})
