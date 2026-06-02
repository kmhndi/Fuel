import AppIntents
import WidgetKit

/// Logs one glass of water straight from the widget (iOS 17+). It only touches
/// the shared snapshot — an optimistic glass + an additive pending delta — then
/// reloads the timelines. SQLite stays the source of truth: the app reconciles
/// the delta via adjustWater() on next foreground (see reconcile.ts).
@available(iOS 17.0, *)
struct AddWaterIntent: AppIntent {
  static var title: LocalizedStringResource = "Add a glass of water"
  static var description = IntentDescription("Logs one glass of water to Fuel.")

  func perform() async throws -> some IntentResult {
    if let current = SnapshotStore.load() {
      SnapshotStore.save(current.addingWater(1))
    }
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}
