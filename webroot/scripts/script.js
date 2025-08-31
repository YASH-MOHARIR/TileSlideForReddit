// scripts/script.js - Complete fixed version with publish button fix
import { TileType } from "./tileTypes.js";
import { SoundHandler, sounds } from "./soundHandler.js";
import * as menuBackground from "./menuBackground.js";
import * as reddisClient from "../webViewScript.js";
import {
  fetchedUsername,
  fetchedCustomLevelLeaderboard,
  fetchedCustomLevelData,
} from "../webViewScript.js";

// Game state
let customLevelExists = false;
let isBreakingTile = false;
let isMuted = SoundHandler.isMuted;
let musicInitialized = false;
let gameStarted = false;
let infoBadge;

// Level data
let currentLevel = null;
let board = [];
let maxMoves = 0;
let movesLeft = 0;
let movesUsed = 0;

// Timer variables
let timeLeft = 30;
let timer;
let totalScore = 0;
let isTimerRunning = false;

// Builder variables
let selectedTile = TileType.BLANK;
let builderBoard = [];
let isTestingLevel = false;
let levelVerified = false;
let testBoard = [];
let testMovesLeft = 0;
let testMovesUsed = 0;
let testTimer = null;
let testTimeLeft = 30;

// DOM Elements (will be initialized after DOMContentLoaded)
let boardElement;
let levelTitle;
let levelAuthor;
let movesInfo;
let resetBtn;

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize DOM elements
  boardElement = document.getElementById("game-board");
  levelTitle = document.getElementById("level-title");
  levelAuthor = document.getElementById("level-author");
  movesInfo = document.getElementById("moves-info");
  resetBtn = document.getElementById("reset-btn");
  infoBadge = document.getElementById("info_badge");
  
  menuBackground.createAnimatedBackground();

  // Initialize sound
  isTimerRunning = false;
  SoundHandler.initializeSounds();
  setupSoundHandlers();

  // Wait for Reddit data
  document.addEventListener("initialDataLoaded", () => {
    customLevelExists = reddisClient.fetchedCustomLevelData && 
                       Object.keys(reddisClient.fetchedCustomLevelData).length > 0;
    
    setTimeout(() => {
      showInfoBadge(`Welcome ${fetchedUsername}!`);
    }, 2000);

    updateMenuForCurrentLevel();
  });

  // Setup menu buttons
  setupMenuButtons();
  
  // Setup builder
  initBuilderBoard();
  setupBuilder();
  
  // Back to menu and reset buttons
  document.getElementById("back-to-menu-btn").onclick = () => returnToMenu();
  resetBtn.addEventListener("click", resetLevel);
});

function showInfoBadge(message) {
  infoBadge.innerHTML = message;
  infoBadge.style.opacity = 1;
  setTimeout(() => {
    infoBadge.style.opacity = 0;
  }, 3000);
}

function updateMenuForCurrentLevel() {
  const playBtn = document.getElementById("play-custom-level-btn");
  const buildBtn = document.getElementById("build-btn");
  const levelInfo = document.getElementById("current-level-info");
  const levelCreator = document.getElementById("level-creator");
  const bestScore = document.getElementById("best-score");

  // Re-check if level exists from reddisClient
  customLevelExists = reddisClient.fetchedCustomLevelData && 
                     Object.keys(reddisClient.fetchedCustomLevelData).length > 0;

  if (customLevelExists && reddisClient.fetchedCustomLevelData) {
    // Show play button and level info
    playBtn.style.display = "block";
    levelInfo.style.display = "block";
    levelCreator.textContent = reddisClient.fetchedCustomLevelData.builtBy || "Anonymous";
    
    // Find best score
    if (fetchedCustomLevelLeaderboard && fetchedCustomLevelLeaderboard.length > 0) {
      const topScore = Math.max(...fetchedCustomLevelLeaderboard.map(s => parseInt(s.playerScore)));
      bestScore.textContent = topScore;
    } else {
      bestScore.textContent = "--";
    }
    
    playBtn.innerHTML = `
      <span class="shadow"></span>
      <span class="edge"></span>
      <span class="front">Play Level</span>
    `;
    
    // Hide builder button when level exists
    buildBtn.style.display = "none";
  } else {
    // No level exists - show builder button only
    levelInfo.style.display = "none";
    playBtn.style.display = "none";
    buildBtn.style.display = "block";
    buildBtn.innerHTML = `
      <span class="shadow"></span>
      <span class="edge"></span>
      <span class="front">Create Level</span>
    `;
  }
}

