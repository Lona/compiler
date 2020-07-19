import * as path from 'path'
import { IFS } from 'buffs'

type LonaJSON = {
  ignore: string[]
  format: {
    [key: string]: {
      [key: string]: any
    }
  }
  [key: string]: unknown
}

export type Config = {
  version: string
} & LonaJSON

/**
 * Load the workspace config file, `lona.json`.
 */
export async function load(fs: IFS, workspacePath: string): Promise<Config> {
  // TODO: Validate lona.json
  const lonaFile = JSON.parse(
    fs.readFileSync(path.join(workspacePath, 'lona.json'), 'utf8')
  ) as LonaJSON

  if (!lonaFile.ignore) {
    lonaFile.ignore = ['**/node_modules/**', '**/.git/**']
  }

  return {
    ...lonaFile,
    workspacePath,
    version: require('../../package.json').version,
  }
}
