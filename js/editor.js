"use strict";

ace.define('ace/mode/mgsc_highlight_rules', function (require, exports, module) {
  const oop = require("ace/lib/oop");
  const TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
  let MGSCHighlightRules = function () {
    this.$rules = {
      "start": [{
        token: "comment",
        regex: ";.*$"
      }, {
        token: "channel",
        regex: "^\\s*[1-9a-hrA-HR]+",
        next: "mml",
      }, {
        token: "paren.lparen",
        regex: "{",
        next: "block",
      }, {
        token: "directive",
        regex: "^#[a-zA-Z_]+",
      }],
      "block": [{
        token: "comment",
        regex: ";.*$"
      }, {
        token: "paren.rparen",
        regex: "}",
        next: "start",
      }, {
        defaultToken: "block_body",
      }],
      "mml": [{
        token: "comment",
        regex: ";.*$",
        next: "start"
      }, {
        token: "jump",
        regex: "\\$"
      }, {
        token: "voice",
        regex: "@e?[0-9]+"
      }, {
        token: "eol",
        regex: "$",
        next: "start"
      }],
    };
  }
  oop.inherits(MGSCHighlightRules, TextHighlightRules);
  exports.MGSCHighlightRules = MGSCHighlightRules;
});

ace.define('ace/mode/mgsc', function (require, exports, module) {
  const oop = require("ace/lib/oop");
  const TextMode = require("ace/mode/text").Mode;
  const MGSCHighlightRules = require("ace/mode/mgsc_highlight_rules").MGSCHighlightRules;
  // let MatchingBraceOutdent = require("ace/mode/matching_brace_outdent").MatchingBraceOutdent;
  const Mode = function () {
    this.HighlightRules = MGSCHighlightRules;
    // this.$outdent = new MatchingBraceOutdent();
  };
  oop.inherits(Mode, TextMode);
  (function () {
    // Extra logic goes here.
  }).call(Mode.prototype);
  exports.Mode = Mode;
});

const LIGHT_THEME_ID = 'light';
const DARK_THEME_ID = 'dark';
const LIGHT_THEME_PATH = 'ace/theme/mgsc';
const DARK_THEME_PATH = 'ace/theme/mgsc-dark';

ace.define(LIGHT_THEME_PATH, function (require, exports, module) {
  exports.isDark = false;
  exports.cssClass = "ace_mgsc";
  exports.cssText = `
.ace_editor.ace_mgsc {
  color: rgba(0,0,0,0.87);
  background-color: #f0f0f0;
}
.ace_mgsc .ace_marker-layer .ace_bracket {
  margin: -1px 0 0 -1px;
  background-color: #bfbfbf;
}
.ace_mgsc .ace_marker-layer .ace_active-line {
  background-color: rgba(0,0,0,0.071);
}
.ace_mgsc .ace_gutter-active-line {
  background-color: rgba(0,0,0,0.071);
}
.ace_mgsc .ace_comment {
  color: #888;
}
.ace_mgsc .ace_directive {
  color: #606;
}
.ace_mgsc .ace_channel {
  color: #088;
}
.ace_mgsc .ace_jump {
  color: #d00;
}
.ace_mgsc .ace_selection {
  background-color: #ACCEF7;
}
.ace_mgsc .ace_selected-word {
  background-color: #ddd;
}
.ace_mgsc .ace_gutter {
  background-color: #eee;
}
`;
  const dom = require("../lib/dom");
  dom.importCssString(exports.cssText, exports.cssClass);
});