function setupSoundHandlers() {
  const handleInteraction = () => {
    if (!musicInitialized) {
      musicInitialized = true;
      if (!isMuted) {
        SoundHandler.playBackgroundMusic();
      }
    }
    document.removeEventListener("click", handleInteraction);
    document.removeEventListener("keydown", handleInteraction);
    document.removeEventListener("touchstart", handleInteraction);
  };

  document.addEventListener("click", handleInteraction);
  document.addEventListener("keydown", handleInteraction);
  document.addEventListener("touchstart", handleInteraction);

  document.querySelectorAll(".sound-toggle").forEach((button) => {
    button.onclick = (e) => {
      e.stopPropagation();
      SoundHandler.toggleSound();
      isMuted = !isMuted;
      if (!isMuted) {
        handleInteraction();
      }
    };
  });

  document.querySelectorAll(".pushable:not(.sound-toggle)").forEach((button) => {
    button.addEventListener("click", () => {
      SoundHandler.playButtonSound();
      handleInteraction();
    });
  });
}

function setupMenuButtons() {
  // How to Play
  const howToPlayBtn = document.getElementById("how-to-play-btn");
  const howToPlayModal = document.getElementById("how-to-play-modal");
  howToPlayBtn.onclick = () => howToPlayModal.classList.add("show");
  
  document.getElementById("close-instructions-btn").onclick = () => {
    howToPlayModal.classList.remove("show");
  };

  // Leaderboard
  const leaderboardBtn = document.getElementById("leaderboard-btn");
  const leaderboardModal = document.getElementById("leaderboard-modal");
  leaderboardBtn.onclick = () => {
    updateLeaderboard();
    leaderboardModal.classList.add("show");
  };
  
  document.getElementById("close-leaderboard-btn").onclick = () => {
    leaderboardModal.classList.remove("show");
  };

  // Play Custom Level
  document.getElementById("play-custom-level-btn").onclick = () => {
    if (!customLevelExists || !reddisClient.fetchedCustomLevelData) {
      showInfoBadge("No level available! Create one first!");
      return;
    }
    startCustomLevel();
  };

  // Builder
  document.getElementById("build-btn").onclick = () => {
    openBuilder();
  };
}

function startCustomLevel() {
  if (!reddisClient.fetchedCustomLevelData || !reddisClient.fetchedCustomLevelData.levelData) {
    showInfoBadge("No custom level available!");
    return;
  }

  menuBackground.removeMenuBackground();
  const gameLayoutContainer = document.querySelector(".game-layout");
  const menuContainer = document.querySelector(".menu-container");
  const gameboardWrapper = document.querySelector(".gameboard-wrapper");
  const hud = document.getElementById("hud");
  
  menuContainer.style.display = "none";
  gameLayoutContainer.style.display = "block";
  
  // Add animations
  setTimeout(() => {
    gameboardWrapper.style.display = "block";
    hud.style.display = "flex";
    requestAnimationFrame(() => {
      gameboardWrapper.classList.add("slide-in");
      hud.classList.add("slide-in");
    });
  }, 100);
  
  currentLevel = reddisClient.fetchedCustomLevelData;
  gameStarted = true;
  loadLevel(currentLevel);
  
  // Update HUD with level title
  const displayTitle = currentLevel.levelData.level_title || `Level by ${currentLevel.builtBy}`;
  document.getElementById("level-title").textContent = displayTitle;
  document.getElementById("level-author").textContent = currentLevel.builtBy || "Anonymous";
  
  showInfoBadge(`Playing: ${displayTitle}`);
}

