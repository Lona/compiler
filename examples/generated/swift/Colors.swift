import Foundation

#if canImport(UIKit)
  import UIKit
#elseif canImport(AppKit)
  import AppKit
#endif

public let primary: Color = Color(named: "primary")!

public let accent: Color = primary

public let testSaturate: Color = Color(named: "testSaturate")!
