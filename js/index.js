function findDndFrame(element) {
  var panel = element;
  while (panel != null && !panel.classList.contains("dnd-able")) {
    panel = panel.parentNode;
  }
  return panel;
}

var dragNestCounter = 0;

function onDragEnter(e) {
  var dndPanel = findDndFrame(e.srcElement);
  if (dragNestCounter === 0) {
    if (dndPanel && dndPanel.classList.contains("dnd-able")) {
      dndPanel.classList.add("ondrag");
    }
  }
  e.preventDefault();
  e.stopPropagation();
  dragNestCounter++;
}

function onDragLeave(e) {
  var dndPanel = findDndFrame(e.srcElement);
  e.stopPropagation();
  e.preventDefault();
  dragNestCounter--;

  if (dragNestCounter === 0) {
    dndPanel.classList.remove("ondrag");
    currentDnDTarget = null;
  }
}

function onDragOver(e) {
  e.preventDefault();
}

async function createPlayerForFile(file, dndPanel) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onloadend = function () {
      try {
        var player = MSXPlayUI.createPlayer(reader.result, file.name);
        player.classList.add("dnd-able");
        makeDnDable(player);
        dndPanel.parentNode.insertBefore(player, dndPanel);
        MSXPlayUI.play(player);
        resolve();
      } catch (e) {
        console.log(e);
        reject();
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function onDrop(e) {
  var dndPanel = findDndFrame(e.srcElement);

  dndPanel.classList.remove("ondrag");
  dragNestCounter = 0;

  e.preventDefault();
  e.stopPropagation();

  var tasks = [];
  for (var i = 0; i < e.dataTransfer.files.length; i++) {
    tasks.push(createPlayerForFile(e.dataTransfer.files[i], dndPanel));
  }

  Promise.all(tasks).then(function (values) {
    if (dndPanel.classList.contains("msxplay")) {
      dndPanel.remove();
    }
  });
}

function makeDnDable(e) {
  e.addEventListener("dragover", onDragOver);
  e.addEventListener("dragenter", onDragEnter);
  e.addEventListener("dragleave", onDragLeave);
  e.addEventListener("drop", onDrop);
}

var queries = QueryParser.parse();
var target = queries["open"];
if (target && !/.*\.(mgs|kss|mpk|opx|bgm|mbm)/i.test(target)) {
  location.pathname = "/editor.html";
}

window.addEventListener("DOMContentLoaded", function () {
  let elems = document.querySelectorAll("a.incomplete");
  for (let i = 0; i < elems.length; i++) {
    const href = elems[i]
      .getAttribute("data-href")
      .trim()
      .replace(/\$\{host_path\}/, `${location.protocol}//${location.host}${location.path ? location.path : ""}`);
    elems[i].setAttribute("href", href);
    elems[i].innerText = href;
  }

  MSXPlayUI.install(document.body).then(() => {
    elems = document.getElementsByClassName("dnd-able");
    for (let i = 0; i < elems.length; i++) {
      makeDnDable(elems[i]);
    }
    if (target) {
      window.history.replaceState(null, null, `${location.pathname}`);
      showModalPlayer(target);
    }
  });
});