function loadLevel(levelData) {
  stopTimer();
  
  const level = levelData.levelData || levelData;
  board = level.board.map(row => row.slice());
  maxMoves = level.maxMoves || 10;
  movesLeft = maxMoves;
  movesUsed = 0;
  timeLeft = levelData.timer || 30;
  totalScore = 0;
  
  renderBoard();
  updateDisplay();
  
  // Start timer after rendering
  if (gameStarted) {
    startTimer();
  }
}

function resetLevel() {
  if (currentLevel) {
    gameStarted = true;
    loadLevel(currentLevel);
    showInfoBadge("Level reset!");
  }
}

function renderBoard() {
  boardElement.innerHTML = "";

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const tile = board[row][col];
      if (tile === TileType.BLANK) continue;

      const tileDiv = document.createElement("div");
      tileDiv.classList.add("tile", tile);
      tileDiv.dataset.row = row;
      tileDiv.dataset.col = col;
      tileDiv.style.transform = `translate(${col * 80}px, ${row * 80}px)`;

      if (isArrowTile(tile)) {
        tileDiv.addEventListener("click", () => onArrowClick(row, col));
      }

      if (tile === TileType.CRACKED) {
        tileDiv.addEventListener("click", () => {
          if (isBreakingTile) return;
          isBreakingTile = true;
          sounds.crackingTile.play();
          breakCrackedTile(tileDiv);
          movesLeft--;
          movesUsed++;
          updateDisplay();
          setTimeout(() => {
            board[row][col] = TileType.BLANK;
            isBreakingTile = false;
            checkWinOrLose();
          }, 600);
        });
      }

      boardElement.appendChild(tileDiv);
    }
  }
}

function updateDisplay() {
  movesInfo.textContent = `Moves: ${movesUsed}/${maxMoves}`;
  document.getElementById("score").textContent = `Score: ${totalScore}`;
}

function onArrowClick(row, col) {
  if (isBreakingTile || !gameStarted) return;

  const arrowType = board[row][col];
  if (!isArrowTile(arrowType)) return;

  const [dRow, dCol] = getDirection(arrowType);
  const didMove = pushTiles(row, col, dRow, dCol);

  if (didMove) {
    movesLeft--;
    movesUsed++;
    updateDisplay();
  }

  checkWinOrLose();
}

function pushTiles(startRow, startCol, dRow, dCol) {
  const chain = [];
  let r = startRow;
  let c = startCol;

  while (isWithinBounds(r, c) && isPushable(board[r][c])) {
    chain.push({ row: r, col: c });
    r += dRow;
    c += dCol;
  }

  if (chain.length === 0) return false;
  let somethingMoved = false;

  for (let i = chain.length - 1; i >= 0; i--) {
    const { row, col } = chain[i];
    const tileType = board[row][col];
    const newRow = row + dRow;
    const newCol = col + dCol;

    if (isWithinBounds(newRow, newCol)) {
      const tileElement = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);

      if (board[newRow][newCol] === TileType.HOLE) {
        if (tileElement) {
          animateTileToHole(tileElement, col, row, newCol, newRow);
        }
        board[row][col] = TileType.BLANK;
        somethingMoved = true;
      } else if (board[newRow][newCol] === TileType.BLANK) {
        if (tileElement) {
          animateTileSlide(tileElement, col, row, newCol, newRow);
        }
        board[newRow][newCol] = tileType;
        board[row][col] = TileType.BLANK;
        somethingMoved = true;
      }
    }
  }

  setTimeout(() => renderBoard(), 700);
  return somethingMoved;
}

function checkWinOrLose() {
  // Check win condition - all pushable tiles are gone
  let anyPushableRemaining = false;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      if (isPushable(board[row][col])) {
        anyPushableRemaining = true;
        break;
      }
    }
    if (anyPushableRemaining) break;
  }

  if (!anyPushableRemaining) {
    handleLevelComplete();
    return;
  }

  if (movesLeft <= 0) {
    showInfoBadge("Out of moves! Try again!");
    setTimeout(() => resetLevel(), 1500);
  }
}

