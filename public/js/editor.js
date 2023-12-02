"use strict";

const LIGHT_THEME_ID = "light";
const DARK_THEME_ID = "dark";
const LIGHT_THEME_PATH = "ace/theme/mgsc";
const DARK_THEME_PATH = "ace/theme/mgsc-dark";

async function loadTextFromUrl(url, complete) {
  const res = await fetch(url, {
    method: "GET",
    mode: "cors",
    headers: {
      Accept: "text/plain",
    },
  });
  if (res.ok) {
    const buf = await res.arrayBuffer();
    return MSXPlayUI.decode_text(new Uint8Array(buf));
  }
  throw new Error(res.statusText);
}

const apiSet = {
  production: {
    uploadEndpoint: "https://asia-northeast1-msxplay-63a7a.cloudfunctions.net/pastebin",
    getDownloadUrl: (key) =>
      `https://firebasestorage.googleapis.com/v0/b/msxplay-63a7a.appspot.com/o/pastebin%2F${key}?alt=media`,
  },
  develop: {
    uploadEndpoint: "http://localhost:5001/msxplay-63a7a/asia-northeast1/pastebin",
    getDownloadUrl: (key) => `http://localhost:9199/msxplay-63a7a.appspot.com/pastebin%2F${key}`,
  },
};

const api = apiSet.production;

