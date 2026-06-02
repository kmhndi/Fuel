import SwiftUI
import WidgetKit

@main
struct FuelWidgetBundle: WidgetBundle {
  var body: some Widget {
    CaloriesWidget()
    ProteinWidget()
    WaterWidget()
    SummaryWidget()
    FuelLockWidget()
  }
}
