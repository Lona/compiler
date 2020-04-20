import Foundation

#if canImport(UIKit)
  import UIKit
#elseif canImport(AppKit)
  import AppKit
#endif

public let small: Shadow = Shadow(x: 0, y: 2, blur: 2, radius: 0, color: primary)
