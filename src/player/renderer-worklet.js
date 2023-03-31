import { runAudioWorklet, AudioRendererWorkletProcessor } from "webaudio-stream-player/dist/workers/audio-renderer-worklet-processor.js";

console.log('kss-renderer-worlket');
runAudioWorklet('renderer', AudioRendererWorkletProcessor);