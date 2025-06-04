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
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer.id);
    currentPlayerDisplay.textContent = `${currentPlayer?.name || 'Unknown'} (${currentPlayer?.monsters?.length || 0} monsters)`;
    currentPlayerDisplay.className = gameState.currentPlayer.id === playerId ? 'your-turn' : '';
  }

  const controls = document.getElementById('controls');
  if (gameState.currentPlayer?.id !== playerId || gameState.gameOver) {
    controls.style.opacity = '0.5';
    controls.style.pointerEvents = 'none';
  } else {
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'auto';
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

document.getElementById('play-again').addEventListener('click', () => {
  document.getElementById('game-over').style.display = 'none';
  document.getElementById('lobby').style.display = 'block';
});