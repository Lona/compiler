#!/usr/bin/env node

import yargs from 'yargs'
import { convert, getConfig } from './index'

yargs
  .scriptName('@lona/compiler')
  .usage('Usage: lona <command> [options]')
  .command(
    'config [workspace]',
    'Get the configuration of a Lona workspace',
    cli => {
      cli.positional('workspace', {
        describe: 'path to the Lona workspace',
        type: 'string',
        default: process.cwd(),
      })
    },
    argv => {
      const { workspace } = argv

      if (typeof workspace !== 'string') {
        throw new Error('workspace must be a string')
      }

      try {
        const config = getConfig(workspace)

        if (!config) {
          throw new Error(
            'The path provided is not a Lona Workspace. A workspace must contain a `lona.json` file.'
          )
        }

        console.log(JSON.stringify(config, null, 2))
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    }
  )
  .command(
    'convert [path]',
    'Convert a workspace to a specific format',
    cli => {
      cli.positional('path', {
        describe: 'path to the Lona workspace',
        type: 'string',
        default: process.cwd(),
      })
      cli.option('format', {
        describe: 'format to convert it to',
        type: 'string',
        demandOption: true,
      })
    },
    argv => {
      const { path, format } = argv

      if (typeof path !== 'string') {
        throw new Error('path must be a string')
      }

      if (typeof format !== 'string') {
        throw new Error('format option must be a string')
      }

      convert(path, format, argv)
        .then(result => {
          if (result) {
            if (typeof result === 'string') {
              console.log(result)
            } else {
              console.log(JSON.stringify(result, null, 2))
            }
          }
        })
        .catch(err => {
          console.error(err)
          process.exit(1)
        })
    }
  )
  .demandCommand(1, 'Pass --help to see all available commands and options.')
  .fail(msg => {
    yargs.showHelp()
    console.log('\n' + msg)
  })
  .help('h')
  .alias('h', 'help').argv
