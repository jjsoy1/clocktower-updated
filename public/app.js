const socket = io();

function join() {
  const name = document.getElementById("name").value;
  const gameId = document.getElementById("gameId").value;

  socket.emit("joinGame", { name, gameId });
}

socket.on("updatePlayers", (players) => {
  document.getElementById("players").innerText =
    Object.values(players).map(p => p.name).join(", ");
});