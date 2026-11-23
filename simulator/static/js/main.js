/**
 * Kuka Robot Connect-3 Simulation - Main Application Logic
 */

// API Configuration
const API_BASE = window.location.origin;

// Game state
let gameState = {
    board: [],
    currentPlayer: 1,
    gameMode: 'hvh',
    gravityMode: true,
    gameOver: false,
    winner: 0,
    isRobotTurn: false,
    isPlaying: false,
    playbackSpeed: 1
};

// Robot renderer instance
let robotRenderer = null;

// DOM Elements
const elements = {
    gameBoard: document.getElementById('game-board'),
    currentPlayer: document.getElementById('current-player'),
    usedRed: document.getElementById('used-red'),
    usedBlue: document.getElementById('used-blue'),
    gameStatus: document.getElementById('game-status'),
    motionLog: document.getElementById('motion-log'),
    loadingOverlay: document.getElementById('loading-overlay'),
    winnerModal: document.getElementById('winner-modal'),
    winnerText: document.getElementById('winner-text'),
    winnerIcon: document.getElementById('winner-icon'),
    motionProgress: document.getElementById('motion-progress'),
    speedValue: document.getElementById('speed-value')
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    initializeControls();
    initializeBoard();
});

/**
 * Initialize game state
 */
async function initializeGame() {
    try {
        // Initialize 3D renderer
        robotRenderer = new RobotRenderer('robot-canvas');
        await robotRenderer.init();

        // Hide loading overlay
        elements.loadingOverlay.classList.add('hidden');

        // Fetch initial state
        await fetchGameState();

        log('System bereit. Wähle einen Spielmodus und starte!');
    } catch (error) {
        console.error('Initialization error:', error);
        log('Fehler beim Initialisieren: ' + error.message);
    }
}

/**
 * Initialize control event listeners
 */
function initializeControls() {
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.gameMode = btn.dataset.mode;
            configureGame();
        });
    });

    // Gravity toggle
    document.getElementById('gravity-toggle').addEventListener('change', (e) => {
        gameState.gravityMode = e.target.checked;
        configureGame();
    });

    // Starting player
    document.getElementById('start-red').addEventListener('click', () => {
        document.getElementById('start-red').classList.add('active');
        document.getElementById('start-blue').classList.remove('active');
        configureGame({ starting_player: 'red' });
    });

    document.getElementById('start-blue').addEventListener('click', () => {
        document.getElementById('start-blue').classList.add('active');
        document.getElementById('start-red').classList.remove('active');
        configureGame({ starting_player: 'blue' });
    });

    // New game button
    document.getElementById('btn-new-game').addEventListener('click', resetGame);

    // Demo button
    document.getElementById('btn-demo').addEventListener('click', startDemo);

    // Column buttons
    document.querySelectorAll('.col-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const col = parseInt(btn.dataset.col);
            makeMove(col);
        });
    });

    // Playback controls
    document.getElementById('btn-play').addEventListener('click', playMotion);
    document.getElementById('btn-pause').addEventListener('click', pauseMotion);
    document.getElementById('btn-stop').addEventListener('click', stopMotion);

    // Speed slider
    document.getElementById('speed-slider').addEventListener('input', (e) => {
        gameState.playbackSpeed = parseFloat(e.target.value);
        elements.speedValue.textContent = gameState.playbackSpeed + 'x';
        if (robotRenderer) {
            robotRenderer.setPlaybackSpeed(gameState.playbackSpeed);
        }
    });

    // View controls
    document.getElementById('btn-reset-view').addEventListener('click', () => {
        if (robotRenderer) robotRenderer.resetCamera();
    });

    document.getElementById('btn-toggle-grid').addEventListener('click', (e) => {
        e.target.classList.toggle('active');
        if (robotRenderer) robotRenderer.toggleGrid();
    });

    // Play again button
    document.getElementById('btn-play-again').addEventListener('click', () => {
        elements.winnerModal.classList.add('hidden');
        resetGame();
    });
}

/**
 * Initialize the game board display
 */
function initializeBoard() {
    elements.gameBoard.innerHTML = '';
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            elements.gameBoard.appendChild(cell);
        }
    }
}

/**
 * Fetch current game state from server
 */
async function fetchGameState() {
    try {
        const response = await fetch(`${API_BASE}/api/game/state`);
        const data = await response.json();
        updateGameState(data);
        return data;
    } catch (error) {
        console.error('Error fetching game state:', error);
        throw error;
    }
}

/**
 * Configure game settings
 */
