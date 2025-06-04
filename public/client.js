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

function updateUI() {
  renderBoard(gameState.grid);
  
  const currentPlayerDisplay = document.getElementById('current-player');
  if (gameState.currentPlayer) {
    currentPlayerDisplay.textContent = gameState.currentPlayer.name;
  }

  updatePlayerList();
}

function updatePlayerList() {
  const playerList = document.getElementById('player-list');
  playerList.innerHTML = gameState.players.map(player => `
    <li class="${player.id === playerId ? 'you' : ''}">
      ${player.name} (${player.monsters?.length || 0})
    </li>
  `).join('');
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