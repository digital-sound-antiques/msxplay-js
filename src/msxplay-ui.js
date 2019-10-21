module.exports = (function() {
  "use strict";

  var KSS = require("libkss-js").KSS;
  var MSXPlay = require("./msxplay");

  function zeroPadding(num) {
    return ("00" + num).slice(-2);
  }

  function timeToString(timeInMs) {
    var timeInSec = Math.floor(timeInMs / 1000);
    return Math.floor(timeInSec / 60) + ":" + zeroPadding(timeInSec % 60);
  }

  function parseTime(str) {
    if (!str) return null;

    var m = str.match(/^(.*)ms$/);
    if (m) {
      return parseFloat(m[1]);
    }
    m = str.match(/^(.*)s$/);
    if (m) {
      return parseFloat(m[1]) * 1000;
    }

    return null;
  }

  var MSXPlayUI = function() {
    this.msxplay = new MSXPlay();
    this.playerElements = [];
    setInterval(this.updateDisplay.bind(this), 100);
  };

  MSXPlayUI.prototype.mp3encode = function(data, song, callback, opts) {
    this.msxplay.mp3encode(data, song, callback, opts);
  };

  MSXPlayUI.prototype.compile = function(mml) {
    if (this.compiler == null) {
      this.compiler = require("mgsc-js");
    }
    return this.compiler.compile(mml);
  };

  MSXPlayUI.prototype.install = function(rootElement) {
    var players = rootElement.querySelectorAll(".msxplay");
    for (var i = 0; i < players.length; i++) {
      this.attach(players[i]);
    }
  };

  MSXPlayUI.prototype.attach = function(playerElement) {
    this.initPlayer(playerElement);
    this.playerElements.push(playerElement);
    playerElement.addEventListener(
      "click",
      this.onClickPlayer.bind(this),
      true
    );
  };

  MSXPlayUI.prototype.detach = function(playerElement) {
    var i = this.playerElements.indexOf(playerElement);
    if (0 <= i) {
      this.playerElements.splice(i, 1);
    }
  };

  MSXPlayUI.prototype.createPlayer = function(data, url) {
    var m = (url || "").match(/([^/]+)$/);
    var name = m ? m[1] : null;
    var kss = KSS.createUniqueInstance(new Uint8Array(data), name);
    var playerElement = document.createElement("div");
    playerElement.classList.add("msxplay");
    playerElement.dataset.gain = "1.0";
    playerElement.dataset.url = url;
    playerElement.dataset.hash = kss.hash;
    if (kss.hasMultiSongs) {
      playerElement.classList.add("multi-songs");
    } else {
      playerElement.classList.remove("multi-songs");
    }
    this.attach(playerElement);

    return playerElement;
  };

  MSXPlayUI.prototype.onClickPlayer = function(event) {
    var playerElement = event.target;
    while (playerElement) {
      if (playerElement.classList.contains("msxplay")) break;
      playerElement = playerElement.parentNode;
    }

    if (!playerElement) {
      return;
    }

    if (event.target == playerElement.querySelector(".leftbox")) {
      if (playerElement == this.currentPlayerElement) {
        if (this.msxplay.getState() == "finished") {
          this.play(playerElement);
        } else if (this.msxplay.isPaused()) {
          this.msxplay.resume();
        } else {
          this.msxplay.pause();
        }
      } else {
        this.play(playerElement);
      }
    } else if (event.target.classList.contains("track")) {
      if (playerElement == this.currentPlayerElement) {
        var pos = Math.floor(
          (this.msxplay.getTotalTime() * event.offsetX) /
            event.target.offsetWidth
        );
        this.msxplay.seekTo(pos);
      }
    } else if (event.target.classList.contains("next")) {
      var song =
        (parseInt(playerElement.dataset.song) + (event.shiftKey ? 10 : 1)) %
        256;
      playerElement.dataset.song = song;
      playerElement.querySelector(".number").textContent = zeroPadding(
        song.toString(16)
      );
      playerElement.dataset.duration = null;
      if (playerElement == this.currentPlayerElement) {
        this.play(playerElement);
      }
    } else if (event.target.classList.contains("prev")) {
      var song =
        (parseInt(playerElement.dataset.song) + (event.shiftKey ? 246 : 255)) %
        256;
      playerElement.dataset.song = song;
      playerElement.querySelector(".number").textContent = zeroPadding(
        song.toString(16)
      );
      playerElement.dataset.duration = null;
      if (playerElement == this.currentPlayerElement) {
        this.play(playerElement);
      }
    }
  };

  MSXPlayUI.prototype.setDataToPlayer = function(playerElement, data, name) {
    var kss = KSS.createUniqueInstance(data, name);
    setKSSToPlayerElement(playerElement, kss, name);
  };

  var setKSSToPlayerElement = function(playerElement, kss, url) {
    if (kss instanceof KSS) {
      var title = playerElement.dataset.title || kss.getTitle();
      if (/^[\u0000-\u0020]*$/.test(title)) {
        title = url.replace(/^.*[/\\]/, "");
      }
      playerElement.querySelector(".title").textContent = title;
      playerElement.dataset.hash = kss.hash;
    } else {
      playerElement.querySelector(".title").textContent = kss.toString();
      playerElement.dataset.hash = null;
    }
  };

  MSXPlayUI.prototype.initPlayer = function(playerElement) {
    playerElement.innerHTML = "";
    playerElement.insertAdjacentHTML(
      "afterbegin",
      '<div class="leftbox"></div>' +
        '<div class="rightbox">' +
        '    <div class="title"></div>' +
        '    <div class="spinner">' +
        '       <div class="button next"></div>' +
        '       <div class="number"></div>' +
        '       <div class="button prev"></div>' +
        "    </div>" +
        '    <div class="slider">' +
        '	    <div class="playtime">0:00</div>' +
        '       <div class="duration">?:??</div>' +
        '		<div class="track">' +
        '			<div class="buffered"></div>' +
        ' 		    <div class="progress"></div>' +
        "		</div>" +
        "	 </div>" +
        "</div>" +
        '<div class="footer"></div>'
    );

    if (playerElement.dataset.url) {
      playerElement.querySelector(".title").textContent = "Loading...";
      this.loadKSS(playerElement);
    }

    if (playerElement.dataset.footnote) {
      playerElement.querySelector(".footer").textContent =
        playerElement.dataset.footnote;
    }

    if (!playerElement.dataset.song) {
      playerElement.dataset.song = 0;
    }
    playerElement.querySelector(".number").textContent = zeroPadding(
      parseInt(playerElement.dataset.song).toString(16)
    );
  };

  MSXPlayUI.prototype.loadKSS = function(playerElement) {
    var loadComplete = function(kss, url) {
      setKSSToPlayerElement(playerElement, kss, url);
    };

    var hash = playerElement.dataset.hash;

    if (hash) {
      var kss = KSS.hashMap[hash];
      loadComplete(kss, playerElement.dataset.url);
    } else {
      var url = playerElement.dataset.url;
      KSS.loadFromUrl(url, loadComplete);
    }
  };

  MSXPlayUI.prototype.stop = function() {
    this.msxplay.stop();

    if (this.currentPlayerElement) {
      this.currentPlayerElement.classList.remove("active");
      this.currentPlayerElement = null;
    }

    for (var i = 0; i < this.playerElements.length; i++) {
      var playerElement = this.playerElements[i];

      setPlayerState(playerElement, "standby");

      playerElement.querySelector(".buffered").style.width = 0;
      playerElement.querySelector(".progress").style.width = 0;
      playerElement.querySelector(".playtime").textContent = "0:00";

      var duration = parseTime(playerElement.dataset.duration);
      if (duration) {
        playerElement.querySelector(".duration").textContent = timeToString(
          duration
        );
      } else {
        playerElement.querySelector(".duration").textContent = "?:??";
      }
    }
  };

  MSXPlayUI.prototype.play = function(playerElement) {
    this.stop();

    var hash = playerElement.dataset.hash;
    var song = parseInt(playerElement.dataset.song);
    var duration = parseTime(playerElement.dataset.duration);
    var fade = parseFloat(playerElement.dataset.fade);
    var gain = parseFloat(playerElement.dataset.gain);

    var kss = KSS.hashMap[hash];
    if (kss) {
      this.msxplay.setData(kss, song, {
        duration: duration,
        fade: fade,
        gain: gain
      });
      this.msxplay.play();
      this.currentPlayerElement = playerElement;
      playerElement.classList.add("active");
      if (kss.hasMultiSongs) {
        playerElement.classList.add("multi-songs");
      } else {
        playerElement.classList.remove("multi-songs");
      }
    }
  };

  function setPlayerState(playerElement, state) {
    playerElement.classList.remove("playing");
    playerElement.classList.remove("paused");
    playerElement.classList.remove("finished");
    playerElement.classList.remove("standby");
    playerElement.classList.add(state);
  }

  MSXPlayUI.prototype.updateDisplay = function() {
    if (this.currentPlayerElement) {
      this.updatePlayerStatus(this.currentPlayerElement);
    }
  };

  MSXPlayUI.prototype.updatePlayerStatus = function(playerElement) {
    var played = this.msxplay.getPlayedTime();
    var buffered = this.msxplay.getBufferedTime();
    var total = this.msxplay.getTotalTime();
    var renderSpeed = this.msxplay.getRenderSpeed().toFixed(1);

    playerElement.querySelector(".playtime").textContent = timeToString(played);

    if (buffered < total) {
      playerElement.querySelector(".playtime").textContent +=
        " buffering... (x" + renderSpeed + ") ";
    } else {
      playerElement.dataset.duration = total + "ms";
    }
    playerElement.querySelector(".duration").textContent = timeToString(total);

    playerElement.querySelector(".progress").style.width =
      Math.round((100 * played) / total) + "%";
    playerElement.querySelector(".buffered").style.width =
      Math.round((100 * buffered) / total) + "%";

    setPlayerState(playerElement, this.msxplay.getState());
  };

  MSXPlayUI.prototype.releaseKSS = function(kss) {
    if (typeof kss == "string") {
      kss = KSS.hashMap[kss];
    }

    if (kss instanceof KSS) {
      kss.release();
    }
  };

  return new MSXPlayUI();
})();
