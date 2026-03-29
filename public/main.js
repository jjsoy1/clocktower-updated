const socket = io();
let playerId = null;
let currentGame = "defaultGame";
let myRole = null;

// --- Join Game ---
document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("playerName").value;
  if (!name) return;
  socket.emit("joinGame", { gameId: currentGame, name, isHost: false });
  document.getElementById("lobby").style.display = "none";
  document.getElementById("gameScreen").style.display = "block";
});

// --- Update Player List ---
socket.on("updatePlayers", players => {
  const list = document.getElementById("playersList");
  list.innerHTML = "";
  for (let id in players) {
    const div = document.createElement("div");
    div.textContent = players[id].name + (players[id].alive ? "" : " (Dead)");
    div.onclick = () => selectPlayerForAction(id);
    list.appendChild(div);
  }
});

// --- Night Actions ---
function selectPlayerForAction(targetId) {
  // Example: Fortune Teller or Poisoner selects target
  const actionData = { target: targetId };
  socket.emit("submitNightAction", { gameId: currentGame, data: actionData });
}

// --- Role Info ---
socket.on("nightInfo", ({ info }) => {
  document.getElementById("roleInfo").innerText = info;
});

// --- Notes ---
document.querySelectorAll("#playerCards div").forEach(card => {
  card.addEventListener("click", () => {
    const noteArea = document.getElementById("playerNotes");
    noteArea.placeholder = `Notes for ${card.innerText}`;
  });
});