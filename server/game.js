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

 moveMonster(playerId, from, to) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    const monster = this.grid[from.row]?.[from.col];
    if (!monster || monster.playerId !== playerId) return false;

    if (!this.isValidMove(from, to)) return false;

    if (!this.isPathClear(from, to)) return false;

    const targetMonster = this.grid[to.row][to.col];
    if (targetMonster) {
      return this.handleConflict(monster, targetMonster, to);
    }

    this.grid[from.row][from.col] = null;
    this.grid[to.row][to.col] = monster;
    monster.position = to;
    return true;
  }

  isValidMove(from, to) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    if ((rowDiff === 0 || colDiff === 0) && rowDiff + colDiff > 0) {
      return true;
    }

    if (rowDiff === colDiff && rowDiff <= 2) {
      return true;
    }

    return false;
  }

  isPathClear(from, to) {
    if (from.row !== to.row && from.col !== to.col) return true;

    const rowStep = from.row < to.row ? 1 : from.row > to.row ? -1 : 0;
    const colStep = from.col < to.col ? 1 : from.col > to.col ? -1 : 0;

    let currentRow = from.row + rowStep;
    let currentCol = from.col + colStep;

    while (currentRow !== to.row || currentCol !== to.col) {
      if (this.grid[currentRow][currentCol] !== null) {
        return false;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }

    return true;
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.currentPlayerIndex === 0) {
      this.round++;
    }
    return this.players[this.currentPlayerIndex];
  }

  getStateForPlayer(playerId) {
    return {
      grid: this.grid,
      players: this.players,
      currentPlayer: this.players[this.currentPlayerIndex],
      round: this.round,
      yourPlayerId: playerId
    };
  }


  handleConflict(attacker, defender, position) {
    const attackerPlayer = this.players.find(p => p.id === attacker.playerId);
    const defenderPlayer = this.players.find(p => p.id === defender.playerId);

    if (attacker.type === defender.type) {
      // Both monsters die if same type
      this.removeMonster(attacker, attackerPlayer);
      this.removeMonster(defender, defenderPlayer);
      this.grid[position.row][position.col] = null;
      return true;
    }

    let winner, loser;
    if (
      (attacker.type === 'vampire' && defender.type === 'werewolf') ||
      (attacker.type === 'werewolf' && defender.type === 'ghost') ||
      (attacker.type === 'ghost' && defender.type === 'vampire')
    ) {
      winner = attacker;
      loser = defender;
    } else {
      winner = defender;
      loser = attacker;
    }

    this.removeMonster(loser, loser.playerId === attacker.playerId ? attackerPlayer : defenderPlayer);
    this.grid[position.row][position.col] = winner;
    winner.position = position;
    return true;
  }

  removeMonster(monster, player) {
    player.monsters = player.monsters.filter(m => m.id !== monster.id);
    player.monstersLost = (player.monstersLost || 0) + 1;
    
    if (player.monstersLost >= 10) {
      player.eliminated = true;
      this.checkGameOver();
    }
  }

  checkGameOver() {
    const activePlayers = this.players.filter(p => !p.eliminated);
    if (activePlayers.length === 1) {
      this.gameOver = true;
      this.stats.gamesPlayed++;
      this.stats.wins[activePlayers[0].id] = (this.stats.wins[activePlayers[0].id] || 0) + 1;
    }
  }

  // Update getStateForPlayer to include gameOver and stats
  getStateForPlayer(playerId) {
    return {
      grid: this.grid,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        monsters: p.monsters,
        eliminated: p.eliminated,
        monstersLost: p.monstersLost
      })),
      currentPlayer: this.players[this.currentPlayerIndex],
      round: this.round,
      gameOver: this.gameOver,
      stats: this.stats,
      yourPlayerId: playerId
    };
  }
  
  }
module.exports = Game;