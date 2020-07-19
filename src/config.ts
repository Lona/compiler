import * as fs from 'fs'
import * as path from 'path'
import { isWorkspacePath } from './utils/isWorkspacePath'
import { load } from './utils/config'

export const getConfig = async (workspacePath: string) => {
  const resolvedPath = path.resolve(workspacePath)

  if (!(await isWorkspacePath(resolvedPath))) {
    throw new Error(
      'The path provided is not a Lona Workspace. A workspace must contain a `lona.json` file.'
    )
  }

  return await load(fs, resolvedPath)
}
