import fs from 'fs'
import { config as Config } from '../utils'
import { defaultReporter, Reporter } from '../utils/reporter'
import { createFSWrapper, FSWrapper } from './fs'
import { ModuleContext, createModule } from '../logic/module'
import { IFS } from 'buffs'

/**
 * Helpers passed to every plugins. They contain:
 *
 * - methods abstracting the file system
 * - a centralized log reporter
 * - the workspace's configuration, etc.
 */
export type Helpers = {
  fs: IFS
  reporter: Reporter
  config: Config.Config
  module: ModuleContext
}

export default async (
  fs: IFS,
  workspacePath: string,
  options: {
    outputPath?: unknown
    reporter?: Reporter
  } = {}
): Promise<Helpers> => {
  const { reporter = defaultReporter } = options

  const helpers: Helpers = {
    fs,
    reporter,
    config: await Config.load(fs, workspacePath),
    module: createModule(fs, workspacePath),
  }

  return helpers
}
