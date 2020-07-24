import { createFs } from 'buffs'
import fs from 'fs'
import path from 'path'
import { createHelpers } from '../../../helpers'
import plugin from '../index'

it('converts Swift language', async () => {
  const source = createFs({
    'lona.json': JSON.stringify({}),
    'SwiftLanguage.logic': fs.readFileSync(
      path.join(__dirname, './mocks/SwiftLanguage.logic'),
      'utf8'
    ),
  })

  const helpers = createHelpers(source, '/')

  await plugin.convertWorkspace('/', helpers, { output: '/output' })

  const colors = source.readFileSync('/output/SwiftLanguage.swift', 'utf8')

  expect(colors).toMatchSnapshot()
})
