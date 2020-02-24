import { isHardcodedMapCall, createStandardLibraryResolver } from '../hardcoded-mapping'
import { generate as generateEvaluationContext } from '../evaluation-context'
import { hardcoded } from '../logic-evaluation-hardcoded-map'
import { Config } from '../../utils/config'
import { AST as LogicAST } from '../logic-ast'
import config from './__fixtures__/base-config.json'

const args: any =
{
  isStatic: false,
  isTopLevel: true,
  rootNode: {},
  filePath: 'TextStyles.md',
  helpers: {},
  importIdentifier: () => { },
  resolveStandardLibrary: [Function]
}

describe('Hard coded mapping helper', () => {
  test('Assert function call expression samples truthy mappings return true', () => {
    expect(isHardcodedMapCall.functionCallExpression('Optional.value', hardcoded)).toBeTruthy()
    expect(isHardcodedMapCall.functionCallExpression('Optional.none', hardcoded)).toBeTruthy()
    expect(isHardcodedMapCall.functionCallExpression('Color.saturate', hardcoded)).toBeTruthy()
  })
  test('Assert incorrect function call expression mappings return false', () => {
    expect(isHardcodedMapCall.functionCallExpression('qnqoiv8qdufhals', hardcoded)).toBeFalsy()
    expect(isHardcodedMapCall.functionCallExpression('', hardcoded)).toBeFalsy()
  })
  test('Assert function call expression samples truthy mappings return true', () => {
    expect(isHardcodedMapCall.memberExpression('FontWeight.w100', hardcoded)).toBeTruthy()
    expect(isHardcodedMapCall.memberExpression('FontWeight.w200', hardcoded)).toBeTruthy()
    expect(isHardcodedMapCall.memberExpression('FontWeight.w500', hardcoded)).toBeTruthy()
  })
  test('Assert incorrect function call expression mappings return false', () => {
    expect(isHardcodedMapCall.memberExpression('qnqoiv8qdufhals', hardcoded)).toBeFalsy()
    expect(isHardcodedMapCall.memberExpression('', hardcoded)).toBeFalsy()
  })
})

describe('Standard library resolver helper', () => {
  test('Assert resolve succeeds with example given evaluation context', () => {
    const reporter = {
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }
    const ec = generateEvaluationContext(config as Config, reporter)
    const functionCallExpressionNode = config.logicFiles["TextStyles.md"].data.declarations[0].data.initializer
    expect(createStandardLibraryResolver(hardcoded)(functionCallExpressionNode as LogicAST.SyntaxNode, ec, args)).toBeFalsy()
    const secondFunctionCallExpressionNode = config.logicFiles["Shadows.md"].data.declarations[0].data.initializer
    expect(createStandardLibraryResolver(hardcoded)(secondFunctionCallExpressionNode as LogicAST.SyntaxNode, ec, args)).toBeFalsy()
  })
})
