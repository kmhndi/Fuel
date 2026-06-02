import Foundation

/// Mirrors the JSON snapshot the app writes to the shared App Group (see
/// src/widgets/types.ts). Numbers are pre-rounded for display by the app; we
/// decode as Double so an unexpected float never breaks decoding.
struct WidgetData: Codable {
  struct Calories: Codable {
    let consumed: Double
    let goal: Double
    let left: Double
    let pct: Double
    let over: Bool
  }
  struct Macro: Codable {
    let consumed: Double
    let goal: Double
    let left: Double
    let pct: Double
  }
  struct Water: Codable {
    let glasses: Double
    let goal: Double
    let glassMl: Double
    let pendingDelta: Double
  }

  let schemaVersion: Int
  let day: String
  let updatedAt: Double
  let calories: Calories
  let protein: Macro
  let water: Water
  let theme: String
  let accent: String

  /// Shown before the app has written real data (also the timeline placeholder).
  static let placeholder = WidgetData(
    schemaVersion: 1,
    day: "",
    updatedAt: 0,
    calories: .init(consumed: 0, goal: 2000, left: 2000, pct: 0, over: false),
    protein: .init(consumed: 0, goal: 140, left: 140, pct: 0),
    water: .init(glasses: 0, goal: 8, glassMl: 250, pendingDelta: 0),
    theme: "dark",
    accent: "#22D3A7"
  )

  /// A copy with `n` glasses added optimistically (count + additive pending
  /// delta). The app reconciles the delta into SQLite on next foreground.
  func addingWater(_ n: Int) -> WidgetData {
    WidgetData(
      schemaVersion: schemaVersion,
      day: day,
      updatedAt: Date().timeIntervalSince1970 * 1000,
      calories: calories,
      protein: protein,
      water: .init(
        glasses: water.glasses + Double(n),
        goal: water.goal,
        glassMl: water.glassMl,
        pendingDelta: water.pendingDelta + Double(n)
      ),
      theme: theme,
      accent: accent
    )
  }
}

/// Reads/writes the snapshot in the shared App Group. The app stores it as a
/// JSON *string* (via ExtensionStorage.setString), so we round-trip a string.
enum SnapshotStore {
  static let appGroup = "group.com.khalidalmohannadi.fuel"
  static let key = "snapshot"

  static func load() -> WidgetData? {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let raw = defaults.string(forKey: key),
      let data = raw.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(WidgetData.self, from: data)
  }

  static func save(_ snapshot: WidgetData) {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let data = try? JSONEncoder().encode(snapshot),
      let raw = String(data: data, encoding: .utf8)
    else { return }
    defaults.set(raw, forKey: key)
  }
}
