const express = require('express');
const socketio = require('socket.io');
const path = require('path');
const http = require('http');
const Game = require('./game');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
}); 

app.use(express.static(path.join(__dirname, '../public')));

const games = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinGame', (data, callback) => {
    const { room, name } = data;
    
    if (!games[room]) {
      games[room] = new Game();
      console.log(`Created new room: ${room}`);
    }
    
    const game = games[room];
    const player = game.addPlayer(socket.id, name);
    
    socket.join(room);
    console.log(`${name} joined room ${room}`);

    
    io.to(room).emit('playerListUpdate', {
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        eliminated: p.eliminated,
        monsters: p.monsters.length
      }))
    });

    callback({
      success: true,
      playerId: player.id,
      edge: player.edge,
      gameState: game.getStateForPlayer(player.id)
    });

    if (game.players.length >= 2) {
      if (game.players.length === 2) {
        game.nextTurn();
      }
      game.players.forEach(p => {
  io.to(p.id).emit('gameUpdate', game.getStateForPlayer(p.id));
});

    }
  });

socket.on('placeMonster', (data) => {
  const { type, playerId, room } = data;
  const game = games[room];
  
  if (!game || !game.currentPlayer || game.currentPlayer.id !== playerId) {
    console.log('Invalid placeMonster attempt:', { playerId, currentPlayer: game?.currentPlayer?.id });
    return;
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player) return;


  let position = findEdgePosition(game, player.edge);
  if (position && game.addMonster(playerId, type, position)) {
    io.to(room).emit('gameUpdate', game.getStateForPlayer());
  }
});

socket.on('moveMonster', (data) => {
  const { from, to, playerId, room } = data;
  const game = games[room];
  
  if (!game || !game.currentPlayer || game.currentPlayer.id !== playerId) {
    console.log('Invalid moveMonster attempt:', { playerId, currentPlayer: game?.currentPlayer?.id });
    return;
  }

  if (game.moveMonster(playerId, from, to)) {
    io.to(room).emit('gameUpdate', game.getStateForPlayer());
  }
});

socket.on('endTurn', (data) => {
  const { playerId, room } = data;
  const game = games[room];
  
  if (!game || !game.currentPlayer || game.currentPlayer.id !== playerId) {
    console.log('Invalid endTurn attempt:', { playerId, currentPlayer: game?.currentPlayer?.id });
    return;
  }

  game.nextTurn();
  game.players.forEach(player => {
    io.to(player.id).emit('gameUpdate', game.getStateForPlayer(player.id));
  });
});

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    Object.keys(games).forEach(room => {
      const game = games[room];
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        io.to(room).emit('playerListUpdate', {
          players: game.players.map(p => ({
            id: p.id,
            name: p.name,
            eliminated: p.eliminated,
            monsters: p.monsters.length
          }))
        });
      }
    });
  });
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

setInterval(() => {
  Object.entries(games).forEach(([room, game]) => {
    console.log(`Room ${room} current player:`, game.currentPlayer?.id || 'none');
  });
}, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});