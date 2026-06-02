import WidgetKit

struct FuelEntry: TimelineEntry {
  let date: Date
  let data: WidgetData
}

/// Single-entry provider. The app pushes fresh data via
/// `WidgetCenter.reloadAllTimelines()` after every relevant mutation, so the
/// timeline itself just reflects whatever snapshot is currently in storage.
struct FuelProvider: TimelineProvider {
  func placeholder(in context: Context) -> FuelEntry {
    FuelEntry(date: Date(), data: .placeholder)
  }

  func getSnapshot(in context: Context, completion: @escaping (FuelEntry) -> Void) {
    completion(FuelEntry(date: Date(), data: SnapshotStore.load() ?? .placeholder))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<FuelEntry>) -> Void) {
    let entry = FuelEntry(date: Date(), data: SnapshotStore.load() ?? .placeholder)
    completion(Timeline(entries: [entry], policy: .never))
  }
}
