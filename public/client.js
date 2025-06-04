const socket = io();
let playerId = null;
let currentRoom = null;
let selectedMonsterType = null;
let selectedMonsterPosition = null;
let players = [];

let gameState = {
  grid: Array(10).fill().map(() => Array(10).fill(null)),
  players: [],
  currentPlayer: null,
  round: 1,
  gameOver: false,
  stats: { gamesPlayed: 0, wins: 0, losses: 0 },
  yourPlayerId: null
};
document.getElementById('game-container').style.display = 'none';
document.getElementById('game-over').style.display = 'none';
updateUI();

document.getElementById('join-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('player-name').value.trim() || `Player_${Math.floor(Math.random()*1000)}`;
  const room = document.getElementById('room-code').value.trim() || 'default';
  
  socket.emit('joinGame', { room, name }, (response) => {
    if (response?.success) {
      playerId = response.playerId;
      currentRoom = room;
      gameState = response.gameState || gameState;
      gameState.yourPlayerId = playerId;
      
      document.getElementById('lobby').style.display = 'none';
      document.getElementById('game-container').style.display = 'block';
      updateUI();
    }
  });
});

socket.on('playerListUpdate', (data) => {
  players = data.players;
  updatePlayerList();
});

socket.on('gameUpdate', (newState) => {
  gameState = { ...newState, yourPlayerId: playerId };
  updateUI();
});

socket.on('requestState', ({ room }) => {
  if (games[room]) {
    console.log(`Sending state to ${socket.id} for room ${room}`);
    socket.emit('gameUpdate', games[room].getStateForPlayer(socket.id));
  }
});

function updateDebugInfo() {
  const debugInfo = document.getElementById('debug-info');
  debugInfo.innerHTML = `
    <p>Socket ID: ${socket.id || 'disconnected'}</p>
    <p>Player ID: ${playerId || 'none'}</p>
    <p>Room: ${currentRoom || 'none'}</p>
    <p>Connections: ${socket.connected ? 'connected' : 'disconnected'}</p>
    <p>Last event: ${new Date().toLocaleTimeString()}</p>
  `;
}

socket.onAny(() => updateDebugInfo());


socket.on('playerJoined', (data) => {
  players = data.players;
  updatePlayerList();
  console.log(`${data.playerName} joined the game`);
});


function updatePlayerList() {
  const playerList = document.getElementById('player-list');
  playerList.innerHTML = players.map(player => `
    <li class="${player.id === playerId ? 'you' : ''} ${player.eliminated ? 'eliminated' : ''}">
      ${player.name} (${player.monsters})
      ${player.id === playerId ? '<span class="you-badge">YOU</span>' : ''}
      ${player.eliminated ? '<span class="eliminated-badge">ELIMINATED</span>' : ''}
    </li>
  `).join('');
}

function renderBoard(grid) {
  const container = document.getElementById('game-board');
  container.innerHTML = '';
  
  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellElement = document.createElement('div');
      cellElement.className = 'cell';
      cellElement.dataset.position = `${rowIndex},${colIndex}`;
      
      if (cell) {
        const monster = document.createElement('div');
        monster.className = `monster ${cell.type}`;
        monster.textContent = gameState.players.find(p => p.id === cell.playerId)?.name.charAt(0) || '?';
        cellElement.appendChild(monster);
        
        if (cell.playerId === playerId) {
          cellElement.classList.add('your-monster');
        }
      }
      
      cellElement.addEventListener('click', () => handleCellClick(rowIndex, colIndex));
      container.appendChild(cellElement);
    });
  });
}

document.body.insertAdjacentHTML('afterbegin', `
  <div id="players-panel">
    <h3>Players</h3>
    <ul id="player-list"></ul>
  </div>
`);


function updateUI() {
  renderBoard(gameState.grid);
  document.getElementById('round-count').textContent = gameState.round;
  
  const currentPlayerDisplay = document.getElementById('current-player');
  if (gameState.currentPlayer) {
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer.id);
    currentPlayerDisplay.textContent = `${currentPlayer?.name || 'Unknown'} (${currentPlayer?.monsters?.length || 0} monsters)`;
    currentPlayerDisplay.className = gameState.currentPlayer.id === playerId ? 'your-turn' : '';
  } else {
    currentPlayerDisplay.textContent = 'Waiting for players...';
    currentPlayerDisplay.className = '';
  }

  const player = gameState.players.find(p => p.id === playerId);
  if (player) {
    document.getElementById('monsters-count').textContent = player.monsters?.length || 0;
    document.getElementById('monsters-lost').textContent = player.monstersLost || 0;
  }

  const controls = document.getElementById('controls');
  if (gameState.currentPlayer?.id !== playerId || gameState.gameOver) {
    controls.style.opacity = '0.5';
    controls.style.pointerEvents = 'none';
  } else {
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'auto';
  }

  if (gameState.gameOver) {
    const winner = gameState.players.find(p => !p.eliminated);
    const message = winner?.id === playerId ? 'You won!' : 'Game over!';
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over').style.display = 'block';
  }

  const endTurnBtn = document.getElementById('end-turn');
  endTurnBtn.disabled = gameState.currentPlayer?.id !== playerId || gameState.gameOver;
  endTurnBtn.textContent = 'End Turn';
}

function handleCellClick(row, col) {
  if (gameState.currentPlayer?.id !== playerId || gameState.gameOver) return;
  
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
      if (r === row && c === col) continue;
        if (isValidMove(row, col, r, c)) {
        const cellElement = document.querySelector(`.cell[data-position="${r},${c}"]`);
        if (cellElement) {
          cellElement.classList.add('available-move');
          const rowDiff = Math.abs(r - row);
          const colDiff = Math.abs(c - col);
          
          if (rowDiff === 0 || colDiff === 0) {
            cellElement.classList.add('straight-move');
          } else {
            cellElement.classList.add('diagonal-move');
          }
        }
      }
    }
  }
}

function highlightAvailableMoves(row, col) {
  clearHighlights();
  
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (isValidMove(row, col, r, c)) {
        const cell = document.querySelector(`.cell[data-position="${r},${c}"]`);
        if (cell) cell.classList.add('available-move');
      }
    }
  }
}

function clearHighlights() {
  document.querySelectorAll('.cell').forEach(el => {
    el.classList.remove('available-move');
  });
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

document.querySelectorAll('.monster-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMonsterType = btn.dataset.type;
    document.querySelectorAll('.monster-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

document.getElementById('place-monster').addEventListener('click', () => {
  if (!selectedMonsterType) return alert('Select a monster type first');
  socket.emit('placeMonster', { 
    type: selectedMonsterType, 
    playerId, 
    room: currentRoom 
  });
});

document.getElementById('end-turn').addEventListener('click', () => {
  if (gameState.currentPlayer?.id === playerId) {
    const endTurnBtn = document.getElementById('end-turn');
    endTurnBtn.disabled = true;
    endTurnBtn.textContent = 'Ending Turn...';
    
    socket.emit('endTurn', { playerId, room: currentRoom }, () => {
      endTurnBtn.disabled = false;
      endTurnBtn.textContent = 'End Turn';
    });
  }
});

document.getElementById('play-again').addEventListener('click', () => {
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('lobby').style.display = 'block';
});


