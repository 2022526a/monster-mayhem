const express = require('express');
const socketio = require('socket.io');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const Game = require('./game');

socket.on('placeMonster', (data) => {
  const { type, playerId, room } = data;
  const game = games[room];
  if (!game) return;

  const player = game.players.find(p => p.id === playerId);
  if (!player) return;

  let position = findEdgePosition(game, player.edge);
  if (position && game.addMonster(playerId, type, position)) {
    io.to(room).emit('gameUpdate', game.getStateForPlayer());
  }
});

function findEdgePosition(game, edge) {
  for (let i = 0; i < 10; i++) {
    switch (edge) {
      case 'top':
        if (!game.grid[0][i]) return { row: 0, col: i };
        break;
      case 'right':
        if (!game.grid[i][9]) return { row: i, col: 9 };
        break;
      case 'bottom':
        if (!game.grid[9][i]) return { row: 9, col: i };
        break;
      case 'left':
        if (!game.grid[i][0]) return { row: i, col: 0 };
        break;
    }
  }
  return null;
}


function handleCellClick(row, col) {
  if (gameState.currentPlayer?.id !== playerId) return;
  
  const cell = gameState.grid[row][col];
  
  if (selectedMonsterPosition) {
    if (document.querySelector(`.cell[data-position="${row},${col}"]`).classList.contains('available-move')) {
      socket.emit('moveMonster', {
        from: selectedMonsterPosition,
        to: { row, col },
        playerId,
        room: currentRoom
      });
    }
    selectedMonsterPosition = null;
    clearHighlights();
  } 
  else if (cell && cell.playerId === playerId) {
    selectedMonsterPosition = { row, col };
    highlightAvailableMoves(row, col);
  }
}

function highlightAvailableMoves(row, col) {
  clearHighlights();
  
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (isValidMove(row, col, r, c)) {
        const cellElement = document.querySelector(`.cell[data-position="${r},${c}"]`);
        if (cellElement) cellElement.classList.add('available-move');
      }
    }
  }
}

function isValidMove(fromRow, fromCol, toRow, toCol) {
  if (fromRow === toRow && fromCol === toCol) return false;
  
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  
  if ((rowDiff === 0 || colDiff === 0) && rowDiff + colDiff > 0) {
    return true;
  }
  
  if (rowDiff === colDiff && rowDiff <= 2) {
    return true;
  }
  
  return false;
}

function clearHighlights() {
  document.querySelectorAll('.cell').forEach(el => {
    el.classList.remove('available-move');
  });
}
socket.on('moveMonster', (data) => {
  const { from, to, playerId, room } = data;
  const game = games[room];
  if (!game) return;

  if (game.moveMonster(playerId, from, to)) {
    io.to(room).emit('gameUpdate', game.getStateForPlayer());
  }
});

socket.on('endTurn', (data) => {
  const { playerId, room } = data;
  const game = games[room];
  if (!game) return;

  game.nextTurn();
  io.to(room).emit('gameUpdate', game.getStateForPlayer());
});

app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});