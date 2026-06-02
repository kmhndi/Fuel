// Custom entry point. expo-router ships no `index.js`, so we import its entry
// (which registers the root component) and then register the Android widget
// headless task. The task handler is Android-only and pulls in the widget
// render tree, so it's lazily required behind a platform guard to keep it out
// of the iOS/web bundle's startup path.
import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
