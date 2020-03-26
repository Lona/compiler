import * as path from 'path'
import { convertFile } from '../../../index'
import * as formatter from '../'

describe('Swift', () => {
  const files = [
    path.join(__dirname, 'fixtures/declaration/enumeration.md'),
    path.join(__dirname, 'fixtures/declaration/function.md'),
    path.join(__dirname, 'fixtures/declaration/import.md'),
    path.join(__dirname, 'fixtures/declaration/namespace.md'),
    path.join(__dirname, 'fixtures/declaration/record.md'),
    path.join(__dirname, 'fixtures/declaration/variable.md'),
  ]

  files.forEach((filePath, i) =>
    test(`Example ${i + 1}`, async () => {
      const output = await convertFile(filePath, formatter)
      expect(output).toMatchSnapshot()
    })
  )
})