ace.define(DARK_THEME_PATH, function (require, exports, module) {
  exports.isDark = true;
  exports.cssClass = "ace_mgsc_dark";
  exports.cssText = `
.ace_editor.ace_mgsc_dark {
  color: #f0f0f0;
  background-color: #000;
}
.ace_mgsc_dark .ace_marker-layer .ace_bracket {
  margin: -1px 0 0 -1px;
  background-color: #bfbfbf;
}
.ace_mgsc_dark .ace_marker-layer .ace_active-line {
  background-color: rgba(255,255,255,0.071);
}
.ace_mgsc_dark .ace_gutter-active-line {
  background-color: rgba(255,255,255,0.071);
}
.ace_mgsc_dark .ace_comment {
  color: #aaa;
}
.ace_mgsc_dark .ace_directive {
  color: #ee0;
}
.ace_mgsc_dark .ace_channel {
  color: #0ee;
}
.ace_mgsc_dark .ace_jump {
  color: #ff0;
}
.ace_mgsc_dark .ace_selection {
  background-color: rgba(88,172,247,0.5);
}
.ace_mgsc_dark .ace_selected-word {
  background-color: #666;
}
.ace_mgsc_dark .ace_gutter {
  background-color: #444;
}
`;
  const dom = require("../lib/dom");
  dom.importCssString(exports.cssText, exports.cssClass);
});

async function loadTextFromUrl(url, complete) {
  const res = await fetch(url, {
    method: "GET",
    mode: "cors",
    headers: {
      Accept: "text/plain"
    }
  });
  if (res.ok) {
    const buf = await res.arrayBuffer();
    return MSXPlayUI.decode_text(new Uint8Array(buf));
  }
  throw new Error(res.statusText);
}

function getPastebinUrl(key) {
  return `https://firebasestorage.googleapis.com/v0/b/msxplay-63a7a.appspot.com/o/pastebin%2F${key}?alt=media`;
}

function getShareUrl(id) {
  //return `http://${location.host}?open=${id}`;
  return `https://msxplay.com?open=${id}`;
}

async function openExternalMML(key) {
  try {
    showDialog("loading");
    if (key.indexOf("http") === 0) {
      await loadFromUrl(key);
    } else {
      await loadFromUrl(getPastebinUrl(key));
    }
    hideDialog("loading");
    if (!compile(false)) {
      throw new Error("Failed to compile the MML file.");
    }
    document.getElementById("editor-cover").style.visibility = "visible";
  } catch (e) {
    hideDialog();
    const p = document.querySelector("#generic-error p");
    p.innerText = "Load Error";
    showDialog("generic-error");
  }
}

async function getShareLink(mml) {
  const res = await fetch("https://asia-northeast1-msxplay-63a7a.cloudfunctions.net/pastebin", {
    method: "POST",
    mode: "cors",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain"
    },
    body: mml
  });
  const { id, url } = await res.json();
  if (url != null) {
    return url;
  }
  // old version
  return getShareUrl(id);
}

async function share() {
  try {
    storeToLocalStorage();
    const mml = editor.getValue().trim();
    if (mml == null || mml === "") {
      showDialog("empty-error-on-share");
      return;
    }
    var result = MSXPlayUI.compile(mml);
    if (!result.success) {
      showDialog("compile-error-on-share");
      return;
    }
    showDialog("wait-for-share-link");
    const url = await getShareLink(mml);
    hideDialog("wait-for-share-link");

    var elem = document.querySelector("#share-link input");
    elem.value = "";
    elem.focus();
    elem.value = url;
    elem.setSelectionRange(0, 0);
    setTimeout(() => elem.select(), 100);
    showDialog("share-link");
  } catch (e) {
    hideDialog();
    const p = document.querySelector("#generic-error p");
    p.innerText = e.message;
    showDialog("generic-error");
  }
}

// Prevent unexpected location change.
var contentChanged = false;
window.addEventListener("beforeunload", function (event) {
  if (contentChanged) {
    storeToLocalStorage();
  }
});

function _themeIdToPath(id) {
  switch (id) {
    case DARK_THEME_ID:
      return DARK_THEME_PATH;
    case LIGHT_THEME_ID:
    default:
      return LIGHT_THEME_PATH;
  }
}

function _pathToThemeId(theme) {
  switch (theme) {
    case DARK_THEME_PATH:
      return DARK_THEME_ID;
    case LIGHT_THEME_PATH:
    default:
      return LIGHT_THEME_ID;
  }
}

function loadEditorOptions() {
  const defaultEditorOptions = {
    theme: LIGHT_THEME_PATH,
    fontSize: 12,
  };
  const options = JSON.parse(window.localStorage.getItem(EDITOR_OPTIONS_KEY) || "{}");
  return {
    ...defaultEditorOptions,
    ...options,
  };
}

