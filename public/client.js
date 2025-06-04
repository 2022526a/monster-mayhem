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
      }
      
      container.appendChild(cellElement);
    });
  });
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



function updateUI() {
  renderBoard(gameState.grid);
  document.getElementById('round-count').textContent = gameState.round;
  
  const currentPlayerDisplay = document.getElementById('current-player');
  if (gameState.currentPlayer) {
    currentPlayerDisplay.textContent = `${gameState.currentPlayer.name} (${gameState.currentPlayer.monsters?.length || 0} monsters)`;
    currentPlayerDisplay.className = gameState.currentPlayer.id === playerId ? 'your-turn' : '';
  }

  const player = gameState.players.find(p => p.id === playerId);
  if (player) {
    document.getElementById('monsters-count').textContent = player.monsters?.length || 0;
    document.getElementById('monsters-lost').textContent = player.monstersLost || 0;
  }

  if (gameState.gameOver) {
    const winner = gameState.players.find(p => !p.eliminated);
    const message = winner?.id === playerId ? 'You won!' : 'Game over!';
    document.getElementById('game-over-message').textContent = message;
    document.getElementById('game-over').style.display = 'block';
  }
}

function updatePlayerList() {
  const playerList = document.getElementById('player-list');
  playerList.innerHTML = gameState.players.map(player => `
    <li class="${player.id === playerId ? 'you' : ''} ${player.eliminated ? 'eliminated' : ''}">
      ${player.name} (${player.monsters?.length || 0})
      ${player.id === playerId ? '<span class="you-badge">YOU</span>' : ''}
      ${player.eliminated ? '<span class="eliminated-badge">ELIMINATED</span>' : ''}
    </li>
  `).join('');
}
document.getElementById('play-again').addEventListener('click', () => {
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('lobby').style.display = 'block';
});