function handleLevelComplete() {
  stopTimer();
  gameStarted = false;
  totalScore = calculateScore();
  sounds.levelComplete.play();
  
  const modal = document.getElementById("level-complete-modal");
  document.getElementById("total-score").textContent = totalScore;
  document.getElementById("playerNameInput").value = fetchedUsername;
  
  modal.classList.add("show");
  
  document.getElementById("submit-score-btn").onclick = async () => {
    const playerName = document.getElementById("playerNameInput").value.trim();
    if (playerName) {
      await reddisClient.addScore(playerName, totalScore, 1, true);
      modal.classList.remove("show");
      returnToMenu();
      showInfoBadge("Score submitted!");
    } else {
      document.getElementById("playerNameInput").style.border = "2px solid red";
      document.getElementById("playerNameInput").placeholder = "Please enter your name!";
    }
  };
}

function calculateScore() {
  // Improved scoring system
  const baseScore = 100;
  const moveBonus = Math.max(0, (maxMoves - movesUsed) * 15); // 15 points per unused move
  const timeBonus = Math.max(0, timeLeft * 3); // 3 points per second remaining
  const efficiencyBonus = movesLeft > 0 ? Math.floor((movesLeft / maxMoves) * 50) : 0; // Up to 50 bonus points
  
  return baseScore + moveBonus + timeBonus + efficiencyBonus;
}

function startTimer() {
  if (!gameStarted || isTimerRunning) return;
  
  isTimerRunning = true;
  updateTimerDisplay();

  timer = setInterval(() => {
    if (!gameStarted) {
      stopTimer();
      return;
    }
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      stopTimer();
      handleTimeUp();
    }
  }, 1000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  isTimerRunning = false;
}

function updateTimerDisplay() {
  const timerElement = document.getElementById("timer");
  if (timerElement) {
    timerElement.textContent = `Time: ${timeLeft}s`;
    if (timeLeft <= 10) {
      timerElement.classList.add("warning");
    } else {
      timerElement.classList.remove("warning");
    }
  }
}

function handleTimeUp() {
  gameStarted = false;
  const modal = document.getElementById("time-up-modal");
  modal.classList.add("show");
  
  document.getElementById("try-again-btn").onclick = () => {
    modal.classList.remove("show");
    gameStarted = true;
    resetLevel();
  };
  
  document.getElementById("time-menu-btn").onclick = () => {
    modal.classList.remove("show");
    returnToMenu();
  };
}

function returnToMenu() {
  menuBackground.createAnimatedBackground();
  isTimerRunning = false;
  gameStarted = false;
  stopTimer();
  
  const gameboardWrapper = document.querySelector(".gameboard-wrapper");
  const hud = document.getElementById("hud");
  
  // Remove slide-in classes
  if (gameboardWrapper) {
    gameboardWrapper.classList.remove("slide-in");
  }
  if (hud) {
    hud.classList.remove("slide-in");
  }
  
  document.querySelector(".game-layout").style.display = "none";
  document.querySelector(".menu-container").style.display = "flex";
  document.getElementById("level-builder").style.display = "none";
  
  // Re-fetch current level data and update menu
  customLevelExists = reddisClient.fetchedCustomLevelData && 
                     Object.keys(reddisClient.fetchedCustomLevelData).length > 0;
  updateMenuForCurrentLevel();
}

function updateLeaderboard() {
  const leaderboardList = document.getElementById("custom-leaderboard-list");
  
  if (!fetchedCustomLevelLeaderboard || fetchedCustomLevelLeaderboard.length === 0) {
    leaderboardList.innerHTML = '<p style="text-align: center">No scores yet! Be the first!</p>';
    return;
  }

  const sorted = [...fetchedCustomLevelLeaderboard].sort((a, b) => 
    Number(b.playerScore) - Number(a.playerScore)
  );

  leaderboardList.innerHTML = sorted.map((score, index) => `
    <div class="score-entry ${index < 3 ? "top-" + (index + 1) : ""}">
      <span class="rank">#${index + 1}</span>
      <span class="player">${score.playerName}</span>
      <span class="score">${score.playerScore}</span>
    </div>
  `).join("");
}

