import * as path from 'path'
import * as fs from 'fs'
import { convertFile } from '../../../index'
import * as formatter from '../'

function readDir(x: string) {
  return fs
    .readdirSync(path.join(__dirname, '../../../../', x))
    .map(y => path.join(__dirname, '../../../../', x, y))
}

describe('JS', () => {
  const files = readDir('fixtures/declaration')
    .concat(readDir('fixtures/expression'))
    .concat(readDir('fixtures/literal'))
    .concat(readDir('fixtures/statement'))

  files.forEach(filePath =>
    test(`Example ${filePath.split('fixtures/')[1]}`, async () => {
      const output = await convertFile(filePath, formatter)
      expect(output).toMatchSnapshot()
    })
  )
})
