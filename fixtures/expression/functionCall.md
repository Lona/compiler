```tokens
func functionCall(a: Number) -> Number {
  ThemedColor(light: #color(css: "pink"), dark: #color(css: "purple"))
  Optional.none()
}
func colorIdentity(a: Color) -> Color {
  return a
}
let pinkWithDetour: Color = colorIdentity(a: #color(css: "pink"))
```
