module.exports = (function(){
	"use strict"
	var Module = require('exports?Module!./libmgsc');
	var encoding = require('encoding-japanese');

	return {
		compile:function(mml) {

			var mmlbuf = encoding.convert(mml,{from:'UNICODE',to:'SJIS',type:'arraybuffer'});

			if(32768 < mmlbuf.length) {
				throw new Error("MML source is too long.");
			}

			var inp = Module._malloc(32768);
			Module.HEAPU8.set(mmlbuf,inp,mmlbuf.length);

			var ptr = Module._malloc(32768);
			var log = Module._malloc(32768);
			var size = Module.ccall('MGSC_compile', 'number', ['number','number','number'], [inp,ptr,log]);
			var mgs = new Uint8Array(size);
			mgs.set(new Uint8Array(Module.HEAPU8.buffer,ptr,size));
			
			var message = Module.AsciiToString(log).replace(/^\s*|\s*$/,'');

			Module._free(inp);
			Module._free(ptr);
			Module._free(log);
			
			return { mgs:mgs, message:message };
		}
	};
}());
