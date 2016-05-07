module.exports = (function(){

	var AudioRenderingBuffer = function(sampleRate,renderFunc) {
		this.ringBuffer = new Float32Array(sampleRate * 4); 
		this.ringReadPos = 0;
		this.ringWritePos = 0;
		this.sampleRate = sampleRate;
		this.renderFunc = renderFunc;
		this.lastRenderAt = null;
	};

	AudioRenderingBuffer.prototype.start = function() {
		this.lastRenderAt = Date.now();
	};

	AudioRenderingBuffer.prototype.seekTo = function(timeInMs) {
		this.ringReadPos = sampleRate * timeInMs / 1000;
	};

	AudioRenderingBuffer.prototype.writeTo = function(array, offset, length) {
		for(var i=0;i<length;i++) {
			var rp = this.ringReadPos % this.ringBuffer.length;
			array[offset + i] = this.ringBuffer[rp];
			if(this.ringReadPos < this.ringWritePos) {
				this.ringReadPos++;
			}
		}
	};

	AudioRenderingBuffer.prototype.getBufferedLength = function () {
		return this.ringWritePos - this.ringReadPos;
	};

	AudioRenderingBuffer.prototype.render = function() {

		var renderInterval = Date.now() - this.lastRenderAt;
		this.lastRenderAt = Date.now();

		if(200 < renderInterval) {
			console.log("Int:" + renderInterval + "ms");
		}

		var bufferRemains = this.ringBuffer.length - this.getBufferedLength();
		var renderUnit = Math.ceil(1.5 * this.sampleRate / (1000 / renderInterval));

		renderUnit = Math.min(bufferRemains, renderUnit);

		var wav = this.renderFunc(renderUnit);

		for(var i=0;i<wav.length;i++) {
			var wp = this.ringWritePos % this.ringBuffer.length;
			this.ringBuffer[wp] = wav[i];
			this.ringWritePos++;
		}

	};

	var StreamAudioPlay = function(audioCtx, destNode, sampleRate, renderFunc) {
		this.audioCtx = audioCtx;
		this.destNode = destNode;
		this.buffer = new AudioRenderingBuffer(sampleRate, renderFunc);
		this.blockIndex = 0;
		this.bufferedBlocks = 0;
		this.startTime = 0;
		this.bufferUnit = sampleRate * 2;
		this.sampleRate = sampleRate;
		this.maxBufferedBlocks = 4;
	};

	StreamAudioPlay.prototype.start = function() {
		this.buffer.start();
		setInterval(this.onInterval.bind(this),50);
	};

	StreamAudioPlay.prototype.onInterval = function() {

		this.buffer.render();

		if(this.bufferedBlocks < this.maxBufferedBlocks && this.bufferUnit <= this.buffer.getBufferedLength()) {

			// console.log("StagedBlocks=" + this.bufferedBlocks + " Buffer=" + this.buffer.getBufferedLength());
			if(this.startTime == 0) {
				this.startTime = this.audioCtx.currentTime;
			}

			var source = this.audioCtx.createBufferSource();
			var buffer = this.audioCtx.createBuffer(1, this.bufferUnit, this.sampleRate);
			this.buffer.writeTo(buffer.getChannelData(0), 0, this.bufferUnit);

			source.buffer = buffer;
			source.connect(this.destNode);

			var self = this;
			source.addEventListener("ended", function(){self.bufferedBlocks--;});

			var time = this.startTime + this.blockIndex * (this.bufferUnit / this.sampleRate);
			source.start(time);
			this.blockIndex++;
			this.bufferedBlocks++;

		}

	};

	return StreamAudioPlay;

})();