/* ============================================
   KUKA Robot Simulation - Main Application
   Three.js setup and game controller
   ============================================ */

// Global state
let scene, camera, renderer, controls;
let isGameActive = false;
let isRobotBusy = false;

// DOM Elements
const elements = {
    statusText: null,
    modeSelection: null,
    gameControls: null,
    winnerPanel: null,
    currentPlayer: null,
    winnerText: null,
    columnButtons: null
};

/**
 * Initialize the Three.js scene
 */
function initScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    // Add fog for depth
    scene.fog = new THREE.Fog(0x0a0a1a, 15, 30);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 8, 10);
    camera.lookAt(0, 0, 3);

    // Create renderer
    const canvas = document.getElementById('scene');
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 3);
    controls.minDistance = 5;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.update();

    // Lighting
    setupLighting();

    // Floor
    createFloor();

    // Handle resize
    window.addEventListener('resize', onWindowResize);
}

/**
 * Set up scene lighting
 */
function setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(ambient);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    scene.add(mainLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Accent lights for drama
    const redAccent = new THREE.PointLight(0xff4444, 0.3, 10);
    redAccent.position.set(-3, 2, 2);
    scene.add(redAccent);

    const blueAccent = new THREE.PointLight(0x4444ff, 0.3, 10);
    blueAccent.position.set(3, 2, 2);
    scene.add(blueAccent);
}

/**
 * Create floor plane
 */
function createFloor() {
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshPhongMaterial({
        color: 0x1a1a2e,
        shininess: 10
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid helper
    const grid = new THREE.GridHelper(20, 40, 0x333355, 0x222244);
    grid.position.y = 0.01;
    scene.add(grid);
}

/**
 * Handle window resize
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Cache DOM elements
 */
function cacheDOMElements() {
    elements.statusText = document.getElementById('status-text');
    elements.modeSelection = document.getElementById('mode-selection');
    elements.gameControls = document.getElementById('game-controls');
    elements.winnerPanel = document.getElementById('winner-panel');
    elements.currentPlayer = document.getElementById('current-player');
    elements.winnerText = document.getElementById('winner-text');
    elements.columnButtons = document.querySelectorAll('.col-btn');
}

/**
 * Set up UI event listeners
 */
function setupUIEvents() {
    // Mode selection buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    let selectedMode = GameLogic.MODE_HVH;

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            if (btn.id === 'btn-hvh') selectedMode = GameLogic.MODE_HVH;
            else if (btn.id === 'btn-hvr') selectedMode = GameLogic.MODE_HVR;
            else if (btn.id === 'btn-rvr') selectedMode = GameLogic.MODE_RVR;
        });
    });

    // Select first mode by default
    document.getElementById('btn-hvh').classList.add('selected');

    // Start button
    document.getElementById('btn-start').addEventListener('click', () => {
        const gravityMode = document.getElementById('gravity-mode').checked;
        startGame(selectedMode, gravityMode);
    });

    // Column buttons
    elements.columnButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const col = parseInt(btn.dataset.col) - 1;  // Convert to 0-indexed
            handleColumnClick(col);
        });
    });

    // New game button
    document.getElementById('btn-new-game').addEventListener('click', () => {
        resetToModeSelection();
    });

    // Play again button
    document.getElementById('btn-play-again').addEventListener('click', () => {
        resetToModeSelection();
    });
}

/**
 * Start a new game
 */
function startGame(mode, gravity) {
    // Initialize game logic
    GameLogic.init();
    GameLogic.setMode(mode, gravity);

    // Clear board
    GameBoard.clearBoard();

    // Hide mode selection, show game controls
    elements.modeSelection.classList.add('hidden');
    elements.winnerPanel.classList.add('hidden');
    elements.gameControls.classList.remove('hidden');

    // Update status
    elements.statusText.textContent = getModeText(mode);
    updatePlayerDisplay();

    isGameActive = true;
    isRobotBusy = false;

    // Enable/disable buttons based on mode
    updateButtonStates();

    // If robot's turn, start AI
    if (GameLogic.isAITurn()) {
        setTimeout(executeAIMove, 500);
    }
}

/**
 * Get text description for game mode
 */
function getModeText(mode) {
    switch (mode) {
        case GameLogic.MODE_HVH: return 'Mensch vs. Mensch';
        case GameLogic.MODE_HVR: return 'Mensch vs. Roboter';
        case GameLogic.MODE_RVR: return 'Roboter Demo';
        default: return '';
    }
}