// BUILDER FUNCTIONS
function openBuilder() {
  menuBackground.removeMenuBackground();
  document.querySelector(".menu-container").style.display = "none";
  document.getElementById("level-builder").style.display = "block";
  initBuilderBoard();
  validateLevel();
}

function initBuilderBoard() {
  builderBoard = Array.from({ length: 6 }, () => Array(6).fill(TileType.BLANK));
  levelVerified = false;
  renderBuilderBoard();
}

function setupBuilder() {
  const paletteButtons = document.querySelectorAll(".tile-btn");
  const clearBoardBtn = document.getElementById("clear-board-btn");
  const testLevelBtn = document.getElementById("test-level-btn");
  const saveLevelBtn = document.getElementById("save-level");
  const builderToMenuBtn = document.getElementById("builder-to-menu-btn");
  const stopTestBtn = document.getElementById("stop-test-btn");

  // Palette selection
  paletteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      paletteButtons.forEach((btn) => btn.classList.remove("selected"));
      button.classList.add("selected");
      selectedTile = TileType[button.dataset.tile];
    });
  });

  // Clear board
  clearBoardBtn.addEventListener("click", () => {
    initBuilderBoard();
    levelVerified = false;
    validateLevel();
    showInfoBadge("Board cleared!");
  });

  // Test level
  testLevelBtn.addEventListener("click", () => {
    startLevelTest();
  });

  // Stop testing
  stopTestBtn.addEventListener("click", () => {
    stopLevelTest();
  });

  // Save level - FIXED VERSION
  saveLevelBtn.addEventListener("click", async () => {
    if (!levelVerified) {
      showInfoBadge("Please test and complete your level first!");
      return;
    }

    const levelTitleInput = document.getElementById("level_title").value.trim();
    const levelTitle = levelTitleInput || `Puzzle by ${fetchedUsername}`;
    const moves = parseInt(document.getElementById("moves").value) || 10;
    const timer = parseInt(document.getElementById("custom_level_timer").value) || 30;

    const customLevelData = {
      levelData: {
        level_title: levelTitle,
        board: builderBoard,
        maxMoves: moves,
      },
      timer: timer,
      builtBy: fetchedUsername,
    };

    // Save to Redis
    await reddisClient.addCustomLevel(customLevelData);
    
    // Mark that level exists (don't try to modify the read-only export)
    customLevelExists = true;
    
    // Show success message
    showInfoBadge("Level published! Now everyone can play it!");
    
    // Stop any ongoing test
    if (isTestingLevel) {
      stopLevelTest();
    }
    
    // Small delay to let the user see the success message and reload data
    setTimeout(async () => {
      // The data will be updated through the addCustomLevel function
      // Check if we can access the updated data
      if (reddisClient.fetchedCustomLevelData && 
          Object.keys(reddisClient.fetchedCustomLevelData).length > 0) {
        customLevelExists = true;
      }
      
      // Hide builder and return to menu
      document.getElementById("level-builder").style.display = "none";
      returnToMenu();
    }, 1500);
  });

  // Back to menu
  builderToMenuBtn.addEventListener("click", () => {
    if (isTestingLevel) {
      stopLevelTest();
    }
    returnToMenu();
  });
}

function renderBuilderBoard() {
  const gridContainer = document.getElementById("grid-container");
  gridContainer.innerHTML = "";

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const cell = document.createElement("div");
      cell.classList.add("grid-cell");
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.className = "grid-cell";
      cell.classList.add(builderBoard[row][col].toLowerCase());

      cell.addEventListener("click", () => {
        if (!isTestingLevel) {
          builderBoard[row][col] = selectedTile;
          
          // Reset verification when user makes changes
          if (levelVerified) {
            levelVerified = false;
            showInfoBadge("Level changed - please test again before publishing!");
          }
          
          renderBuilderBoard();
          validateLevel();
        }
      });

      gridContainer.appendChild(cell);
    }
  }
}