function saveEditorOptions() {
  const options = editor.getOptions();
  window.localStorage.setItem(EDITOR_OPTIONS_KEY, JSON.stringify({
    theme: options["theme"],
    fontSize: options["fontSize"],
  }));
}

var editor;

function createAceEditor() {
  try {
    editor = ace.edit("editor");
    editor.commands.bindKey("Ctrl-P", "golineup");
    editor.$blockScrolling = Infinity;
    editor.getSession().setUseWrapMode(true);
    editor.setShowPrintMargin(false);
    editor.resize(true);
    editor.setOptions({
      mode: "ace/mode/mgsc",
      useWorker: false,
      indentedSoftWrap: false,
      ...loadEditorOptions(),
    });
    editor.on("change", function () {
      contentChanged = true;
    });
  } catch (e) {
    window.alert("Failed to create the Ace editor instance. Please check your network connection.");
  }
}

var marker = null;
function addErrorMarker(line, message) {
  var range = ace.require("ace/range");
  editor.getSession().setAnnotations([{
    row: line,
    column: 0,
    text: message,
    type: "error"
  }]);
  marker = editor.getSession().addMarker(new range.Range(line, 0, line, 2000), "mml-error", "line", true);
}

function removeErrorMarker() {
  if (marker) {
    editor.getSession().removeMarker(marker);
    editor.getSession().clearAnnotations();
    marker = null;
  }
}

function highlightError(message) {
  var m = message.match(/.* in ([0-9]+)/i);
  if (m) {
    var line = parseInt(m[1]);
    addErrorMarker(line, message);
    editor.gotoLine(line + 1, 0, true);
  }
  document.getElementById("message").classList.remove("minimized");
}

var lastCompiledMGS = null;
var lastCompiledName = null;

function getMetaMMLInfo(mml) {
  var result = {};
  var m;
  m = mml.match(/^;\[.*duration=(auto|[0-9a-z]+).*\]/im);
  if (m) {
    if (m[1] != "auto") {
      result.duration = m[1];
    }
  }

  m = mml.match(/^;\[.*fade=([0-9a-z]+).*\]/im);
  if (m) {
    result.fade = m[1];
  }

  m = mml.match(/^;\[.*gain=([0-9]+(?:\.[0-9]+)).*\]/im);
  if (m) {
    result.gain = m[1];
  }

  m = mml.match(/^;\[.*name=([0-9A-Z_\-\.]+).*\]/im);
  if (m) {
    result.name = m[1];
  }

  m = mml.match(/^;\[.*cpu=([0-9]+).*\]/im);
  if (m) {
    result.cpu = m[1];
  }

  return result;
}

function editorCoverButtonPressed() {
  document.getElementById("editor-cover").style.display = "none";
  var player = document.getElementById("player");
  MSXPlayUI.play(player);
}

function compile(autoplay) {
  if (autoplay === undefined) {
    autoplay = document.getElementById("autoplay").checked;
  }

  if (contentChanged) {
    storeToLocalStorage();
    contentChanged = false;
  }

  var player = document.getElementById("player");

  MSXPlayUI.stop();
  MSXPlayUI.releaseKSS(player.dataset.hash);

  removeErrorMarker();
  var mml = getEditorMML();
  var result = MSXPlayUI.compile(mml);

  document.querySelector("#message pre").textContent = result.rawMessage;

  if (!result.success) {
    highlightError(result.rawMessage);
    lastCompiledMGS = null;
    lastCompiledName = null;
    editor.focus();
    return false;
  }

  var info = getMetaMMLInfo(mml);

  lastCompiledMGS = result.mgs;
  lastCompiledName = info.name || "" + Date.now();

  player.dataset.duration = null;
  player.dataset.gain = 1.0;
  player.dataset.cpu = 0;
  MSXPlayUI.setDataToPlayer(player, result.mgs, lastCompiledName);

  if (info.duration) player.dataset.duration = info.duration;
  if (info.fade) player.dataset.fade = info.fade;
  if (info.gain) player.dataset.gain = info.gain;
  if (info.cpu) player.dataset.cpu = info.cpu;

  let toArrayBuffer = u8a => u8a.buffer.slice(u8a.byteOffset);

  try {
    const jumps = MSXPlayUI.checkMGSJumpMarker(toArrayBuffer(result.mgs));
    player.dataset.debug_mgs = 0 < jumps ? 1 : 0;
  } catch (e) {
    console.error(e);
  }

  if (autoplay) {
    MSXPlayUI.play(player);
  }
  editor.focus();
  editor.resize(); // needs to refresh height because player visibility may change.
  return true;
}

