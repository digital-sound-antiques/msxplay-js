import { KSSPlay } from "libkss-js";
// import Lamejs from "lamejs";

export default class KSS2MP3 {
  constructor(sampleRate, kbps) {
    // this.mp3encoder = new Lamejs.Mp3Encoder(1, sampleRate, kbps);
    this.sampleRate = sampleRate;
    this.bitRate = kbps;
    this.kssplay = null;
    this.mp3data = [];
  }

  release() {
    if (this.kssplay != null) {
      this.kssplay.release();
      this.kssplay = null;
    }
  }

  /**
   * @typedef {Object} EncodeOptions
   * @prop {number} [gain=1.0]
   * @prop {number} [silentLimit=3000]
   * @prop {number} [loop=2]
   * @prop {number} [playTime=600000]
   * @prop {number} [fadeTime=3000]
   * @prop {number} [cpuSpeed=0]
   * @prop {Object} [rcf]
   * @prop {number} [rcf.resistor=0]
   * @prop {number} [rcf.capacitor=0]
   * @prop {Object} [quality]
   * @prop {Object} [quality.psg=1]
   * @prop {Object} [quality.scc=0]
   * @prop {Object} [quality.opll=1]
   * @prop {Object} [quality.opl=1]
   */

  /**
   * @param {EncodeOptions} [opts]
   */
  async encode(kss, song, callback, opts) {
    if (this.mp3encoder == null) {
      // Note zhuker/lamejs#582bbba6a12f981b984d8fb9e1874499fed85675 (based on lamejs 1.2.1) is required for dynamic import.
      // See https://github.com/zhuker/lamejs/pull/87
      const { Mp3Encoder } = await import(/* webpackChunkName: "lamejs" */ "lamejs");
      this.mp3encoder = new Mp3Encoder(1, this.sampleRate, this.bitRate);
    }

    opts = opts || {};

    const rcf = {
      resistor: 0,
      capacitor: 0,
      ...(opts.rcf ?? {}),
    };

    const quality = {
      psg: 1,
      scc: 0,
      opll: 1,
      opl: 1,
      ...(opts.quality ?? {}),
    };

    this.opts = {
      gain: 1.0,
      silentLimit: 3000,
      loop: 2,
      playTime: 600 * 1000,
      fadeTime: 3000,
      cpuSpeed: 0,
      ...opts,
    };

    if (this.kssplay) {
      this.kssplay.release();
      this.kssplay = null;
    }
    this.kssplay = new KSSPlay(this.sampleRate);
    this.kssplay.setDeviceQuality(quality);
    this.kssplay.setSilentLimit(this.opts.silentLimit);
    this.kssplay.setRCF(rcf.resistor, rcf.capacitor);
    this.kssplay.setData(kss);
    this.kssplay.reset(song, this.opts.cpuSpeed);
    this.callbackFunc = callback || function () {};
    this.elapsed = 0;
    this.maxDuration = this.opts.playTime - this.opts.fadeTime;
    this.mp3data = [];
    this.processEncode();
  }

  addDataBlock(block) {
    if (0 < block.length) {
      this.mp3data.push(block);
    }
  }

  processEncode() {
    let packetSize = this.sampleRate;
    let samples = this.kssplay.calc(packetSize);
    let gain = this.opts.gain * 2.0;
    if (gain !== 1.0) {
      for (var i = 0; i < samples.length; i++) {
        samples[i] = Math.max(-32768, Math.min(samples[i] * gain, 32767));
      }
    }
    this.addDataBlock(this.mp3encoder.encodeBuffer(samples));
    this.elapsed += (1000 * packetSize) / this.sampleRate;
    if (this.kssplay.getStopFlag() || this.kssplay.getFadeFlag() === 2) {
      this.addDataBlock(this.mp3encoder.flush());
      this.callbackFunc(this.elapsed, this.mp3data, true);
      return;
    }
    if (!this.callbackFunc(this.elapsed, this.mp3data, false)) {
      // abort the encode process
      this.addDataBlock(this.mp3encoder.flush());
      return;
    }
    if (this.kssplay.getFadeFlag() === 0) {
      if (
        this.maxDuration - this.elapsed < this.opts.fadeTime ||
        this.opts.loop <= this.kssplay.getLoopCount()
      ) {
        this.kssplay.fadeStart(this.opts.fadeTime);
      }
    }
    setTimeout(this.processEncode.bind(this), 0);
  }
}
