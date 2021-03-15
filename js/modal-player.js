function closeModalPlayer() {
  let player = document.getElementById("modal-player");
  MSXPlayUI.stop(player);
  player.remove();
  let stage = document.getElementById("modal-player-stage");
  stage.style.display = "none";
  window.history.replaceState(null, null, `${location.pathname}`);
}

async function showModalPlayer(obj, name) {
  let player;
  if (typeof obj === "string") {
    player = MSXPlayUI.createPlayerFromUrl(obj);
  } else {
    player = MSXPlayUI.createPlayer(obj, name);
  }

  player.setAttribute("id", "modal-player");
  let stage = document.getElementById("modal-player-stage");
  stage.append(player);
  stage.style.display = "block";
  await MSXPlayUI.attach(player);

  const ua = window.navigator.userAgent.toLowerCase();

  // if (ua.indexOf("chrome") >= 0 || ua.indexOf("firefox") >= 0 || ua.indexOf("edge") >= 0) {
  //   MSXPlayUI.play(player);
  // }
}
