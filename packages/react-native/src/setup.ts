import { registerGlobals } from "@livekit/react-native";

// Must run before any module that transitively imports livekit-client.
// ES module evaluation order guarantees this file's body runs before
// later imports in the module that imported it.
registerGlobals();
