function closeModalPlayer() {
  let player = document.getElementById("modal-player");
  MSXPlayUI.stop(player);
  player.remove();
  let stage = document.getElementById("modal-player-stage");
  stage.style.display = "none";
  window.history.replaceState(null, null, `${location.pathname}`);
}

function onPlayerCoverClick() {
  document.getElementById("modal-player-cover").style.display = "none";
  var player = document.getElementById("modal-player");
  MSXPlayUI.play(player);
}

function createPlayerCover() {
  const root = document.createElement('div');
  const button = document.createElement('div');
  root.id = 'modal-player-cover';
  button.classList.add('button');
  button.innerHTML = '<i class="material-icons" style="vertical-align:middle;">play_circle_outline</i> TAP to PLAY';
  button.addEventListener('click', onPlayerCoverClick);
  root.append(button)
  return root;
}

async function showModalPlayer(obj, name) {
  let player;
  if (typeof obj === "string") {
    player = MSXPlayUI.createPlayerFromUrl(obj);
  } else {
    player = MSXPlayUI.createPlayer(obj, name);
  }

  player.setAttribute("id", "modal-player");
  const stage = document.getElementById("modal-player-stage");
  const cover = createPlayerCover();
  stage.append(player);
  stage.append(cover);
  stage.style.display = "block";
  await MSXPlayUI.attach(player);
}
