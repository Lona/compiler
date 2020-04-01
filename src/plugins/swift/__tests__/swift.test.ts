import * as path from 'path'
import * as fs from 'fs'
import Helpers, { Helpers as HelpersType } from '../../../helpers'
import * as formatter from '../'

const workspace = path.join(__dirname, '../../../../fixtures')

function readDir(x: string) {
  return fs
    .readdirSync(path.join(workspace, x))
    .map(y => path.join(workspace, x, y))
}

describe('Swift', () => {
  let helpers: HelpersType

  beforeAll(async () => {
    helpers = await Helpers(workspace)
  })

  const files = readDir('declaration')
    .concat(readDir('expression'))
    .concat(readDir('literal'))
    .concat(readDir('statement'))

  files.forEach(filePath =>
    test(`Example ${filePath.split('fixtures/')[1]}`, async () => {
      const output = await formatter.parseFile(
        path.relative(workspace, filePath),
        helpers,
        {
          ...((helpers.config.format || {})[formatter.format] || {}),
        }
      )
      expect(output).toMatchSnapshot()
    })
  )
})