function loadText(text) {
  editor.setValue(text, -1);
  editor.focus();
  contentChanged = false;
  removeErrorMarker();
  clearLocalStorage();
}

async function loadFromUrl(url) {
  const mml = await loadTextFromUrl(url);
  if (!/#opll_mode/i.test(mml)) {
    throw new Error("Not a mml file.");
  }
  loadText(mml);
}

function convertFromMGS(buffer) {
  try {
    return MSXPlayUI.decompile(buffer);
  } catch (e) {
    document.querySelector("#generic-error .message").innerText = e.message;
    showDialog("generic-error");
  }
  return null;
}

async function loadFromFile(file) {
  var reader = new FileReader();
  return new Promise((resolve, _) => {
    reader.onloadend = async () => {
      const u = new Uint8Array(reader.result);
      let version = 6 < u.length ? String.fromCharCode(u[0], u[1], u[2], u[3], u[4], u[5]) : null;
      if (version && version.indexOf("MGS") === 0) {
        if (/[3A](00|01|02|03)$/.test(version)) {
          const ret = await showDialogAsync("mgsrc-legacy-warn");
          if (ret !== "ok") {
            resolve(false);
            return;
          }
        }
        const mml = convertFromMGS(reader.result);
        if (mml) {
          loadText(`;[gain=1.0 name=${file.name} duration=300s fade=5s]\n${mml}`);
          resolve(true);
        }
      } else {
        const mml = MSXPlayUI.decode_text(u);
        if (mml) {
          loadText(mml);
          resolve(true);
        }
      }
      resolve(false);
    };
    reader.readAsArrayBuffer(file);
  });
}

function openFile(e) {
  if (0 < e.target.files.length) {
    loadFromFile(e.target.files[0]);
  }
}

function clearFile(e) {
  showDialog("confirm-clear", function (value) {
    if (value == "ok") {
      editor.setValue("", -1);
      clearLocalStorage();
      contentChanged = false;
    }
  });
}

const AUTOBACKUP_KEY = "mgsc.editor.autobackup";
const EDITOR_OPTIONS_KEY = "mgsc.editor.options";

function clearLocalStorage() {
  localStorage.removeItem(AUTOBACKUP_KEY);
}

function removeTrailingSpaces(text) {
  const lines = text.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^[1-9a-z]\s+/i.test(lines[i])) {
      lines[i] = lines[i].replace(/\s+$/, " ");
    } else {
      lines[i] = lines[i].replace(/\s+$/, "");
    }
  }
  return lines.join("\n");
}

function getEditorMML() {
  return removeTrailingSpaces(editor.getValue());
}

function storeToLocalStorage() {
  const text = getEditorMML();
  if (/^\s*$/.test(text)) {
    localStorage.removeItem(AUTOBACKUP_KEY);
  } else {
    localStorage.setItem(AUTOBACKUP_KEY, text);
  }
  return text;
}

function restoreFromLocalStorage() {
  editor.setValue(localStorage.getItem(AUTOBACKUP_KEY), -1);
  editor.focus();
  contentChanged = false;
}

document.addEventListener("keydown", function (e) {
  if (e.keyCode == 83 && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    storeToLocalStorage();
  }

  if (e.keyCode == 8) {
    if (e.target == document.body) {
      e.preventDefault();
    }
  }
});

