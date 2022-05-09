import { KSSPlay } from "libkss-js";

function rawToWav(rate, data) {
  const nch = 1;
  const bit = 16;
  const dataSize = 44 + data.length * 2;
  const blockSize = (nch * bit) >> 3;
  const buf = new ArrayBuffer(dataSize);
  const view = new DataView(buf, 0);
  view.setUint32(0, 0x52494646); // 'RIFF'
  view.setUint32(4, dataSize - 8, true); // size of RIFF  chunk
  view.setUint32(8, 0x57415645); // 'WAVE'
  view.setUint32(12, 0x666d7420); // 'fmt '
  view.setUint32(16, 16, true); // size of format chunk (16)
  view.setUint16(20, 1, true); // WAVE_FORMAT_PCM
  view.setUint16(22, nch, true); // channels=1
  view.setUint32(24, rate, true); // samples per sec
  view.setUint32(28, nch * 2 * rate, true); // byte per sec
  view.setUint16(32, blockSize, true); // block size
  view.setUint16(34, nch * bit, true); // bit per sample
  view.setUint32(36, 0x64617461); // 'data'
  view.setUint32(40, blockSize * data.length, true); // 'data'

  const wavbuf = new DataView(buf, 44);
  for (let i = 0; i < data.length; i++) {
    wavbuf.setInt16(i * 2, data[i], true);
  }
  return buf;
}

export default class KSS2WAV {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.kssplay = null;
    this.wavdata = [];
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
  encode(kss, song, callback, opts) {
    opts = opts || {};
    var assign = require("object-assign");
    var rcf = assign({ resistor: 0, capacitor: 0 }, opts.rcf);
    var quality = assign({ psg: 1, scc: 0, opll: 1, opl: 1 }, opts.quality);
    this.opts = assign(
      {
        gain: 1.0,
        silentLimit: 3000,
        loop: 2,
        playTime: 600 * 1000,
        fadeTime: 3000,
        cpuSpeed: 0
      },
      opts
    );

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
    this.callbackFunc = callback || function() {};
    this.elapsed = 0;
    this.maxDuration = this.opts.playTime - this.opts.fadeTime;
    this.wavdata = [];
    this.processEncode();
  }

  addDataBlock(block) {
    for (let i = 0; i < block.length; i++) {
      this.wavdata.push(block[i]);
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
    this.addDataBlock(samples);
    this.elapsed += (1000 * packetSize) / this.sampleRate;
    if (this.kssplay.getStopFlag() || this.kssplay.getFadeFlag() === 2) {
      this.callbackFunc(this.elapsed, rawToWav(this.sampleRate, this.wavdata), true);
      return;
    }
    if (!this.callbackFunc(this.elapsed, null, false)) {
      // abort the encode process
      return;
    }
    if (this.kssplay.getFadeFlag() === 0) {
      if (this.maxDuration - this.elapsed < this.opts.fadeTime || this.opts.loop <= this.kssplay.getLoopCount()) {
        this.kssplay.fadeStart(this.opts.fadeTime);
      }
    }
    setTimeout(this.processEncode.bind(this), 0);
  }
}
