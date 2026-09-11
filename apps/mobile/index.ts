import { registerRootComponent } from "expo";

import App from "./App";
import { defineRecordingTask } from "./gps/background";

// The background location task has to exist before any job names it, in
// every JS context — including the headless one Android starts when the
// app process is dead and a batch of fixes arrives (session 07).
defineRecordingTask();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