function validateLevel() {
  const checkBlocks = document.getElementById("check-blocks");
  const checkHoles = document.getElementById("check-holes");
  const checkArrows = document.getElementById("check-arrows");
  const checkSolvable = document.getElementById("check-solvable");
  const statusMessage = document.getElementById("status-message");
  const saveBtn = document.getElementById("save-level");

  let blocks = 0, holes = 0, arrows = 0, cracked = 0;
  
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const tile = builderBoard[row][col];
      if (tile === TileType.BLOCK) blocks++;
      if (tile === TileType.CRACKED) cracked++;
      if (tile === TileType.HOLE) holes++;
      if (isArrowTile(tile)) arrows++;
    }
  }

  const totalPushable = blocks + cracked;

  // Updated validation rules
  if (totalPushable > 0) {
    // If user added blocks/cracked, they must match holes
    checkBlocks.innerHTML = totalPushable === holes ? 
      "✅ Pushable tiles match holes" : 
      `❌ ${totalPushable} pushable tiles, ${holes} holes - must match!`;
  } else {
    // No blocks required - arrows can push each other
    checkBlocks.innerHTML = "✅ No blocks needed (arrows push arrows)";
  }
  
  checkHoles.innerHTML = holes > 0 ? 
    `✅ Has ${holes} hole${holes > 1 ? 's' : ''}` : 
    "❌ Add at least one hole";
    
  checkArrows.innerHTML = arrows > 0 ? 
    `✅ Has ${arrows} arrow tile${arrows > 1 ? 's' : ''}` : 
    "❌ Add at least one arrow";
    
  checkSolvable.innerHTML = levelVerified ? 
    "✅ Level tested and verified!" : 
    "❌ Test and complete the level";

  // Update status message
  let canTest = false;
  
  if (arrows === 0) {
    statusMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Add at least one arrow tile';
    statusMessage.className = "status-message status-error";
  } else if (holes === 0) {
    statusMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Add at least one hole';
    statusMessage.className = "status-message status-error";
  } else if (totalPushable > 0 && totalPushable !== holes) {
    statusMessage.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Pushable tiles must equal holes';
    statusMessage.className = "status-message status-warning";
  } else if (!levelVerified) {
    statusMessage.innerHTML = '<i class="fas fa-info-circle"></i> Test your level to verify it\'s solvable';
    statusMessage.className = "status-message status-info";
    canTest = true;
  } else {
    statusMessage.innerHTML = '<i class="fas fa-check-circle"></i> Level verified! You can still make changes or publish';
    statusMessage.className = "status-message status-success";
    canTest = true;
  }

  // Enable/disable test button based on validation
  const testBtn = document.getElementById("test-level-btn");
  if (testBtn) {
    testBtn.disabled = !canTest;
  }
  
  // Only enable save button if level is verified
  saveBtn.disabled = !levelVerified;
}

function startLevelTest() {
  // Validate basic requirements first
  let blocks = 0, holes = 0, arrows = 0, cracked = 0;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const tile = builderBoard[row][col];
      if (tile === TileType.BLOCK) blocks++;
      if (tile === TileType.CRACKED) cracked++;
      if (tile === TileType.HOLE) holes++;
      if (isArrowTile(tile)) arrows++;
    }
  }

  const totalPushable = blocks + cracked;

  // Updated validation for testing
  if (arrows === 0 || holes === 0) {
    showInfoBadge("Add arrows and holes before testing!");
    return;
  }
  
  if (totalPushable > 0 && totalPushable !== holes) {
    showInfoBadge("Number of pushable tiles must equal holes!");
    return;
  }

  isTestingLevel = true;
  testBoard = builderBoard.map(row => row.slice());
  testMovesLeft = parseInt(document.getElementById("moves").value) || 10;
  testMovesUsed = 0;
  testTimeLeft = parseInt(document.getElementById("custom_level_timer").value) || 30;

  // Hide builder controls, show test controls
  document.getElementById("test-controls").style.display = "block";
  document.querySelector(".builder-options").style.opacity = "0.5";
  document.querySelector(".builder-options").style.pointerEvents = "none";

  // Render test board
  renderTestBoard();
  startTestTimer();
  
  showInfoBadge("Testing mode! Complete the level to verify it.");
}

