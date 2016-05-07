module.exports = (function() {
	
	"use strict"

	var Module = require('exports?Module!../build/libkss');

	var encoding = require('encoding-japanese');
	var crypto = require('crypto');
	var alg = 'sha1';

	var KSS = function(magic,data,fileName) {
		if(magic!="internal") {
			throw new Error("Do not `new` KSS object directly. Use KSS.createObject() instead.");
		}
		if(65536 < data.length) {
			throw new Error("Wrong data format.");
		}

		var buf = Module._malloc(data.length);
		Module.HEAPU8.set(data,buf);
		this.obj = Module.ccall('KSS_bin2kss','number',['number','number','string'],[buf,data.length,fileName]);
		if(this.obj==0) {
			throw new Error("Can't create KSS object.");
		}
		Module._free(buf);
	};

	KSS.hashMap = {};

	KSS.releaseAll = function() {
		for(var key in KSS.hashMap) {
			KSS.hashMap[key].release();
		}
	};

	KSS.createObject = function(data,fileName) {

		var hash = crypto.createHash(alg);
		hash.update(data);
		var hashHex = alg + ":" + hash.digest('hex');

		var kss = KSS.hashMap[hashHex];
		if(kss) { return kss; }

		kss = new KSS("internal",data,fileName);
		kss.hash = hashHex;
		KSS.hashMap[kss.hash] = kss;

		if(data[0]==75&&data[1]==83&&data[2]==67&&data[3]==67) {
			kss.hasMultiSongs = true;
		}

		return kss;
	};

	KSS.loadFromUrl = function(url, complete) {
		var xhr = new XMLHttpRequest();

		xhr.open("GET",url,true);
		xhr.responseType = "arraybuffer";

		xhr.addEventListener('load',function(){
			if(xhr.status == 200 || xhr.status == 304 || xhr.status == 0) {
				try {
					var kss = KSS.createObject(new Uint8Array(xhr.response),url);
					if(complete) complete(kss, url);
				} catch(e) {
					console.log(e);
					var err = new Error("Can't create kss object: " + url);
					if(complete) complete(err, url);
				}
			} else if(xhr.status == 404) {
				var err = new Error("File Not Found: " + url);
				if(complete) complete(err, url);
			} else {
				var err = new Error(xhr.statusText);
				if(complete) complete(err, url);
			} 
		});
		xhr.addEventListener('error',function(e){
			var err = new Error("Load Error: Check 'Access-Control-Allow-Origin' header is present for the target resource. See browser's development panel for detail. If you run this script local Chrome, `--allow-file-access-from-files` option is required.");
			if(complete) complete(err, url);
		});
		xhr.send();
	};

	KSS.prototype.getTitle = function() {
		var ptr = Module.ccall('KSS_get_title','number',['number'],[this.obj]);
		var i;
		for(i=0;i<256;i++) {
			if( Module.HEAPU8[ptr+i]==0 ) break;
		}
		return encoding.convert(new Uint8Array(Module.HEAPU8.buffer,ptr,i),{to:'UNICODE',from:'SJIS',type:'String'});
	};
	
	KSS.prototype.release = function() {
		if(this.obj) {
			Module.ccall('KSS_delete',null,['number'],[this.obj]);
			this.obj = null;
			delete KSS.hashMap[this.hash];
		} else {
			console.error('KSS double-release: ' + this.hash);
		}
	};

	return KSS;

}());

