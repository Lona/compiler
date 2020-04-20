import Foundation

#if canImport(UIKit)
  import UIKit
  public typealias Color = UIColor
#elseif canImport(AppKit)
  import Cocoa
  public typealias Color = NSColor
#endif
