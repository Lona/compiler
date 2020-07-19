import * as fs from 'fs'
import * as path from 'path'
import { isWorkspacePath } from './utils/workspace'
import { load, Config } from './utils/config'

export const getConfig = (workspacePath: string): Config | undefined => {
  const resolvedPath = path.resolve(workspacePath)

  return isWorkspacePath(resolvedPath) ? load(fs, resolvedPath) : undefined
}
