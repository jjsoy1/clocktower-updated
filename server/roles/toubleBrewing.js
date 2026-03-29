module.exports = {
  Imp: {
    name: "Imp",
    team: "demon",
    order: 99,
    night: (game, playerId, io, data) => {
      // Demon kills target
      if(data.target && game.players[data.target]) {
        game.nightDeaths.push(data.target);
      }
    }
  },

  Empath: {
    name: "Empath",
    team: "townsfolk",
    order: 1,
    night: (game, playerId, io) => {
      // Sends info about neighboring alive players
      const players = Object.values(game.players);
      const index = players.findIndex(p => p.id === playerId);
      const neighbors = [
        players[(index - 1 + players.length) % players.length].name,
        players[(index + 1) % players.length].name
      ];
      io.to(playerId).emit("nightInfo", { neighbors });
    }
  },

  FortuneTeller: {
    name: "FortuneTeller",
    team: "townsfolk",
    order: 2,
    night: (game, playerId, io, data) => {
      // Checks target role
      if(data.target && game.players[data.target]) {
        const role = game.players[data.target].role;
        io.to(playerId).emit("fortuneResult", { target: data.target, role });
      }
    }
  },

  // Add more roles here following the same structure
};