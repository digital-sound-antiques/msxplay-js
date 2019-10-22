module.exports = (function() {
  var AudioPlayer = function(audioCtx, destination, renderer) {
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
  };

  AudioPlayer.prototype.getTotalTime = function() {
    return Math.round((this.waveTotalSize / this.sampleRate) * 1000);
  };

  AudioPlayer.prototype.getPlayedTime = function() {
    return Math.round((this.waveReadPos / this.sampleRate) * 1000);
  };

  AudioPlayer.prototype.getBufferedTime = function() {
    return Math.round((this.waveWritePos / this.sampleRate) * 1000);
  };

  AudioPlayer.prototype._changeState = function(newState) {
    if (this._state != newState) {
      this._state = newState;
      // TODO issue stateChanged event;
    }
  };

  AudioPlayer.prototype.getState = function() {
    return this._state;
  };

  AudioPlayer.prototype.getMasterVolume = function() {
    return this.masterVolumeNode.gain.value;
  };

  AudioPlayer.prototype.setMasterVolume = function(gain) {
    this.masterVolumeNode.gain.value = gain;
  };

  AudioPlayer.prototype.getOutputGain = function() {
    return this.gainNode.gain.value;
  };

  AudioPlayer.prototype.setOutputGain = function(gain) {
    this.gainNode.gain.value = gain;
  };

  AudioPlayer.prototype._recycle = function() {
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
  };

  AudioPlayer.prototype.setMaxPlayTime = function(time) {
    this.maxPlayTime = time;
    this.waveBuffer = new Float32Array(Math.round((this.sampleRate * time) / 1000));
    this.waveTotalSize = this.waveBuffer.length;
  };

  AudioPlayer.prototype._render = function(samples) {
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
  };

  AudioPlayer.prototype.onRender = function() {
    var interval = Date.now() - this.lastOnRenderAt;
    var samples = Math.round(((this.sampleRate * interval) / 1000) * Math.max(1.0, this.renderSpeed));
    if (!this._render(samples)) {
      if (this.timerId != null) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    this.lastOnRenderAt = Date.now();
  };

  AudioPlayer.prototype._onAudioProcess = function(event) {
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
  };

  AudioPlayer.prototype.play = function(maxPlayTime) {
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
    this._render(this.sampleRate); // pre-buffer 1.0s
    this.lastOnRenderAt = Date.now();

    this.timerId = setInterval(this.onRender.bind(this), 0);

    this._changeState("playing");
  };

  AudioPlayer.prototype.stop = function() {
    this._recycle();
  };

  AudioPlayer.prototype.pause = function() {
    if (this._state == "playing") {
      this.scriptNode.disconnect();
      this._changeState("paused");
    }
  };

  AudioPlayer.prototype.resume = function() {
    if (this._state == "paused") {
      this.scriptNode.connect(this.scriptNodeDestination);
      this._changeState("playing");
    }
  };

  AudioPlayer.prototype.isPlaying = function() {
    return this._state == "playing";
  };

  AudioPlayer.prototype.isPaused = function() {
    return this._state == "paused";
  };

  AudioPlayer.prototype.seekTo = function(posInMs) {
    var seekPos = Math.round((this.sampleRate * posInMs) / 1000);
    if (seekPos < this.waveWritePos) {
      this.waveReadPos = seekPos;
    }
  };

  AudioPlayer.prototype.release = function() {
    this._recycle();
    this.audioCtx.close();
    this.audioCtx = null;
  };

  return AudioPlayer;
})();
