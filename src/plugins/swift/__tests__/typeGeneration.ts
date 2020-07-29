import { createFs } from 'buffs'
import { execSync } from 'child_process'
import fs from 'fs'
import os from 'os'
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

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lona-'))

  fs.writeFileSync(path.join(tmp, 'Test.swift'), colors, 'utf8')

  let swiftc: string | undefined

  try {
    swiftc = execSync(`which swiftc`)
      .toString()
      .trim()
  } catch {
    // No swiftc available
  }

  if (swiftc) {
    execSync(`${swiftc} Test.swift`, { cwd: tmp })
  }

  fs.rmdirSync(tmp, { recursive: true })
})
