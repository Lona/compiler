export function compact<T>(input: (T | false | null | undefined)[]): T[] {
  let output: T[] = []

  for (let value of input) {
    if (typeof value !== 'undefined' && value !== false && value !== null) {
      output.push(value)
    }
  }

  return output
}
