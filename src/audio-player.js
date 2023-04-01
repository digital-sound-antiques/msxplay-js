import { KSSPlayer } from "./player/kss-player.js";

export class AudioPlayer {
  constructor(audioCtx, destination) {
    this.audioCtx = audioCtx || new AudioContext();
    this.player = new KSSPlayer("worklet");
    this.destination = destination || this.audioCtx.destination;
    this.sampleRate = this.audioCtx.sampleRate;
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 1.0;
    this.masterVolumeNode = this.audioCtx.createGain();
    this.masterVolumeNode.gain.value = 3.0;
    this.gainNode.connect(this.masterVolumeNode);
    this.masterVolumeNode.connect(this.destination);
    this.player.connect(this.gainNode);
  }

  get renderSpeed() {
    return this.player.progress?.decoder?.decodeSpeed ?? 0;
  }

  getTotalTime() {
    if (this.player.progress?.renderer?.isFulFilled) {
      return this.player.progress?.renderer?.bufferedTime;
    }
    return Math.max(60 * 5 * 1000, this.player.progress?.renderer?.bufferedTime ?? 0);
  }
  getPlayedTime() {
    return this.player.progress?.renderer?.currentTime ?? 0;
  }
  getBufferedTime() {
    return this.player.progress?.renderer?.bufferedTime ?? 0;
  }

  getState() {
    switch (this.player.state) {
      case "initial":
        return "standby";
      case "playing":
      case "paused":
        return this.player.state;
      default:
        return "finished";
    }
  }
  getMasterVolume() {
    return this.masterVolumeNode.gain.value;
  }
  setMasterVolume(gain) {
    this.masterVolumeNode.gain.value = gain;
  }
  getOutputGain() {
    return this.gainNode.gain.value;
  }
  setOutputGain(gain) {
    this.gainNode.gain.value = gain;
  }
  _recycle() {
    this.player.abort();
  }

  async play(data, args) {
    console.debug(`AudioContext.state=${this.audioCtx.state}`);
    if (this.audioCtx.state != "running") {
      await this.audioCtx.resume();
      console.debug(`AudioContext.state=${this.audioCtx.state}`);
    }
    this.player.play({ data, ...args });
  }
  stop() {
    this.player.abort();
  }
  pause() {
    this.player.pause();
  }
  resume() {
    this.player.resume();
  }
  isPlaying() {
    return this.player.state == "playing";
  }
  isPaused() {
    return this.player.state == "paused";
  }
  seekTo(posInMs) {
    this.player.seekInTime(posInMs);
  }
  release() {
    console.debug("AudioPlayer.release()");
    this.player.dispose();
    this.audioCtx.close();
    this.audioCtx = null;
  }
}