var saveAs = function (blob, fileName) {
  var a = document.getElementById("download-helper");
  var url = a.href;
  if (url) {
    window.URL.revokeObjectURL(url);
  }

  if (navigator.msSaveOrOpenBlob) {
    navigator.msSaveOrOpenBlob(blob, fileName);
  } else {
    a.href = window.URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
  }
};

var abortEncode;

function audio_encode(type, mgs, filename, opts) {
  var start = Date.now();
  var progs = document.querySelectorAll("#encoding .encode-progress");
  var spds = document.querySelectorAll("#encoding .encode-speed");

  MSXPlayUI.audio_encode(
    type,
    mgs,
    0,
    function (time, data, done) {
      var elapsed = Date.now() - start;
      var speed = time / elapsed;

      for (var i = 0; i < progs.length; i++) {
        progs[i].innerText = (time / 1000).toFixed(1);
      }
      for (var i = 0; i < spds.length; i++) {
        spds[i].innerText = speed.toFixed(1);
      }

      if (done) {
        const parts = data instanceof ArrayBuffer ? [data] : data;
        var blob = new Blob(parts, { type: type === "mp3" ? "audio/mp3" : "audio/wav" });
        saveAs(blob, filename);
        hideDialog("encoding");
        return true;
      }
      return !abortEncode;
    },
    opts
  );
}

function downloadAudio(type, rate, kbps, quality) {
  MSXPlayUI.stop();

  var mml = getEditorMML();
  var info = getMetaMMLInfo(mml);
  var result = MSXPlayUI.compile(mml);

  if (!result.success) {
    showDialog("no-mgs");
    return;
  }

  showDialog("encoding", function () {
    abortEncode = true;
  });
  abortEncode = false;

  var opts = {
    gain: info.gain || 1.0,
    playTime: info.duration || 600 * 1000,
    fadeTime: info.fade || 3000,
    sampleRate: rate,
    bitRate: kbps,
    quality: quality
    // rcf: { registor: 3870, capacitor: 15 },
  };

  var filename;
  if (type === "mp3") {
    var filename = (info.name || Date.now()) + "_" + rate + "_" + kbps + "kbps.mp3";
  } else {
    var filename = (info.name || Date.now()) + "_" + rate + ".wav";
  }
  audio_encode(type, result.mgs, filename, opts);
}

function downloadMML() {
  var blob = new Blob([editor.getValue()], { type: "text/plain" });
  saveAs(blob, lastCompiledName || Date.now() + ".mml");
}

function downloadMGS() {
  if (compile(false)) {
    var blob = new Blob([lastCompiledMGS], {
      type: "application/octet-stream"
    });
    saveAs(blob, lastCompiledName + ".mgs");
  } else {
    showDialog("no-mgs");
  }
}

function download() {
  if (editor.getValue().match(/^\s*$/)) {
    showDialog("no-mgs");
    return;
  }

  showDialog("download-type", function (e) {
    if (e === "mml") {
      downloadMML();
    } else if (e === "mgs") {
      downloadMGS();
    } else if (e === "mp3low") {
      downloadAudio("mp3", 44100, 128, { psg: 1, scc: 0, opll: 1, opl: 1 });
    } else if (e === "mp3mid") {
      downloadAudio("mp3", 44100, 160, { psg: 1, scc: 0, opll: 1, opl: 1 });
    } else if (e === "mp3high") {
      downloadAudio("mp3", 48000, 192, { psg: 1, scc: 0, opll: 1, opl: 1 });
    } else if (e === "wav44k") {
      downloadAudio("wav", 44100, 0, { psg: 1, scc: 0, opll: 1, opl: 1 });
    } else if (e === "wav48k") {
      downloadAudio("wav", 48000, 0, { psg: 1, scc: 0, opll: 1, opl: 1 });
    } else if (e === "wav96k") {
      downloadAudio("wav", 96000, 0, { psg: 1, scc: 0, opll: 1, opl: 1 });
    }
  });
}

var dialogListener;

async function showDialogAsync(id) {
  return new Promise((resolve, _) => showDialog(id, resolve));
}

