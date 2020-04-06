import Foundation

#if os(iOS) || os(tvOS) || os(watchOS)
  import UIKit
#elseif os(macOS)
  import AppKit
#endif

public let small: Shadow = Shadow(x: 0, y: 2, blur: 2, radius: 0, color: primary)
