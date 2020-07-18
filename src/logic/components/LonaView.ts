import { IExpression } from '../nodes/interfaces'
import { FunctionCallExpression } from '../nodes/FunctionCallExpression'
import { ComponentVisitor } from './ComponentVisitor'
import { Value, Decode } from '../runtime/value'
import { IdentifierExpression } from '../nodes/IdentifierExpression'
import { LiteralExpression } from '../nodes/LiteralExpression'
import { ArrayLiteral } from '../nodes/literals'
import { createViewHierarchy } from '../component'
import { DimensionSize, getDimensionSize } from './DimensionSize'

export const createAndroidId = (string: string) => `@+id/${string}`
export const createAndroidIdReference = (string: string) => `@id/${string}`

export type LonaViewConstructor = FunctionCallExpression & {
  callee: IdentifierExpression
}

export class LonaView {
  name: string
  width?: DimensionSize
  height?: DimensionSize
  backgroundColor?: string
  children: LonaView[] = []

  decodeArgument<T>(
    expression: IExpression | undefined,
    visitor: ComponentVisitor,
    decoder: (value: Value) => T
  ): T | undefined {
    if (!expression) return

    const value = visitor.evaluation.evaluate(expression.id)

    if (!value) return

    return decoder(value)
  }

  constructor(node: LonaViewConstructor, visitor: ComponentVisitor) {
    const { callee, argumentExpressionNodes } = node

    this.name =
      this.decodeArgument(
        argumentExpressionNodes['__name'],
        visitor,
        Decode.string
      )?.toLowerCase() || visitor.createIntrinsicName(callee.name)

    this.width = this.decodeArgument(
      argumentExpressionNodes['width'],
      visitor,
      getDimensionSize
    )

    this.height = this.decodeArgument(
      argumentExpressionNodes['height'],
      visitor,
      getDimensionSize
    )

    this.backgroundColor = this.decodeArgument(
      argumentExpressionNodes['backgroundColor'],
      visitor,
      Decode.color
    )

    if ('children' in argumentExpressionNodes) {
      const expression = argumentExpressionNodes['children']

      const literal =
        expression instanceof LiteralExpression && expression.literal

      if (literal instanceof ArrayLiteral) {
        this.children = literal.elements.map(expression =>
          createViewHierarchy(visitor, expression)
        )
      }
    }
  }
}

export type LonaStackOrientation = 'HorizontalStack' | 'VerticalStack'
