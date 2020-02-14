import { generate as generateEvaluationContext } from '../evaluation-context'
import config from './__fixtures__/base-config.json'

describe("Evaluation context helper", () => {
    test("Assert sample workspace config parses correctly", () => {
      const reporter = {
          info: jest.fn(),
          log: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        };
        console.log({config})
      const result = generateEvaluationContext(config, reporter)
        expect(result).toBeTruthy();
    });
});
