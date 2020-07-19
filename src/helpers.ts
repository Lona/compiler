import { IFS } from 'buffs'
import { createModule, ModuleContext } from './logic/module'
import { Config, load } from './utils/config'
import { defaultReporter, Reporter } from './utils/reporter'

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
  config: Config
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
    config: await load(fs, workspacePath),
    module: createModule(fs, workspacePath),
  }

  return helpers
}
