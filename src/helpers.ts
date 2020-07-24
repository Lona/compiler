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
  workspacePath: string
}

export function createHelpers(
  fs: IFS,
  workspacePath: string,
  options: {
    outputPath?: unknown
    reporter?: Reporter
  } = {}
): Helpers {
  const { reporter = defaultReporter } = options

  const helpers: Helpers = {
    fs,
    reporter,
    config: load(fs, workspacePath),
    module: createModule(fs, workspacePath),
    workspacePath,
  }

  return helpers
}