function stopLevelTest() {
  isTestingLevel = false;
  clearInterval(testTimer);
  
  document.getElementById("test-controls").style.display = "none";
  document.querySelector(".builder-options").style.opacity = "1";
  document.querySelector(".builder-options").style.pointerEvents = "auto";
  
  renderBuilderBoard();
  
  // Don't reset levelVerified - user can still edit after verification
  if (levelVerified) {
    showInfoBadge("Level verified! You can make changes or publish.");
  } else {
    showInfoBadge("Test stopped. Keep building!");
  }
}

function renderTestBoard() {
  const gridContainer = document.getElementById("grid-container");
  gridContainer.innerHTML = "";

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const tile = testBoard[row][col];
      const cell = document.createElement("div");
      cell.classList.add("grid-cell", tile.toLowerCase());
      cell.dataset.row = row;
      cell.dataset.col = col;

      if (isArrowTile(tile)) {
        cell.addEventListener("click", () => onTestArrowClick(row, col));
        cell.style.cursor = "pointer";
      }

      if (tile === TileType.CRACKED) {
        cell.addEventListener("click", () => {
          if (!isArrowTile(testBoard[row][col])) {
            testBoard[row][col] = TileType.BLANK;
            testMovesUsed++;
            testMovesLeft--;
            updateTestDisplay();
            renderTestBoard();
            checkTestWin();
          }
        });
        cell.style.cursor = "pointer";
      }

      gridContainer.appendChild(cell);
    }
  }
}

function onTestArrowClick(row, col) {
  const arrowType = testBoard[row][col];
  if (!isArrowTile(arrowType)) return;

  const [dRow, dCol] = getDirection(arrowType);
  const didMove = pushTestTiles(row, col, dRow, dCol);

  if (didMove) {
    testMovesUsed++;
    testMovesLeft--;
    updateTestDisplay();
    setTimeout(() => {
      renderTestBoard();
      checkTestWin();
    }, 300);
  }
}

function pushTestTiles(startRow, startCol, dRow, dCol) {
  const chain = [];
  let r = startRow, c = startCol;

  while (isWithinBounds(r, c) && isPushable(testBoard[r][c])) {
    chain.push({ row: r, col: c });
    r += dRow;
    c += dCol;
  }

  if (chain.length === 0) return false;
  let moved = false;

  for (let i = chain.length - 1; i >= 0; i--) {
    const { row, col } = chain[i];
    const newRow = row + dRow;
    const newCol = col + dCol;

    if (isWithinBounds(newRow, newCol)) {
      if (testBoard[newRow][newCol] === TileType.HOLE) {
        testBoard[row][col] = TileType.BLANK;
        moved = true;
      } else if (testBoard[newRow][newCol] === TileType.BLANK) {
        testBoard[newRow][newCol] = testBoard[row][col];
        testBoard[row][col] = TileType.BLANK;
        moved = true;
      }
    }
  }

  return moved;
}

function checkTestWin() {
  // Check if all pushable tiles are gone
  let anyPushable = false;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const tile = testBoard[row][col];
      // Check for blocks, cracked, AND arrows (since arrows can push each other)
      if (tile === TileType.BLOCK || tile === TileType.CRACKED || isArrowTile(tile)) {
        anyPushable = true;
        break;
      }
    }
    if (anyPushable) break;
  }

  if (!anyPushable) {
    levelVerified = true;
    stopLevelTest();
    validateLevel();
    showInfoBadge("Level verified! You can still edit or publish now!");
    sounds.levelComplete.play();
    
    // Add success animation to validation status
    const validationStatus = document.getElementById("validation-status");
    validationStatus.classList.add("verified");
    setTimeout(() => {
      validationStatus.classList.remove("verified");
    }, 1000);
  } else if (testMovesLeft <= 0) {
    showInfoBadge("Out of moves! Adjust move limit or redesign.");
    stopLevelTest();
  }
}

