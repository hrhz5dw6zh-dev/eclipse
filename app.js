let completedGames = JSON.parse(localStorage.getItem("eclipsoCompletedGames")) || [];

let currentGame = null;
let roundDraft = {};
let scoringPlayerId = null;
let selectedButtons = [];
let isFrozen = false;

const scoreButtons = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",

  "x0", "x2", "/2",

  "+1", "+2", "+4", "+6", "+8", "+10",
  "-1", "-2", "-4", "-6", "-8", "-10",

  "Freeze"
];

function saveCompletedGames() {
  localStorage.setItem("eclipsoCompletedGames", JSON.stringify(completedGames));
}

function hideAllScreens() {
  homeScreen.classList.add("hidden");
  newGameScreen.classList.add("hidden");
  activeGameScreen.classList.add("hidden");
  finalResultsScreen.classList.add("hidden");
  previousGamesScreen.classList.add("hidden");
}

function goHome() {
  hideAllScreens();
  homeScreen.classList.remove("hidden");
}

function showNewGame() {
  hideAllScreens();
  newGameScreen.classList.remove("hidden");

  playersContainer.innerHTML = "";
  addPlayerField();
}

function addPlayerField() {
  if (playersContainer.children.length >= 20) {
    alert("Máximo 20 jugadores.");
    return;
  }

  const input = document.createElement("input");
  input.placeholder = `Jugador ${playersContainer.children.length + 1}`;
  playersContainer.appendChild(input);
  input.focus();
}

function startGame() {
  const inputs = document.querySelectorAll("#playersContainer input");

  const players = [];

  inputs.forEach(input => {
    const name = input.value.trim();

    if (name !== "") {
      players.push({
        id: crypto.randomUUID(),
        name,
        rounds: []
      });
    }
  });

  if (players.length < 1) {
    alert("Debes agregar al menos 1 jugador.");
    return;
  }

  currentGame = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    players
  };

  roundDraft = {};

  hideAllScreens();
  activeGameScreen.classList.remove("hidden");

  renderActiveGame();
}

function getTotal(player) {
  return player.rounds.reduce((sum, round) => sum + round.points, 0);
}

function getSortedPlayers(game = currentGame) {
  return [...game.players].sort((a, b) => getTotal(b) - getTotal(a));
}

function rankClass(index) {
  if (index === 0) return "gold";
  if (index === 1) return "silver";
  if (index === 2) return "bronze";
  return "";
}

function medal(index) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return "";
}

function renderActiveGame() {
  renderRanking();
  renderPlayersBoard();
}

function renderRanking() {
  const sorted = getSortedPlayers();

  let html = `<div class="rankingBox"><h2>Ranking</h2>`;

  sorted.forEach((player, index) => {
    const total = getTotal(player);

    let remaining = "";

    if (total > 100 && total < 200) {
      remaining = `<div class="remaining">Faltan ${200 - total} para ganar</div>`;
    }

    if (total >= 200) {
      remaining = `<div class="remaining">Meta alcanzada</div>`;
    }

    html += `
      <div class="rankingRow">
        <div class="${rankClass(index)}">
          ${medal(index)} ${index + 1}. ${player.name}
          ${remaining}
        </div>
        <strong>${total}</strong>
      </div>
    `;
  });

  html += `</div>`;
  ranking.innerHTML = html;
}

