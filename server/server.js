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

app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});