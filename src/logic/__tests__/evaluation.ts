import { LogicAST as AST } from '@lona/serialization'
import { createFs } from 'buffs'
import { createModule, ModuleContext } from '../module'
import { UUID } from '../namespace'
import { findNode } from '../traversal'

function getInitializerId(module: ModuleContext, variableName: string): UUID {
  const logicFile = module.logicFiles.find(file =>
    file.sourcePath.endsWith('Example.logic')
  )

  if (!logicFile) {
    throw new Error(`Failed to find Example.logic`)
  }

  const variable = findNode(
    logicFile.rootNode,
    (node): node is AST.VariableDeclaration => {
      return node.type === 'variable' && node.data.name.name === variableName
    }
  )

  if (!variable) {
    throw new Error(`Variable ${variableName} not found`)
  }

  const initializer = variable.data.initializer

  if (!initializer) {
    throw new Error(`Initializer for ${variableName} not found`)
  }

  return initializer.data.id
}

function moduleWithFile(file: string): ModuleContext {
  const source = createFs({
    'lona.json': JSON.stringify({}),
    'Example.logic': file,
  })

  return createModule(source, '/')
}

describe('Logic / Evaluate', () => {
  it('evaluates number literals', () => {
    const file = `let x: Number = 4`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    expect(module.evaluationContext.evaluate(initializerId)).toEqual({
      type: { type: 'constructor', name: 'Number', parameters: [] },
      memory: { type: 'number', value: 4 },
    })
  })

  it('evaluates color literals', () => {
    const file = `let x: Color = #color(css: "red")`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    expect(module.evaluationContext.evaluate(initializerId)).toMatchSnapshot()
  })

  it('evaluates enums', () => {
    const file = `
enum Foo {
  case bar()
}

let x: Foo = Foo.bar()
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    expect(module.evaluationContext.evaluate(initializerId)).toEqual({
      type: { type: 'constructor', name: 'Foo', parameters: [] },
      memory: { type: 'enum', value: 'bar', data: [] },
    })
  })

  it('evaluates custom function', () => {
    const file = `
func test() -> Number {
  return 42
}

let x: Number = test()
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    const result = module.evaluationContext.evaluate(initializerId)

    expect(result).toMatchSnapshot()
  })

  it('evaluates custom function with arguments', () => {
    const file = `
func test(myNumber: Number) -> Number {
  return myNumber
}

let x: Number = test(myNumber: 42)
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    const result = module.evaluationContext.evaluate(initializerId)

    expect(result).toMatchSnapshot()
  })

  it('evaluates custom function with argument default value', () => {
    const file = `
func test(myNumber: Number = 42) -> Number {
  return myNumber
}

let x: Number = test()
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    const result = module.evaluationContext.evaluate(initializerId)

    expect(result).toMatchSnapshot()
  })

  it('evaluates DimensionSize', () => {
    const file = `
let x: DimensionSize = DimensionSize.fixed(100)
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    expect(module.evaluationContext.evaluate(initializerId)).toMatchSnapshot()
  })

  it('evaluates ElementParameter', () => {
    const file = `
let x: ElementParameter = ElementParameter.number("height", 20)
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    const result = module.evaluationContext.evaluate(initializerId)

    expect(result).toMatchSnapshot()
  })

  it('evaluates Element', () => {
    const file = `
let x: Element = Element(type: "Test", parameters: [])
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    const result = module.evaluationContext.evaluate(initializerId)

    expect(result).toMatchSnapshot()
  })

  it('evaluates Padding', () => {
    const file = `
let x: Padding = Padding(top: 10, right: 20, bottom: 30, left: 40)
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    const result = module.evaluationContext.evaluate(initializerId)

    expect(result).toMatchSnapshot()
  })

  it('evaluates function that returns Padding', () => {
    const file = `
let x: Padding = Padding.size(value: 8)
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    const result = module.evaluationContext.evaluate(initializerId)

    expect(result).toMatchSnapshot()
  })

  it('evaluates View', () => {
    const file = `
let width: DimensionSize = DimensionSize.fixed(20)
let height: DimensionSize = DimensionSize.fixed(20)
let name: String = "name"
let padding: Padding = Padding.size(value: 8)
let backgroundColor: Color = #color(css: "red")
let x: Element = View(__name: name, width: width, height: height, padding: padding, backgroundColor: backgroundColor, children: [])
`
    const module = moduleWithFile(file)
    const initializerId = getInitializerId(module, 'x')

    const result = module.evaluationContext.evaluate(initializerId)

    expect(result).toMatchSnapshot()
  })
})