/**
 * Update the current player display
 */
function updatePlayerDisplay() {
    const isRed = GameLogic.currentPlayer === GameLogic.PLAYER_RED;
    const name = isRed ? 'Rot' : 'Blau';

    elements.currentPlayer.textContent = `${name} ist am Zug`;
    elements.currentPlayer.className = isRed ? 'red-turn' : 'blue-turn';
}

/**
 * Update button states based on game state
 */
function updateButtonStates() {
    const disabled = isRobotBusy || GameLogic.isAITurn() || !isGameActive;

    elements.columnButtons.forEach((btn, i) => {
        btn.disabled = disabled || GameLogic.getGravityRow(i) < 0;
    });
}

/**
 * Handle column button click
 */
function handleColumnClick(col) {
    if (!isGameActive || isRobotBusy || GameLogic.isAITurn()) return;

    executeMove(col);
}

/**
 * Execute a move (human or AI)
 */
function executeMove(col) {
    const result = GameLogic.makeMove(col);
    if (!result.success) return;

    isRobotBusy = true;
    updateButtonStates();

    // Get piece from storage
    const storageData = GameBoard.getNextStoragePiece(result.player);
    if (!storageData) {
        console.error('No pieces available!');
        return;
    }

    const { piece, index } = storageData;
    const pickPos = GameBoard.getStoragePosition(result.player, index);
    const placePos = GameBoard.getCellPosition(result.row, result.col);

    // Animate robot
    KukaRobot.pickAndPlace(pickPos, placePos, piece, () => {
        // Mark storage piece as used (keep it at board position)
        GameBoard.useStoragePiece(result.player, index);
        piece.visible = true;
        piece.position.copy(placePos);

        // Check for winner
        if (GameLogic.checkWinner(result.player)) {
            endGame(result.player);
            return;
        }

        // Check for draw
        if (GameLogic.isDraw()) {
            endGame(0);  // 0 = draw
            return;
        }

        // Switch player
        GameLogic.switchPlayer();
        updatePlayerDisplay();

        isRobotBusy = false;
        updateButtonStates();

        // If next turn is AI, execute
        if (GameLogic.isAITurn()) {
            setTimeout(executeAIMove, 300);
        }
    });
}

/**
 * Execute AI move
 */
function executeAIMove() {
    if (!isGameActive) return;

    const col = GameLogic.getAIMove(GameLogic.currentPlayer);
    if (col >= 0) {
        executeMove(col);
    }
}

/**
 * End the game
 */
function endGame(winner) {
    isGameActive = false;
    GameLogic.endGame();

    elements.gameControls.classList.add('hidden');
    elements.winnerPanel.classList.remove('hidden');

    if (winner === 0) {
        elements.winnerText.textContent = '🤝 Unentschieden!';
        elements.winnerText.className = 'draw';
    } else if (winner === GameLogic.PLAYER_RED) {
        elements.winnerText.textContent = '🎉 Rot gewinnt!';
        elements.winnerText.className = 'red-wins';
    } else {
        elements.winnerText.textContent = '🎉 Blau gewinnt!';
        elements.winnerText.className = 'blue-wins';
    }
}

/**
 * Reset to mode selection
 */
function resetToModeSelection() {
    isGameActive = false;
    isRobotBusy = false;

    elements.winnerPanel.classList.add('hidden');
    elements.gameControls.classList.add('hidden');
    elements.modeSelection.classList.remove('hidden');

    elements.statusText.textContent = 'Wähle einen Spielmodus';

    // Clear board and reset pieces
    GameBoard.clearBoard();

    // Robot goes home
    KukaRobot.goHome();
}

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Update robot animations
    KukaRobot.update();

    // Render
    renderer.render(scene, camera);
}

/**
 * Main initialization
 */
function init() {
    console.log('🤖 KUKA Robot Simulation starting...');

    // Initialize Three.js scene
    initScene();

    // Create robot
    KukaRobot.create(scene);

    // Create game board
    GameBoard.create(scene);

    // Cache DOM elements
    cacheDOMElements();

    // Set up UI events
    setupUIEvents();

    // Start animation loop
    animate();

    console.log('✅ Simulation ready!');
}

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
