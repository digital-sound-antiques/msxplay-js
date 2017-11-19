module.exports = (function() {

	'use strict';

	var KSS = require('libkss-js').KSS;
	var KSSPlay = require('libkss-js').KSSPlay;
	var KSS2MP3 = require('./kss2mp3');
	var AudioPlayer = require('./audio-player');

	var MSXPlay = function(audioCtx, destination) {

		this.audioPlayer = new AudioPlayer(audioCtx, destination, this._generateWave.bind(this));
		this.sampleRate = this.audioPlayer.sampleRate;

		this.kssplay = new KSSPlay(this.sampleRate);
		this.kssplay.setRCF(0,0);
		this.kssplay.setSilentLimit(3000);
		this.kssplay.setDeviceQuality({'psg':1,'scc':0,'opll':1,'opl':1});
		this.kss = null;

		this.maxCalcSamples = this.sampleRate;
	};

	MSXPlay.prototype.mp3encode = function(data, song, callback, opts) {
		opts = opts || {};

		if (this.kss2mp3 != null) {
			this.kss2mp3.release();
		}
		if (this.tempkss != null) {
			this.tempkss.release();
		}

		this.tempkss = new KSS(data);
		this.kss2mp3 = new KSS2MP3(opts.sampleRate || 44100, opts.bitRate || 192);
		this.kss2mp3.encode(this.tempkss, song, callback, opts);
	};

	MSXPlay.prototype._generateWave = function(currentTime, samples) {

		if (this.kssplay.getStopFlag() || this.kssplay.getFadeFlag() == 2) {
			return null;
		}

		if(this.kssplay.getFadeFlag() == 0) {
			var loop = this.kssplay.getLoopCount();
			var remains = this.maxPlayTime - currentTime;
			if (this.loopCount <= loop || (this.fadeTime && remains <= this.fadeTime)) {
				this.kssplay.fadeStart(this.fadeTime);
			}
		}
			
		return this.kssplay.calc(samples);
	};

	MSXPlay.prototype.getState = function() {
		return this.audioPlayer.getState();
	};

	MSXPlay.prototype.getMasterVolume = function() {
		return this.audioPlayer.getMasterVolume();
	};

	MSXPlay.prototype.setMasterVolume = function(gain) {
		this.audioPlayer.setMasterVolume(gain);
	};

	MSXPlay.prototype.getOutputGain = function() {
		return this.audioPlayer.getOutputGain();
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

		this.kssplay.setData(kss);
		this.kssplay.reset(song,0);

		this.maxPlayTime = Math.min(20 * 60 * 1000, options.duration || 5 * 60 * 1000);
		if(options.gain != null) {
			this.audioPlayer.setOutputGain(options.gain);
		}

	};

	MSXPlay.prototype.play = function() {
		this.audioPlayer.play(this.maxPlayTime);
	};

	MSXPlay.prototype.stop = function() {
		this.audioPlayer.stop();
	};

	MSXPlay.prototype.pause = function() {
		this.audioPlayer.pause();
	};

	MSXPlay.prototype.resume = function() {
		this.audioPlayer.resume();
	};

	MSXPlay.prototype.isPlaying = function() {
		return this.audioPlayer.isPlaying();
	};

	MSXPlay.prototype.isPaused = function() {
		return this.audioPlayer.isPaused();
	};

	MSXPlay.prototype.seekTo = function(posInMs) {
		this.audioPlayer.seekTo(posInMs);
	};

	MSXPlay.prototype.getTotalTime = function() {
		return this.audioPlayer.getTotalTime();
	};

	MSXPlay.prototype.getPlayedTime = function() {
		return this.audioPlayer.getPlayedTime();
	};

	MSXPlay.prototype.getBufferedTime = function() {
		return this.audioPlayer.getBufferedTime();
	};

	MSXPlay.prototype.getRenderSpeed = function() {
		return this.audioPlayer.renderSpeed;
	}

	MSXPlay.prototype.release = function() {
		if (this.kss2mp3 != null) {
			this.kss2mp3.release();
			this.kss2mp3 = null;
		}
		if (this.tempkss != null) {
			this.tempkss.release();
			this.tempkss = null;
		}
		this.kssplay.release();
		this.kssplay = null;
		this.audioPlayer.release();
		this.audioPlayer = null;
	};

	return MSXPlay;

}());
