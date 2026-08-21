// Minimal ambient declarations for browser APIs missing from the current TS DOM lib.
interface Window {
  trustedTypes?: {
    createPolicy: (
      name: string,
      policy: {
        createHTML?: (input: string) => string;
        createScriptURL?: (input: string) => string;
      }
    ) => unknown;
  };
  webkitAudioContext?: typeof AudioContext;
  webkitSpeechRecognition?: unknown;
}
