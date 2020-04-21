import { Helpers } from '../helpers'

export type Plugin = {
  format: string
  convertWorkspace(
    workspacePath: string,
    helpers: Helpers,
    options: {
      [argName: string]: unknown
    }
  ): Promise<any>
}
