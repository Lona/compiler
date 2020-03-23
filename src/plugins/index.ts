import { Helpers } from '../helpers'

export type Plugin = {
  format: string
  parseFile(
    filePath: string,
    helpers: Helpers,
    options: {
      [argName: string]: unknown
    }
  ): Promise<any>
  parseWorkspace(
    workspacePath: string,
    helpers: Helpers,
    options: {
      [argName: string]: unknown
    }
  ): Promise<any>
}
