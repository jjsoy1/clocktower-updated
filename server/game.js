class Game {
  constructor(hostId) {
    this.hostId = hostId;

    this.players = {};
    this.phase = "lobby";

    this.effects = {
      poisoned: [],
      drunk: []
    };

    this.nightDeaths = [];
    this.lastExecuted = null;
  }

  addPlayer(id, name) {
    this.players[id] = {
      name,
      role: null,
      alive: true,
      notes: {}
    };
  }
}

module.exports = Game;