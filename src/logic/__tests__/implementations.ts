import { createFs } from 'buffs'
import { createModule } from '../module'
import { RecordMemory } from '../runtime/memory'
import { Encode } from '../runtime/value'

describe('Logic / Implementations', () => {
  it('implements the standard library', () => {
    const source = createFs({ 'lona.json': JSON.stringify({}) })
    const module = createModule(source, '/')

    // Detect missing functions in the global namespace
    const missingImplementations = Object.entries(
      module.namespace.values
    ).flatMap(([qualifiedNameString, id]) => {
      const value = module.evaluationContext.evaluate(id)

      if (!value) {
        throw new Error(`Problem evaluating ${qualifiedNameString}`)
      }

      // Find all functions
      if (value.memory.type === 'function') {
        const { defaultArguments, f } = value.memory.value

        const args: RecordMemory = Object.fromEntries(
          Object.entries(defaultArguments).map(([name, [_, val]]) => {
            return [name, typeof val === 'undefined' ? Encode.unit() : val]
          })
        )

        // Call each function to check if it exists
        const result = f(args)

        // A function that returns unit most likely doesn't exist
        if (result.type === 'unit') {
          return [qualifiedNameString]
        }
      }

      return []
    })

    // Assert missing implementations. This should be an empty array before committing.
    expect(missingImplementations).toMatchSnapshot()
  })
})
