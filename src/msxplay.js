import { KSS, KSSPlay } from "libkss-js";
import KSS2MP3 from "./kss2mp3";
import KSS2WAV from "./kss2wav";
import AudioPlayer from "./audio-player";

export default class MSXPlay {

  static async initialize() {
    return KSSPlay.initialize();
  }

  constructor(audioCtx, destination) {
    this.audioPlayer = new AudioPlayer(audioCtx, destination, this._generateWave.bind(this));
    this.sampleRate = this.audioPlayer.sampleRate;
    this.kssplay = null;
    this.kss = null;
    this.maxCalcSamples = this.sampleRate;
  }

  async toVGM(data, duration, callback) {
    const kss = new KSS(data);
    const vgm = await kss.toVGMAsync({
      duration: duration, callback: callback
    });
    kss.release();
    return vgm;
  }

  audio_encode(type, data, song, callback, opts) {
    opts = opts || {};

    if (this.kss2mp3 != null) {
      this.kss2mp3.release();
      this.kss2mp3 = null;
    }
    if (this.kss2wav != null) {
      this.kss2wav.release();
      this.kss2wav = null;
    }

    if (this.tempkss != null) {
      this.tempkss.release();
    }
    this.tempkss = new KSS(data);

    if (type === "mp3") {
      this.kss2mp3 = new KSS2MP3(opts.sampleRate || 44100, opts.bitRate || 192);
      this.kss2mp3.encode(this.tempkss, song, callback, opts);
    } else {
      this.kss2wav = new KSS2WAV(opts.sampleRate || 44100);
      this.kss2wav.encode(this.tempkss, song, callback, opts);
    }
  }
  _generateWave(currentTime, samples) {
    if (this.kssplay.getStopFlag() || this.kssplay.getFadeFlag() == 2) {
      return null;
    }
    if (this.kssplay.getFadeFlag() == 0) {
      var loop = this.kssplay.getLoopCount();
      var remains = this.maxPlayTime - currentTime;
      if (this.loopCount <= loop || (this.fadeTime && remains <= this.fadeTime)) {
        this.kssplay.fadeStart(this.fadeTime);
      }
    }
    return this.kssplay.calc(samples);
  }
  getState() {
    return this.audioPlayer.getState();
  }
  getMasterVolume() {
    return this.audioPlayer.getMasterVolume();
  }
  setMasterVolume(gain) {
    this.audioPlayer.setMasterVolume(gain);
  }
  getOutputGain() {
    return this.audioPlayer.getOutputGain();
  }
  setOutputGain(gain) {
    return this.audioPlayer.setOutputGain(gain);
  }
  getTitle() {
    return this.kss ? this.kss.getTitle() : "";
  }

  setData(kss, song, options) {
    options = options || {};
    this.kss = kss;
    this.song = song;
    this.loopCount = options.loopCount || 2;
    this.fadeTime = options.fadeTime || 5000;
    if (this.kssplay != null) {
      this.kssplay.release();
      this.kssplay = null;
    }
    this.kssplay = new KSSPlay(this.sampleRate);
    if (options.rcf) {
      this.kssplay.setRCF(options.rcf.resistor, options.rcf.capacitor);
    } else {
      this.kssplay.setRCF(0, 0);
    }
    this.kssplay.setSilentLimit(5000);
    this.kssplay.setDeviceQuality({ psg: 1, scc: 0, opll: 1, opl: 1 });
    this.kssplay.setData(kss);
    this.kssplay.reset(song, options.cpu || 0);
    this.maxPlayTime = Math.min(20 * 60 * 1000, options.duration || 5 * 60 * 1000);
    if (options.gain != null) {
      this.audioPlayer.setOutputGain(Number.isNaN(options.gain) ? 1.0 : options.gain);
    }
    if (options.debug_mgs) {
      this._skipToDebugMarker();
    }
  }

  _skipToDebugMarker() {
    const interval = Math.floor(this.sampleRate / 60);
    const maxTick = (this.sampleRate * this.maxPlayTime) / 1000;
    let tick = 0;
    while (tick <= maxTick) {
      this.kssplay.calcSilent(interval);
      const jumpct = this.kssplay.getMGSJumpCount();
      if (jumpct != 0) {
        break;
      }
      tick += interval;
    }
  }

  play() {
    this.audioPlayer.play(this.maxPlayTime);
  }
  stop() {
    this.audioPlayer.stop();
  }
  pause() {
    this.audioPlayer.pause();
  }
  resume() {
    this.audioPlayer.resume();
  }
  isPlaying() {
    return this.audioPlayer.isPlaying();
  }
  isPaused() {
    return this.audioPlayer.isPaused();
  }
  seekTo(posInMs) {
    this.audioPlayer.seekTo(posInMs);
  }
  getTotalTime() {
    return this.audioPlayer.getTotalTime();
  }
  getPlayedTime() {
    return this.audioPlayer.getPlayedTime();
  }
  getBufferedTime() {
    return this.audioPlayer.getBufferedTime();
  }
  getRenderSpeed() {
    return this.audioPlayer.renderSpeed;
  }
  release() {
    if (this.kss2mp3 != null) {
      this.kss2mp3.release();
      this.kss2mp3 = null;
    }
    if (this.tempkss != null) {
      this.tempkss.release();
      this.tempkss = null;
    }
    if (this.kssplay != null) {
      this.kssplay.release();
      this.kssplay = null;
      this.audioPlayer.release();
      this.audioPlayer = null;
    }
  }
}