function startTestTimer() {
  updateTestDisplay();
  testTimer = setInterval(() => {
    testTimeLeft--;
    updateTestDisplay();
    if (testTimeLeft <= 0) {
      showInfoBadge("Time's up! Adjust time limit or redesign.");
      stopLevelTest();
    }
  }, 1000);
}

function updateTestDisplay() {
  document.getElementById("test-moves").textContent = `Moves: ${testMovesUsed}/${testMovesUsed + testMovesLeft}`;
  document.getElementById("test-timer").textContent = `Time: ${testTimeLeft}s`;
}

// Helper functions
function isWithinBounds(r, c) {
  return r >= 0 && r < 6 && c >= 0 && c < 6;
}

function isArrowTile(tile) {
  return tile === TileType.ARROW_UP || tile === TileType.ARROW_DOWN ||
         tile === TileType.ARROW_LEFT || tile === TileType.ARROW_RIGHT;
}

function isPushable(tile) {
  return isArrowTile(tile) || tile === TileType.BLOCK || tile === TileType.CRACKED;
}

function getDirection(arrowType) {
  switch (arrowType) {
    case TileType.ARROW_UP: return [-1, 0];
    case TileType.ARROW_DOWN: return [1, 0];
    case TileType.ARROW_LEFT: return [0, -1];
    case TileType.ARROW_RIGHT: return [0, 1];
    default: return [0, 0];
  }
}

function breakCrackedTile(tileElement) {
  tileElement.classList.add("breaking");
  const particles = [];
  
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.width = `${5 + Math.random() * 10}px`;
    particle.style.height = particle.style.width;
    particle.style.backgroundImage = 'url("resources/images/cracked.png")';
    particle.style.backgroundSize = "cover";
    tileElement.appendChild(particle);
    particles.push(particle);
  }

  particles.forEach((particle) => {
    particle.animate([
      { transform: "translate(0, 0) rotate(0)", opacity: 1 },
      { transform: `translate(${-50 + Math.random() * 100}px, ${-50 + Math.random() * 100}px) rotate(${-180 + Math.random() * 360}deg)`, opacity: 0 }
    ], {
      duration: 300 + Math.random() * 300,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards"
    });
  });

  setTimeout(() => tileElement.remove(), 300);
}

function animateTileToHole(element, oldCol, oldRow, newCol, newRow) {
  sounds.tileVanish.play();
  const slideAnimation = element.animate([
    { transform: `translate(${oldCol * 80}px, ${oldRow * 80}px)` },
    { transform: `translate(${newCol * 80}px, ${newRow * 80}px)` }
  ], {
    duration: 300,
    easing: "ease-out",
    fill: "forwards"
  });

  slideAnimation.onfinish = () => {
    element.animate([
      { transform: `translate(${newCol * 80}px, ${newRow * 80}px) scale(1)`, filter: "brightness(1)", opacity: 1 },
      { transform: `translate(${newCol * 80}px, ${newRow * 80}px) scale(1.2)`, filter: "brightness(2)", opacity: 0.8 },
      { transform: `translate(${newCol * 80}px, ${newRow * 80}px) scale(0.8)`, filter: "brightness(3)", opacity: 0 }
    ], {
      duration: 400,
      easing: "ease-in",
      fill: "forwards"
    }).onfinish = () => element.remove();
  };
}

function animateTileSlide(element, oldCol, oldRow, newCol, newRow) {
  sounds.tileSlide.play();
  element.animate([
    { transform: `translate(${oldCol * 80}px, ${oldRow * 80}px)` },
    { transform: `translate(${newCol * 80}px, ${newRow * 80}px)` }
  ], {
    duration: 200,
    easing: "ease-out",
    fill: "forwards"
  });
  element.dataset.row = newRow;
  element.dataset.col = newCol;
}