async function openExternalMML(key) {
  try {
    showDialog("loading");
    if (key.indexOf("http") === 0) {
      await loadFromUrl(key);
    } else {
      await loadFromUrl(api.getDownloadUrl(key));
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
  const res = await fetch(api.uploadEndpoint, {
    method: "POST",
    mode: "cors",
    headers: {
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body: mml,
  });
  const { id } = await res.json();
  return `https://f.msxplay.com/${id}`;
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
    wrap: "free", // "free" | "off"
  };
  const options = JSON.parse(window.localStorage.getItem(EDITOR_OPTIONS_KEY) || "{}");
  return {
    ...defaultEditorOptions,
    ...options,
  };
}

function saveEditorOptions() {
  const options = editor.getOptions();
  window.localStorage.setItem(
    EDITOR_OPTIONS_KEY,
    JSON.stringify({
      theme: options["theme"],
      fontSize: options["fontSize"],
      wrap: options["wrap"],
    })
  );
}

var editor;

function createAceEditor() {
  try {
    editor = ace.edit("editor");
    editor.commands.bindKey("Ctrl-P", "golineup");
    editor.commands.removeCommand("showSettingsMenu");
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
    console.error(e);
    window.alert("Failed to create the Ace editor instance. Please check your network connection.");
  }
}

var marker = null;
function addErrorMarker(line, message) {
  var range = ace.require("ace/range");
  editor.getSession().setAnnotations([
    {
      row: line,
      column: 0,
      text: message,
      type: "error",
    },
  ]);
  marker = editor
    .getSession()
    .addMarker(new range.Range(line, 0, line, 2000), "mml-error", "line", true);
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
      result.duration = MSXPlayUI.parseTime(m[1]);
    }
  }

  m = mml.match(/^;\[.*fade=([0-9a-z]+).*\]/im);
  if (m) {
    result.fade = MSXPlayUI.parseTime(m[1]);
  }

  m = mml.match(/^;\[.*loop=([0-9a-z]+).*\]/im);
  if (m) {
    result.loop = parseInt(m[1]);
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

  m = mml.match(/^;\[.*lpf=([0-9]).*\]/im);
  if (m) {
    if (m[1] != 0) {
      result.rcf = { resistor: 3870, capacitor: 15 };
    }
  }

  return result;
}

function editorCoverButtonPressed() {
  document.getElementById("editor-cover").style.display = "none";
  var player = document.getElementById("player");
  MSXPlayUI.play(player);
}

function compile(autoplay) {
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

  player.dataset.duration = info.duration;
  player.dataset.gain = info.gain != null ? info.gain : 1.0;
  if (info.fade) {
    player.dataset.fade = info.fade;
  } else {
    delete player.dataset.fade;
  }
  if (info.loop) {
    player.dataset.loop = info.loop;
  } else {
    delete player.dataset.loop;
  }
  player.dataset.cpu = info.cpu != null ? info.cpu : 0;
  if (info.rcf != null) {
    player.dataset.rcf = JSON.stringify(info.rcf);
  } else {
    delete player.dataset.rcf;
  }

  MSXPlayUI.setDataToPlayer(player, result.mgs, lastCompiledName);

  let toArrayBuffer = (u8a) => u8a.buffer.slice(u8a.byteOffset);

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
    console.error(e);
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
      console.log(version);
      if (version && /^MGS[3A]/.test(version)) {
        if (/[3A](00|01|02|03)$/.test(version)) {
          const ret = await showDialogAsync("mgsrc-legacy-warn");
          if (ret !== "ok") {
            resolve(false);
            return;
          }
        }
        console.log("mgsrc");
        const mml = convertFromMGS(reader.result);
        if (mml) {
          loadText(`;[gain=1.0 name=${file.name} duration=300s fade=5s]\n${mml}`);
          resolve(true);
        } else {
          console.log("failed");
        }
      } else {
        const mml = MSXPlayUI.decode_text(u);
        if (mml) {
          loadText(mml);
          resolve(true);
          return;
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
    gain: info.gain != null ? info.gain : 1.0,
    loop: info.loop ? info.loop : 2,
    playTime: info.duration != null ? info.duration : 600 * 1000,
    fadeTime: info.fade != null ? info.fade : 3000,
    sampleRate: rate,
    bitRate: kbps,
    quality: quality,
    rcf: info.rcf,
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
  saveAs(blob, (lastCompiledName || Date.now()) + ".mml");
}

function downloadMMLforMSX() {
  const mml4msx = MSXPlayUI.convertToMSXDOSText(editor.getValue());
  var blob = new Blob([mml4msx], { type: "text/plain" });
  saveAs(blob, (lastCompiledName || Date.now()) + ".mus");
}

function downloadMGS() {
  if (compile(false)) {
    var blob = new Blob([lastCompiledMGS], {
      type: "application/octet-stream",
    });
    saveAs(blob, lastCompiledName + ".mgs");
  } else {
    showDialog("no-mgs");
  }
}

async function downloadVGM() {
  MSXPlayUI.stop();
  const progs = document.querySelectorAll("#to-vgm .progress");

  if (compile(false)) {
    let abortEncode = false;
    showDialog("to-vgm", () => {
      abortEncode = true;
    });

    let hasError = false;
    try {
      const mml = getEditorMML();
      const info = getMetaMMLInfo(mml);
      let duration = 300 * 1000;
      if (info.duration) {
        duration = info.duration * 1000;
      }
      const vgm = await MSXPlayUI.toVGM(lastCompiledMGS, duration, info.loop, (progress, total) => {
        for (let i = 0; i < progs.length; i++) {
          progs[i].innerText = (progress / 1000).toFixed(0);
        }
        return abortEncode;
      });
      if (vgm != null) {
        const blob = new Blob([vgm], {
          type: "application/octet-stream",
        });
        saveAs(blob, lastCompiledName + ".vgm");
      }
    } catch (e) {
      hasError = true;
    } finally {
      hideDialog("to-vgm");
    }

    if (hasError) {
      showDialog("unknown-error");
    }
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
    }
    if (e === "mml-for-msx") {
      downloadMMLforMSX();
    } else if (e === "mgs") {
      downloadMGS();
    } else if (e === "vgm") {
      downloadVGM();
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
      compile(true);
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
  const wrapSel = document.querySelector("#settings select[name='wrap']");
  wrapSel.value = editor.getOption("wrap");

  showDialog("settings", (value) => {
    if (value == "reset") {
      resetSettings();
    }
  });
}

function onThemeChange(event) {
  const id = event.srcElement.value;
  editor.setTheme(_themeIdToPath(id));
  // Workaround for Safari: focus to apply background color.
  editor.focus();
  saveEditorOptions();
}

function onFontSizeChange(event) {
  const fontSize = event.srcElement.value;
  editor.setOption("fontSize", parseInt(fontSize));
  saveEditorOptions();
}

function onWrapChange(event) {
  const wrap = event.srcElement.value;
  editor.setOption("wrap", wrap);
  saveEditorOptions();
}

function resetSettings() {
  localStorage.removeItem(EDITOR_OPTIONS_KEY);
  editor.setOptions(loadEditorOptions());
  openSettings();
}