function showDialog(id, complete) {
  var dialog = document.getElementById(id);
  var stage = document.getElementById("modal-stage");
  dialogListener = function (e) {
    var target = e.target;
    while (target) {
      if (target.dataset && target.dataset.value) {
        dialog.style.display = "none";
        stage.style.display = "none";
        if (dialogListener != null) {
          dialog.removeEventListener("click", dialogListener);
        }
        if (complete) complete(target.dataset.value);
      }
      target = target.parentNode;
    }
  };
  dialog.addEventListener("click", dialogListener);
  stage.style.display = "block";
  dialog.style.display = "block";
  dialog.style.width = dialog.offsetWidth + "px";
  dialog.style.height = dialog.offsetHeight + "px";
  dialog.style.position = "absolute";
}

function hideDialog(id) {
  var dialogs = id ? [document.getElementById(id)] : document.querySelectorAll(".dialog");
  var stage = document.getElementById("modal-stage");
  for (let i = 0; i < dialogs.length; i++) {
    if (dialogListener != null) {
      dialogs[i].removeEventListener("click", dialogListener);
    }
    dialogs[i].style.display = "none";
  }
  stage.style.display = "none";
}

var dragCounter = 0;

function onDragOver(e) {
  e.preventDefault();
}

function onDragEnter(e) {
  e.preventDefault();
  if (dragCounter == 0) {
    document.getElementById("editor").style.borderColor = "red";
  }
  dragCounter++;
}

function onDragLeave(e) {
  dragCounter--;
  if (dragCounter == 0) {
    document.getElementById("editor").style.borderColor = null;
  }
}

async function onDrop(e) {
  dragCounter = 0;
  document.getElementById("editor").style.borderColor = null;
  e.preventDefault();
  if (0 < e.dataTransfer.files.length) {
    if (await loadFromFile(e.dataTransfer.files[0])) {
      compile();
    }
  }
}

function selectSample() {
  showDialog("select-sample", function (value) {
    if (value != "cancel") {
      loadFromUrl(value);
    }
  });
}

window.addEventListener("DOMContentLoaded", function () {
  const elem = document.body;
  elem.addEventListener("dragover", onDragOver);
  elem.addEventListener("dragenter", onDragEnter);
  elem.addEventListener("dragleave", onDragLeave);
  elem.addEventListener("drop", onDrop);

  MSXPlayUI.install(document.body).then(() => {
    createAceEditor();

    document.getElementById("version").innerText = "MSXPlay v" + MSXPlayUI.getVersion();
    document.getElementById("open-file").addEventListener("change", openFile);

    const mbox = document.getElementById("message");
    mbox.addEventListener(
      "click",
      function (e) {
        if (mbox.classList.contains("minimized")) {
          mbox.classList.remove("minimized");
        } else {
          if (e.target == document.querySelector("#message .title")) {
            mbox.classList.add("minimized");
          }
        }
      },
      true
    );

    const query = QueryParser.parse();
    const openTarget = query["open"];
    if (openTarget) {
      window.history.replaceState(null, null, `${location.pathname}`);
      openExternalMML(openTarget);
    } else if (localStorage.getItem(AUTOBACKUP_KEY)) {
      restoreFromLocalStorage();
    } else {
      selectSample();
    }
  });
});


function openSettings() {
  const themeSel = document.querySelector("#settings select[name='theme']");
  themeSel.value = _pathToThemeId(editor.getOption("theme"));
  const fontSel = document.querySelector("#settings select[name='font-size']");
  fontSel.value = editor.getOption("fontSize");
  showDialog("settings", (value) => {
    if (value == "reset") {
      resetSettings();
    }
  });
}

function onThemeChange(event) {
  const id = event.srcElement.value;
  editor.setTheme(_themeIdToPath(id));
  saveEditorOptions();
}

function onFontSizeChange(event) {
  const fontSize = event.srcElement.value;
  editor.setOption("fontSize", parseInt(fontSize));
  saveEditorOptions();
}

function resetSettings() {
  localStorage.removeItem(EDITOR_OPTIONS_KEY);
  editor.setOptions(loadEditorOptions());
  openSettings();
}