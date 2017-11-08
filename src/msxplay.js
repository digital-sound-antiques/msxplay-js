module.exports = (function() {

	"use strict"

	var KSS = require('./kss');
	
	var Module = require('exports-loader?Module!../build/libkss');

	var MSXPlay = function(audioCtx, destination) {

		this.audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
		this.destination = destination || this.audioCtx.destination;

		this.sampleRate = this.audioCtx.sampleRate;

		// Note: BiquadFilterNode will hungs up if its input audio buffer contains `undefined` value.
		// (`null` value is acceptable but `undefined` makes the problem.)
		//this.filterNode = this.audioCtx.createBiquadFilter();
		//this.filterNode.type = "lowshelf";
		//this.filterNode.frequency.value = 4000;
		//this.filterNode.gain.value = 6.0;
		//this.filterNode.connect(this.destination);

		// Note: Chrome and FireFox compress overflow in GainNode. Safari does not.
		this.gainNode = this.audioCtx.createGain();
		this.gainNode.gain.value = 1.0;
		this.masterVolumeNode = this.audioCtx.createGain();
		this.masterVolumeNode.gain.value = 3.0;

		this.gainNode.connect(this.masterVolumeNode);
		this.masterVolumeNode.connect(this.destination);		

		this.scriptNodeDestination = this.gainNode;

		this.kssplay = Module.ccall('KSSPLAY_new','number',['number','number','number'],[this.sampleRate,1,16]);
		Module.ccall('KSSPLAY_set_silent_limit',null,['number','number'],[this.kssplay,3000]);
		// Set opll quality high
		Module.ccall('KSSPLAY_set_device_quality',null,['number','number','number'],[this.kssplay,2,1]);

		this.kss = null;

		this.maxCalcSamples = this.sampleRate;
		this.calcBuffer = Module._malloc(this.maxCalcSamples * 2);
		this.calcBufferArray = new Int16Array(Module.HEAPU8.buffer, this.calcBuffer, this.sampleRate);

		setInterval(this._generateWaveBackground.bind(this),50);

	};

	MSXPlay.prototype.getTotalTime = function() {
		return Math.round(this.waveTotalSize / this.sampleRate * 1000);
	};

	MSXPlay.prototype.getPlayedTime = function() {
		return Math.round(this.waveReadPos / this.sampleRate * 1000);
	};

	MSXPlay.prototype.getBufferedTime = function() {
		return Math.round(this.waveWritePos / this.sampleRate * 1000);
	};

	MSXPlay.prototype._generateWaveBackground = function() {

		if(this.lastGenerateWaveAt == null) return;

		this.intervalTime = (Date.now() - this.lastGenerateWaveAt);

		var samples = this.sampleRate * this.intervalTime / 1000;

		if(1.0 < this.renderSpeed) {
			samples = Math.floor(samples * this.renderSpeed);
		}

		samples = Math.min(samples,this.maxCalcSamples);

		this._generateWave(samples);

		this.lastGenerateWaveAt = Date.now();

	};

	var KSSPLAY_calc = Module.cwrap('KSSPLAY_calc',null,['number','number','number']);
	var KSSPLAY_get_loop_count = Module.cwrap('KSSPLAY_get_loop_count','number',['number']);
	var KSSPLAY_get_fade_flag = Module.cwrap('KSSPLAY_get_fade_flag','number',['number']);
	var KSSPLAY_fade_start = Module.cwrap('KSSPLAY_fade_start',null,['number','number']);
	var KSSPLAY_get_stop_flag = Module.cwrap('KSSPLAY_get_stop_flag','number',['number']);

	MSXPlay.prototype._generateWave = function(samples) {
	
		if(this.maxCalcSamples<samples) {
			throw new Error();
		}

		if (KSSPLAY_get_stop_flag(this.kssplay) || KSSPLAY_get_fade_flag(this.kssplay) == 2/*KSSPLAY_FADE_END*/) {
			this.waveTotalSize = this.waveWritePos;
		}

		var samples = Math.min(this.waveTotalSize - this.waveWritePos, samples);

		if(0<samples) {

			var start = Date.now();
	
			KSSPLAY_calc(this.kssplay,this.calcBuffer,samples);
			for(var i=0;i<samples;i++) {
				this.waveBuffer[this.waveWritePos++] = this.calcBufferArray[i] / 32768;
			}

			if(KSSPLAY_get_fade_flag(this.kssplay) == 0) {
				var loop = KSSPLAY_get_loop_count(this.kssplay);
				var remains = 1000 * (this.waveTotalSize - this.waveWritePos) / this.sampleRate;
				if (this.loopCount <= loop || (this.fadeTime && remains <= this.fadeTime)) {
					KSSPLAY_fade_start(this.kssplay, this.fadeTime);
				}
			}
			
			this.renderedTime += samples / this.sampleRate * 1000;
			this.requiredTime += (Date.now() - start);
			this.renderSpeed = this.renderedTime / this.requiredTime;

			return samples;
		}
		
		return 0;
		
	};

	MSXPlay.prototype._onAudioProcess = function(event) {

		var i;
		var samples = event.outputBuffer.length;
		var outData = event.outputBuffer.getChannelData(0);

		if(this._state == "playing") {

			// Do not generate wave in this handler because if this handler consume longer time, 
			// the browser often stop to fire the `audioprocess` event. (may be a bug of the browser).

			var bufferRemains = this.waveWritePos - this.waveReadPos;

			if( this.waveWritePos < this.waveTotalSize ) {
				if( bufferRemains < this.sampleRate ) {
					return;
				}
			}

			for(i=0;i<samples;i++) {
				outData[i] = this.waveBuffer[this.waveReadPos];
				if(this.waveReadPos < this.waveWritePos - 1) {
					this.waveReadPos++;
				}
			}

			if(this.waveReadPos == this.waveTotalSize - 1) {
				this._changeState("finished");
			}

		} else {
			for(i=0;i<samples;i++) {
				outData[i] = 0;
			}
		}

	};

	MSXPlay.prototype._changeState = function(newState) {
		if(this._state != newState) {
			this._state = newState;
			// TODO issue stateChanged event;
		}
	};

	MSXPlay.prototype.getState = function() {
		return this._state;
	};

	MSXPlay.prototype.getMasterVolume = function() {
		return this.masterVolumeNode.gain.value;
	};

	MSXPlay.prototype.setMasterVolume = function(value) {
		this.masterVolumeNode.gain.value = value;
	};

	MSXPlay.prototype.getOutputGain = function() {
		this.gainNode.gain.value;
	};

	MSXPlay.prototype.getTitle = function() {
		return this.kss?this.kss.getTitle():"";
	};

	MSXPlay.prototype.setData = function(kss,song,options) {

		options = options || {};

		this.kss = kss;
		this.song = song;

		this.loopCount = options.loopCount || 2;
		this.fadeTime = options.fadeTime || 5000;

		Module.ccall('KSSPLAY_set_data',null,['number','number'],[this.kssplay,kss.obj]);
		Module.ccall('KSSPLAY_reset',null,['number','number','number'],[this.kssplay,song||0,0]);

		if(this.scriptNode) {
			if(this.dummyNode) {
				this.dummyNode.disconnect();
				this.dummyNode = null;
			}
			this.scriptNode.disconnect();
			this.scriptNode = null;
		}

		this.renderedTime = 0;
		this.requiredTime = 0;
		this.waveWritePos = 0;
		this.waveReadPos = 0;
		this._state = "standby";

		var duration = Math.min(20 * 60 * 1000, options.duration || 5 * 60 * 1000);
		this.waveBuffer = new Float32Array(Math.round(this.sampleRate * duration / 1000));
		this.waveTotalSize = this.waveBuffer.length;

		if(options.gain) {
			this.gainNode.gain.value = options.gain;
		}

		this.renderSpeed = 0.0;

		this._generateWave(this.sampleRate); // pre-buffer 1.0s

		var self = this;
		this.lastGenerateWaveAt = Date.now();
	};

	MSXPlay.prototype.play = function() {

		this.scriptNode = this.audioCtx.createScriptProcessor(8192,1,1);
		this.scriptNode.onaudioprocess = this._onAudioProcess.bind(this);
		this.scriptNode.connect(this.scriptNodeDestination);

		this.dummyNode = this.audioCtx.createOscillator();
		this.dummyNode.frequency.value = 0;
		this.dummyNode.start(0);
		this.dummyNode.connect(this.scriptNode);

		this._changeState("playing");
	};

	MSXPlay.prototype.stop = function() {
		if(this.scriptNode) {
			this.scriptNode.disconnect();
			this.scriptNode = null;
		}
		this._changeState("standby");
	};

	MSXPlay.prototype.pause = function() {
		if(this._state == "playing") {
			this.scriptNode.disconnect();
			this._changeState("paused");
		}
	};

	MSXPlay.prototype.resume = function() {
		if(this._state == "paused") {
			this.scriptNode.connect(this.scriptNodeDestination);
			this._changeState("playing");
		}
	};

	MSXPlay.prototype.isPlaying = function() {
		return this._state == "playing";
	};

	MSXPlay.prototype.isPaused = function() {
		return this._state == "paused";
	};

	MSXPlay.prototype.seekTo = function(posInMs) {
		var seekPos = Math.round(this.sampleRate * posInMs / 1000);
		if(seekPos < this.waveWritePos) {
			this.waveReadPos = seekPos;
		}
	};

	MSXPlay.prototype.release = function() {
		Module.ccall('KSSPLAY_delete',null,['number'],[this.kssplay]);
		this.kssplay = null;
		this.audioCtx.close();
		Module._free(this.calcBuffer);
	};

	return MSXPlay;

}());
