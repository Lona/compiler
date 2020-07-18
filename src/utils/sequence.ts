export function compact<T>(input: (T | false | null | undefined)[]): T[] {
  let output: T[] = []

  for (let value of input) {
    if (typeof value !== 'undefined' && value !== false && value !== null) {
      output.push(value)
    }
  }

  return output
}

export function zip<A, B>(a: Array<A>, b: Array<B>): [A, B][] {
  const length = Math.max(a.length, b.length)

  const output: [A, B][] = []

  for (let i = 0; i < length; i++) {
    output.push([a[i], b[i]])
  }

  return output
}
