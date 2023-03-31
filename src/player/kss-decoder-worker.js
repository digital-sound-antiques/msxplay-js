import { KSS, KSSPlay } from 'libkss-js';
import { AudioDecoderWorker } from 'webaudio-stream-player';

class KSSDecoderWorker extends AudioDecoderWorker {
  constructor(worker) {
    super(worker);
  }

  _kss = null;
  _kssplay = null;
  _maxDuration = 60 * 1000 * 5;
  _fadeDuration = 5 * 1000;
  _decodeFrames = 0;

  async init(args) {
    await KSSPlay.initialize();
    console.log('KSSPlay.initialized');
  }

  async start(args) {
    const options = args;

    let data;
    if (options.data instanceof Uint8Array) {
      data = options.data;
    } else {
      data = new Uint8Array(options.data);
    }

    this._kss = new KSS(data, options.label ?? "");

    if (this._kssplay == null) {
      this._kssplay = new KSSPlay(this.sampleRate);
    }

    this._kssplay.setData(this._kss);
    this._kssplay.setDeviceQuality({ psg: 1, opll: 1, scc: 0, opl: 1 });
    this._kssplay.reset(options.song ?? 0, options.cpu ?? 0);
    this._fadeDuration = options.fadeDuration ?? this._fadeDuration;
    this._maxDuration = options.duration ?? this._maxDuration;
    this._decodeFrames = 0;
  }

  async process() {

    if (this._kssplay?.getFadeFlag() == 2 || this._kssplay?.getStopFlag() != 0) {
      return null;
    }

    const time = this._decodeFrames / this.sampleRate / 1000;

    if (this._kssplay?.getLoopCount() >= 2 || this._maxDuration - this._fadeDuration < time) {
      if (this._kssplay?.getFadeFlag() == 0) {
        this._kssplay?.fadeStart(this._fadeDuration);
      }
    }

    if (this._maxDuration < time) {
      return null;
    }

    return [this._kssplay.calc(this.sampleRate)];
  }

  async abort() {
    this._kss?.release();
    this._kss = null;
  }

  async dispose() {
    this._kssplay?.release();
    this._kssplay = null;
    this._kss?.release();
    this._kss = null;
  }
}

console.log('kss-decoder-worker');

/* `self as any` is workaround. See: [issue#20595](https://github.com/microsoft/TypeScript/issues/20595) */
const decoder = new KSSDecoderWorker(self);

