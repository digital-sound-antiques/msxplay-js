import { runAudioWorklet, AudioRendererWorkletProcessor } from "webaudio-stream-player/dist/workers/audio-renderer-worklet-processor.js";

console.debug('renderer-worlket is loaded.');
runAudioWorklet('renderer', AudioRendererWorkletProcessor);