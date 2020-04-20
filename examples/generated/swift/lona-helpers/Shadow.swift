import Foundation

#if canImport(UIKit)
  import UIKit
#elseif canImport(AppKit)
  import AppKit
#endif

public struct Shadow {
  let color: Color
  let offset: CGSize
  let blur: CGFloat

  // radius is not supported on swift
  public init(x: CGFloat? = nil, y: CGFloat? = nil, blur: CGFloat? = nil, radius: CGFloat? = nil, color: Color? = nil) {
    self.color = color ?? #colorLiteral(red: 0, green: 0, blue: 0, alpha: 1)
    self.offset = CGSize(width: x ?? 0, height: y ?? 0)
    self.blur = blur ?? 0
  }

  func apply(to layer: CALayer) {
    layer.shadowColor = color.cgColor
    layer.shadowOffset = offset
    layer.shadowRadius = blur
    layer.shadowOpacity = 1
  }
}