function renderPlayersBoard() {
  playersBoard.innerHTML = "";

  currentGame.players.forEach(player => {
    const draft = roundDraft[player.id];

    let draftText = "Pendiente";

    if (draft) {
      if (draft.isDead) {
        draftText = "💀 Muerto - 0 puntos";
      } else if (draft.isFrozen) {
        draftText = `❄️ ${draft.points} puntos`;
      } else {
        draftText = `${draft.points} puntos`;
      }
    }

    const roundsHTML = player.rounds.map((round, index) => {
      if (round.isDead) {
        return `<div class="round dead">R${index + 1}: 💀</div>`;
      }

      if (round.isFrozen) {
        return `<div class="round freeze">R${index + 1}: ❄️ ${round.points}</div>`;
      }

      return `<div class="round">R${index + 1}: ${round.points}</div>`;
    }).join("");

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="playerHeader">
        <div>
          <h2>${player.name}</h2>
          <p class="total">Total: ${getTotal(player)}</p>
          <p class="roundStatus">Esta ronda: ${draftText}</p>
        </div>

        <div class="playerActions">
          <button onclick="openScoreModal('${player.id}')">Agregar puntuación</button>
          <button class="red" onclick="markDead('${player.id}')">Muerto</button>
        </div>
      </div>

      <div class="rounds">
        ${roundsHTML || `<span class="subtitle">Sin rondas guardadas</span>`}
      </div>
    `;

    playersBoard.appendChild(card);
  });
}

function markDead(playerId) {
  roundDraft[playerId] = {
    id: crypto.randomUUID(),
    points: 0,
    isFrozen: false,
    isDead: true
  };

  renderPlayersBoard();
}

function openScoreModal(playerId) {
  scoringPlayerId = playerId;
  selectedButtons = [];
  isFrozen = false;

  const player = currentGame.players.find(p => p.id === playerId);

  scorePlayerName.innerText = player.name;
  pointsPreview.innerText = "0";

  renderScoreButtons();
  updateScorePreview();

  scoreModal.classList.remove("hidden");
}

function closeScoreModal() {
  scoreModal.classList.add("hidden");
}

function renderScoreButtons() {
  scoreButtonsGrid.innerHTML = "";

  scoreButtons.forEach(value => {
    const button = document.createElement("button");
    button.innerText = value;
    button.className = "scoreButton";

    button.onclick = () => toggleScoreButton(value);

    scoreButtonsGrid.appendChild(button);
  });
}

function toggleScoreButton(value) {
  if (value === "Freeze") {
    isFrozen = !isFrozen;
    updateScorePreview();
    return;
  }

  if (selectedButtons.includes(value)) {
    selectedButtons = selectedButtons.filter(v => v !== value);
    updateScorePreview();
    return;
  }

  if (isNormalNumber(value) && normalNumberCount() >= 7) {
    return;
  }

  selectedButtons.push(value);
  updateScorePreview();
}

function isNormalNumber(value) {
  return !value.startsWith("+") &&
         !value.startsWith("-") &&
         !value.startsWith("x") &&
         !value.startsWith("/");
}

function normalNumberCount() {
  return selectedButtons.filter(isNormalNumber).length;
}

function shouldDisable(value) {
  if (selectedButtons.includes(value)) return false;
  if (value === "Freeze") return false;
  return isNormalNumber(value) && normalNumberCount() >= 7;
}

function updateScorePreview() {
  pointsPreview.innerText = calculatePoints();
  normalCounter.innerText = `Números normales: ${normalNumberCount()} / 7`;

  if (normalNumberCount() === 7) {
    bonusText.classList.remove("hidden");
  } else {
    bonusText.classList.add("hidden");
  }

  const buttons = document.querySelectorAll(".scoreButton");

  buttons.forEach(button => {
    const value = button.innerText;

    button.classList.remove("selected", "freezeSelected");

    if (value === "Freeze" && isFrozen) {
      button.classList.add("selected", "freezeSelected");
    }

    if (selectedButtons.includes(value)) {
      button.classList.add("selected");
    }

    button.disabled = shouldDisable(value);
  });
}

function calculatePoints() {

  const normalNumbers = selectedButtons
    .filter(isNormalNumber)
    .map(Number);

  // SUMA BASE DE NUMEROS NORMALES

  let baseTotal = normalNumbers.reduce((sum, n) => sum + n, 0);

  // BONUS INDEPENDIENTE

  let bonus = 0;

  if (normalNumbers.length === 7) {
    bonus = 15;
  }

  // SOLO LA BASE RECIBE x0 x2 /2

  selectedButtons.forEach(value => {

    if (value === "x0") {
      baseTotal *= 0;
    }

    if (value === "x2") {
      baseTotal *= 2;
    }

    if (value === "/2") {
      baseTotal = Math.floor(baseTotal / 2);
    }
  });

  // TOTAL = BASE MODIFICADA + BONUS

  let total = baseTotal + bonus;

  // AL FINAL + Y -

  selectedButtons.forEach(value => {

    if (value.startsWith("+")) {
      total += Number(value.replace("+", ""));
    }

    if (value.startsWith("-")) {
      total -= Number(value.replace("-", ""));
    }
  });

  return total;
}

function savePlayerScore() {
  roundDraft[scoringPlayerId] = {
    id: crypto.randomUUID(),
    points: calculatePoints(),
    isFrozen,
    isDead: false
  };

  closeScoreModal();
  renderPlayersBoard();
}

function saveRound() {
  const missing = currentGame.players.filter(player => !roundDraft[player.id]);

  if (missing.length > 0) {
    alert("Faltan jugadores por puntuar o marcar como muerto.");
    return;
  }

  currentGame.players.forEach(player => {
    player.rounds.push(roundDraft[player.id]);
  });

  roundDraft = {};

  const winners = currentGame.players.filter(player => getTotal(player) >= 200);

  if (winners.length > 0) {
    showFinalResults();
  } else {
    renderActiveGame();
  }
}

function showFinalResults() {
  hideAllScreens();
  finalResultsScreen.classList.remove("hidden");

  const sorted = getSortedPlayers();

  finalResults.innerHTML = "";

  sorted.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "resultRow";

    row.innerHTML = `
      <span class="medal">${medal(index)}</span>
      <strong class="${rankClass(index)}">${player.name}</strong>
      <span>${getTotal(player)} pts</span>
    `;

    finalResults.appendChild(row);
  });
}

function finishGame() {
  completedGames.unshift(currentGame);
  saveCompletedGames();

  currentGame = null;
  roundDraft = {};

  goHome();
}

function showPreviousGames() {
  hideAllScreens();
  previousGamesScreen.classList.remove("hidden");

  previousGamesList.innerHTML = "";

  if (completedGames.length === 0) {
    previousGamesList.innerHTML = `<p class="subtitle">No hay partidas completadas.</p>`;
    return;
  }

  completedGames.forEach(game => {
    const sorted = getSortedPlayers(game);

    let playersHTML = "";

    sorted.forEach((player, index) => {
      playersHTML += `
        <div class="rankingRow">
          <div class="${rankClass(index)}">
            ${medal(index)} ${index + 1}. ${player.name}
          </div>
          <strong>${getTotal(player)}</strong>
        </div>
      `;
    });

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <p class="subtitle">${new Date(game.date).toLocaleString()}</p>
      ${playersHTML}
    `;

    previousGamesList.appendChild(card);
  });
}