async function configureGame(extraConfig = {}) {
    try {
        const config = {
            mode: gameState.gameMode,
            gravity: gameState.gravityMode,
            ...extraConfig
        };

        const response = await fetch(`${API_BASE}/api/game/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();
        if (data.success) {
            updateGameState(data.state);
        }
    } catch (error) {
        console.error('Config error:', error);
    }
}

/**
 * Reset the game
 */
async function resetGame() {
    try {
        const response = await fetch(`${API_BASE}/api/game/reset`, {
            method: 'POST'
        });

        const data = await response.json();
        if (data.success) {
            updateGameState(data.state);
            if (robotRenderer) {
                robotRenderer.reset();
            }
            log('Neues Spiel gestartet!');

            // Reconfigure with current settings
            await configureGame();

            // If RvR mode, start demo
            if (gameState.gameMode === 'rvr') {
                setTimeout(() => processRobotTurn(), 500);
            }
        }
    } catch (error) {
        console.error('Reset error:', error);
    }
}

/**
 * Make a move
 */
async function makeMove(col) {
    if (gameState.gameOver || gameState.isRobotTurn || gameState.isPlaying) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/game/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ col })
        });

        const data = await response.json();

        if (data.success) {
            log(`Zug: Spalte ${col + 1}, Zeile ${data.row + 1}`);
            updateGameState(data.state);

            // Play motion animation
            if (data.motion && data.motion.length > 0) {
                await playMotionSequence(data.motion);
            }

            // Check for winner
            if (data.state.game_over) {
                showWinner(data.state.winner);
            } else if (data.state.is_robot_turn) {
                // Robot's turn
                setTimeout(() => processRobotTurn(), 500);
            }
        } else {
            log('Ungültiger Zug: ' + (data.message || 'Spalte voll'));
        }
    } catch (error) {
        console.error('Move error:', error);
        log('Fehler beim Zug: ' + error.message);
    }
}

/**
 * Process robot's turn
 */
async function processRobotTurn() {
    if (gameState.gameOver) return;

    log('Roboter berechnet Zug...');

    try {
        const response = await fetch(`${API_BASE}/api/game/ai-move`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            log(`Roboter: Spalte ${data.col + 1}, Zeile ${data.row + 1}`);
            updateGameState(data.state);

            // Play motion animation
            if (data.motion && data.motion.length > 0) {
                await playMotionSequence(data.motion);
            }

            // Check for winner
            if (data.state.game_over) {
                showWinner(data.state.winner);
            } else if (data.state.is_robot_turn && gameState.gameMode === 'rvr') {
                // Continue RvR demo
                setTimeout(() => processRobotTurn(), 300);
            }
        }
    } catch (error) {
        console.error('AI move error:', error);
        log('KI Fehler: ' + error.message);
    }
}

/**
 * Start demo mode
 */
async function startDemo() {
    // Set to RvR mode
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-mode="rvr"]').classList.add('active');
    gameState.gameMode = 'rvr';

    await resetGame();
}

/**
 * Update game state and UI
 */
function updateGameState(state) {
    gameState.board = state.board;
    gameState.currentPlayer = state.current_player;
    gameState.gameOver = state.game_over;
    gameState.winner = state.winner;
    gameState.isRobotTurn = state.is_robot_turn;

    // Update board display
    updateBoardDisplay();

    // Update status
    const playerName = state.current_player === 1 ? '🔴 Rot' : '🔵 Blau';
    const playerClass = state.current_player === 1 ? 'player-red' : 'player-blue';
    elements.currentPlayer.textContent = playerName;
    elements.currentPlayer.className = 'status-value ' + playerClass;

    elements.usedRed.textContent = `${state.used_red}/12`;
    elements.usedBlue.textContent = `${state.used_blue}/12`;

    if (state.game_over) {
        if (state.winner === 1) {
            elements.gameStatus.textContent = '🏆 Rot gewinnt!';
        } else if (state.winner === 2) {
            elements.gameStatus.textContent = '🏆 Blau gewinnt!';
        } else {
            elements.gameStatus.textContent = '🤝 Unentschieden!';
        }
    } else if (state.is_robot_turn) {
        elements.gameStatus.textContent = '🤖 Roboter am Zug';
    } else {
        elements.gameStatus.textContent = '⏳ Warte auf Spieler';
    }

    // Enable/disable column buttons
    document.querySelectorAll('.col-btn').forEach(btn => {
        const col = parseInt(btn.dataset.col);
        const canPlay = !state.game_over && !state.is_robot_turn && isColumnAvailable(col);
        btn.disabled = !canPlay;
    });
}

/**
 * Update the visual board display
 */
function updateBoardDisplay() {
    const cells = elements.gameBoard.querySelectorAll('.board-cell');
    cells.forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const value = gameState.board[row]?.[col] || 0;

        cell.className = 'board-cell';
        if (value === 1) {
            cell.classList.add('red');
        } else if (value === 2) {
            cell.classList.add('blue');
        }
    });

    // Update 3D board
    if (robotRenderer) {
        robotRenderer.updateBoard(gameState.board);
    }
}

/**
 * Check if a column is available
 */
function isColumnAvailable(col) {
    return gameState.board[0]?.[col] === 0;
}

/**
 * Play a motion sequence
 */
async function playMotionSequence(motions) {
    gameState.isPlaying = true;
    document.getElementById('btn-play').disabled = true;
    document.getElementById('btn-pause').disabled = false;

    if (robotRenderer) {
        await robotRenderer.playMotionSequence(motions, (progress, description) => {
            elements.motionProgress.style.width = (progress * 100) + '%';
            if (description) {
                log(description, true);
            }
        });
    }

    gameState.isPlaying = false;
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-pause').disabled = true;
    elements.motionProgress.style.width = '100%';
}

/**
 * Playback controls
 */
function playMotion() {
    if (robotRenderer) robotRenderer.resume();
}

function pauseMotion() {
    if (robotRenderer) robotRenderer.pause();
}

function stopMotion() {
    if (robotRenderer) robotRenderer.stop();
    gameState.isPlaying = false;
}

/**
 * Show winner modal
 */
function showWinner(winner) {
    if (winner === 1) {
        elements.winnerIcon.textContent = '🔴';
        elements.winnerText.textContent = 'Rot gewinnt!';
    } else if (winner === 2) {
        elements.winnerIcon.textContent = '🔵';
        elements.winnerText.textContent = 'Blau gewinnt!';
    } else {
        elements.winnerIcon.textContent = '🤝';
        elements.winnerText.textContent = 'Unentschieden!';
    }

    setTimeout(() => {
        elements.winnerModal.classList.remove('hidden');
    }, 500);
}

/**
 * Add log entry
 */
function log(message, isActive = false) {
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (isActive ? ' active' : '');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    elements.motionLog.insertBefore(entry, elements.motionLog.firstChild);

    // Limit log entries
    while (elements.motionLog.children.length > 50) {
        elements.motionLog.removeChild(elements.motionLog.lastChild);
    }
}
