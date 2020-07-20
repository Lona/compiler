import fs from 'fs'
import path from 'path'
import { createFs, copy } from 'buffs'
import plugin from '../index'
import Helpers from '../../../helpers'

const workspacePath = path.join(__dirname, '../../../../examples/workspace')

it('converts workspace', async () => {
  const source = createFs()

  copy(fs, source, workspacePath, '/')

  const helpers = Helpers(source, '/')

  await plugin.convertWorkspace('/', helpers, { output: '/docs.json' })

  const output = JSON.parse(source.readFileSync('/docs.json', 'utf8'))

  expect(output).toMatchSnapshot()
})
