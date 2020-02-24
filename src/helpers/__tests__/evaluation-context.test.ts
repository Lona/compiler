import { generate as generateEvaluationContext } from '../evaluation-context'
import { Config } from '../../utils/config'
import config from './__fixtures__/base-config.json'

describe('Evaluation context helper', () => {
  test('Assert sample workspace config parses correctly', () => {
    const reporter = {
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }
    const result = generateEvaluationContext(config as Config, reporter)
    expect(result).toMatchSnapshot()
  })
})
