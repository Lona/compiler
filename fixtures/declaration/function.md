```tokens
func add<T>(a: T, b: T = 0) -> T {}

func add<T>(a: T, b: T = 0) -> T {
  return Number.add(a: a, b: b)
}

func add() -> T {}
```
