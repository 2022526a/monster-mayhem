class Monster {
  constructor(type, playerId, position) {
    this.type = type;
    this.playerId = playerId;
    this.position = position;
  }
}

class Player {
  constructor(id, name, edge) {
    this.id = id;
    this.name = name;
    this.edge = edge;
    this.monsters = [];
  }
}

class Game {
  constructor() {
    this.grid = Array(10).fill().map(() => Array(10).fill(null));
    this.players = [];
    this.currentPlayerIndex = 0;
  }

  addPlayer(socketId, name) {
    const edges = ['top', 'right', 'bottom', 'left'];
    const edge = edges[this.players.length % 4];
    const player = new Player(socketId, name, edge);
    this.players.push(player);
    return player;
  }

  addMonster(playerId, type, position) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    if (!this.isOnEdge(position, player.edge)) {
      return false;
    }

    if (this.grid[position.row][position.col]) {
      return false;
    }

    const monster = new Monster(type, playerId, position);
    player.monsters.push(monster);
    this.grid[position.row][position.col] = monster;
    return true;
  }

  isOnEdge(position, edge) {
    switch (edge) {
      case 'top': return position.row === 0;
      case 'right': return position.col === 9;
      case 'bottom': return position.row === 9;
      case 'left': return position.col === 0;
      default: return false;
    }
  }
}

module.exports = Game;