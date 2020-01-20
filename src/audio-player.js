export default class AudioPlayer {
  constructor(audioCtx, destination, renderer) {
    this.audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    this.destination = destination || this.audioCtx.destination;
    this.sampleRate = this.audioCtx.sampleRate;
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 1.0;
    this.masterVolumeNode = this.audioCtx.createGain();
    this.masterVolumeNode.gain.value = 3.0;
    // Note: Chrome and FireFox compress overflow in GainNode. Safari does not.
    this.gainNode.connect(this.masterVolumeNode);
    this.masterVolumeNode.connect(this.destination);
    this.scriptNodeDestination = this.gainNode;
    this.renderer = renderer;
  }
  getTotalTime() {
    return Math.round((this.waveTotalSize / this.sampleRate) * 1000);
  }
  getPlayedTime() {
    return Math.round((this.waveReadPos / this.sampleRate) * 1000);
  }
  getBufferedTime() {
    return Math.round((this.waveWritePos / this.sampleRate) * 1000);
  }
  _changeState(newState) {
    if (this._state != newState) {
      this._state = newState;
      // TODO issue stateChanged event;
    }
  }
  getState() {
    return this._state;
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
    if (this.scriptNode) {
      if (this.dummyNode) {
        this.dummyNode.disconnect();
        this.dummyNode = null;
      }
      // Since Firefox 57 seems to call onaudioprocess after disconnect() if multiple
      // ScriptNodes are instanceated, onaudioprocess property should be cleared before
      // release the ScriptNode.
      this.scriptNode.onaudioprocess = null;
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.renderedTime = 0;
    this.consumedTime = 0;
    this.waveWritePos = 0;
    this.waveReadPos = 0;
    this._state = "standby";
  }
  setMaxPlayTime(time) {
    this.maxPlayTime = time;
    this.waveBuffer = new Float32Array(Math.round((this.sampleRate * time) / 1000));
    this.waveTotalSize = this.waveBuffer.length;
  }
  _render(samples) {
    var start = Date.now();
    var waves = this.renderer(this.renderedTime, samples);
    if (waves == null) {
      this.waveTotalSize = this.waveWritePos;
      return false;
    }
    for (var i = 0; i < samples; i++) {
      this.waveBuffer[this.waveWritePos++] = waves[i] / 32768;
    }
    this.renderedTime = (this.waveWritePos / this.sampleRate) * 1000;
    this.consumedTime += Date.now() - start;
    this.renderSpeed = this.renderedTime / this.consumedTime;
    return true;
  }
  onRender() {
    var interval = Date.now() - this.lastOnRenderAt;
    var samples = Math.round(((this.sampleRate * interval) / 1000) * Math.max(1.0, this.renderSpeed));
    if (!this._render(samples)) {
      if (this.timerId != null) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }
    this.lastOnRenderAt = Date.now();
  }
  _onAudioProcess(event) {
    var i;
    var samples = event.outputBuffer.length;
    var outData = event.outputBuffer.getChannelData(0);
    if (this._state == "playing") {
      // Do not generate wave in this handler because if this handler consume longer time,
      // the browser often stop to fire the `audioprocess` event. (may be a bug of the browser).
      var bufferRemains = this.waveWritePos - this.waveReadPos;
      if (this.waveWritePos < this.waveTotalSize) {
        if (bufferRemains < this.sampleRate) {
          // return;
        }
      }
      for (i = 0; i < samples; i++) {
        outData[i] = this.waveBuffer[this.waveReadPos];
        if (this.waveReadPos < this.waveWritePos - 1) {
          this.waveReadPos++;
        }
      }
      if (this.waveReadPos == this.waveTotalSize - 1) {
        this._changeState("finished");
      }
    } else {
      for (i = 0; i < samples; i++) {
        outData[i] = 0;
      }
    }
  }
  play(maxPlayTime) {
    this.setMaxPlayTime(maxPlayTime || this.maxPlayTime || 60 * 5 * 1000);
    this._recycle();
    this.scriptNode = this.audioCtx.createScriptProcessor(8192, 1, 1);
    this.scriptNode.onaudioprocess = this._onAudioProcess.bind(this);
    this.scriptNode.connect(this.scriptNodeDestination);
    this.dummyNode = this.audioCtx.createOscillator();
    this.dummyNode.frequency.value = 0;
    this.dummyNode.start(0);
    this.dummyNode.connect(this.scriptNode);
    this.renderSpeed = 0.0;
    this._render(this.sampleRate * 2); // pre-buffer 2.0s
    this.lastOnRenderAt = Date.now();
    this.timerId = setInterval(this.onRender.bind(this), 0);
    this._changeState("playing");
  }
  stop() {
    this._recycle();
  }
  pause() {
    if (this._state == "playing") {
      this.scriptNode.disconnect();
      this._changeState("paused");
    }
  }
  resume() {
    if (this._state == "paused") {
      this.scriptNode.connect(this.scriptNodeDestination);
      this._changeState("playing");
    }
  }
  isPlaying() {
    return this._state == "playing";
  }
  isPaused() {
    return this._state == "paused";
  }
  seekTo(posInMs) {
    var seekPos = Math.round((this.sampleRate * posInMs) / 1000);
    if (seekPos < this.waveWritePos) {
      this.waveReadPos = seekPos;
    }
  }
  release() {
    this._recycle();
    this.audioCtx.close();
    this.audioCtx = null;
  }
}
