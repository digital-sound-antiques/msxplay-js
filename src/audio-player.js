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
    return 60 * 5 * 1000;
  }
  getPlayedTime() {
    return this.player.progress?.renderer?.currentTime;
  }
  getBufferedTime() {
    return this.player.progress?.renderer?.bufferedTime;
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
  setMaxPlayTime(time) {
    this.maxPlayTime = time;
  }

  async play(data, maxPlayTime) {
    this.setMaxPlayTime(maxPlayTime || this.maxPlayTime || 60 * 5 * 1000);
    console.log(this.audioCtx.state);
    if (this.audioCtx.state != "running") {
      await this.audioCtx.resume();
      console.log(this.audioCtx.state);
    }
    this.player.play({ data });
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
    console.log("AudioPlayer.release()");
    this.player.dispose();
    this.audioCtx.close();
    this.audioCtx = null;
  }
}
