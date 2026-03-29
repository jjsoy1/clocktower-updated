// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const roles = require("./server/roles/troubleBrewing");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// --------------------- GAME OBJECT ---------------------
const games = {};

// Example structure of a game object
// games[gameId] = {
//   id: gameId,
//   players: { playerId: {id, name, role, team, alive, ravenTarget? } },
//   nightOrder: [],
//   nightDeaths: [],
//   lastExecuted: null,
//   effects: { poisoned: [], protected: [] },
//   host: hostId,
//   playerActions: {} // for submitting night actions
// };

// --------------------- NIGHT ORDER ---------------------
function computeNightOrder(game) {
  const alivePlayers = Object.values(game.players)
    .filter(p => p.alive)
    .sort((a, b) => roles[a.role].order - roles[b.role].order);
  return alivePlayers.map(p => p.id);
}

// --------------------- RUN NIGHT PHASE ---------------------
async function runNightPhase(gameId) {
  const game = games[gameId];
  game.nightDeaths = [];
  game.effects.protected = [];
  game.nightOrder = computeNightOrder(game);

  for (const playerId of game.nightOrder) {
    const roleObj = roles[game.players[playerId].role];
    if (!roleObj || !roleObj.night) continue;

    // Wait for player action if needed
    const actionData = await waitForPlayerAction(playerId, game);
    roleObj.night(game, playerId, io, actionData);
  }

  resolveNight(gameId);
}

// --------------------- WAIT FOR PLAYER ACTION ---------------------
function waitForPlayerAction(playerId, game) {
  return new Promise(resolve => {
    const existingAction = game.playerActions[playerId] || null;
    if (existingAction) {
      resolve(existingAction);
      game.playerActions[playerId] = null; // reset
    } else {
      // Listen for player action
      const handler = (data) => {
        resolve(data);
        game.playerActions[playerId] = null;
        io.off(`playerAction:${playerId}`, handler);
      };
      io.on(`playerAction:${playerId}`, handler);
    }
  });
}

// --------------------- RESOLVE NIGHT ---------------------
function resolveNight(gameId) {
  const game = games[gameId];

  // Remove protected players
  const finalDeaths = game.nightDeaths.filter(
    id => !game.effects.protected.includes(id)
  );

  // Handle Ravenkeeper death
  finalDeaths.forEach(id => {
    const player = game.players[id];
    if (player.role === "Ravenkeeper" && player.alive && player.ravenTarget) {
      const targetRole = game.players[player.ravenTarget]?.role;
      io.to(id).emit("ravenInfo", { role: targetRole });
    }
  });

  // Apply deaths
  finalDeaths.forEach(id => game.players[id].alive = false);

  // Handle Scarlet Woman star-pass
  const demonAlive = Object.values(game.players).some(p => p.role === "Imp" && p.alive);
  if (!demonAlive) {
    const sw = Object.values(game.players).find(p => p.role === "Scarlet Woman" && p.alive);
    if (sw) sw.role = "Imp"; // becomes new demon
  }

  io.to(Object.keys(game.players)).emit("updatePlayers", game.players);
}

// --------------------- GUNSLINGER DAY KILL ---------------------
function gunslingerShoot(gameId, playerId, targetId) {
  const game = games[gameId];
  const gs = game.players[playerId];
  if (!gs || !gs.alive || gs.role !== "Gunslinger") return;

  const target = game.players[targetId];
  if (target && target.alive) {
    target.alive = false;
    io.to(targetId).emit("killedByGunslinger", {});
    io.to(Object.keys(game.players)).emit("updatePlayers", game.players);
  }
}

// --------------------- MAYOR WIN CHECK ---------------------
function checkMayorWin(gameId) {
  const game = games[gameId];
  const mayor = Object.values(game.players).find(p => p.role === "Mayor");
  const alivePlayers = Object.values(game.players).filter(p => p.alive);

  if (!mayor || !mayor.alive) return;

  // Example: Mayor triggers win if >=3 alive and end-of-day condition
  if (alivePlayers.length >= 3) {
    io.to(Object.keys(game.players)).emit("gameOver", { winner: "townsfolk", reason: "Mayor win condition" });
  }
}

// --------------------- SOCKET.IO ---------------------
io.on("connection", socket => {
  console.log("Player connected:", socket.id);

  // Submit night action
  socket.on("submitNightAction", ({ gameId, data }) => {
    const game = games[gameId];
    if (!game) return;
    game.playerActions[socket.id] = data;
  });

  // Gunslinger day kill
  socket.on("gunslingerShoot", ({ gameId, targetId }) => {
    gunslingerShoot(gameId, socket.id, targetId);
  });

  // Join or create game
  socket.on("joinGame", ({ gameId, name, isHost }) => {
    if (!games[gameId]) games[gameId] = { id: gameId, players: {}, effects: {}, host: socket.id, playerActions: {} };
    games[gameId].players[socket.id] = { id: socket.id, name, alive: true };
    if (isHost) games[gameId].host = socket.id;

    io.to(Object.keys(games[gameId].players)).emit("updatePlayers", games[gameId].players);
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    for (const game of Object.values(games)) {
      delete game.players[socket.id];
      io.to(Object.keys(game.players)).emit("updatePlayers", game.players);
    }
  });
});

// --------------------- START SERVER ---------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});