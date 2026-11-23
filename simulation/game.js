/* ============================================
   Connect-3 Game Logic
   Ported from KRL codebase
   ============================================ */

const GameLogic = {
    // Constants from GAME_DATA.dat
    ROWS: 4,
    COLS: 6,
    PLAYER_NONE: 0,
    PLAYER_RED: 1,
    PLAYER_BLUE: 2,
    
    MODE_HVH: 0,  // Human vs Human
    MODE_HVR: 1,  // Human vs Robot
    MODE_RVR: 2,  // Robot vs Robot (Demo)
    
    // State
    board: null,
    gameMode: 0,
    gravityMode: true,
    currentPlayer: 1,  // PLAYER_RED starts
    usedRed: 0,
    usedBlue: 0,
    gameActive: false,
    
    // Callbacks
    onMoveComplete: null,
    onGameEnd: null,
    
    /**
     * Initialize/reset the game board
     */
    init() {
        this.board = [];
        for (let r = 0; r < this.ROWS; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.COLS; c++) {
                this.board[r][c] = this.PLAYER_NONE;
            }
        }
        this.usedRed = 0;
        this.usedBlue = 0;
        this.currentPlayer = this.PLAYER_RED;
        this.gameActive = true;
    },
    
    /**
     * Set game mode and options
     */
    setMode(mode, gravity) {
        this.gameMode = mode;
        this.gravityMode = gravity;
    },
    
    /**
     * Get the row where a piece would land with gravity
     * Returns -1 if column is full
     */
    getGravityRow(col) {
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (this.board[r][col] === this.PLAYER_NONE) {
                return r;
            }
        }
        return -1;  // Column full
    },
    
    /**
     * Check if a cell is valid for placement
     */
    isValidMove(row, col) {
        if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) {
            return false;
        }
        return this.board[row][col] === this.PLAYER_NONE;
    },
    
    /**
     * Make a move at the specified position
     * Returns { success, row, col } - row may be different with gravity
     */
    makeMove(col, row = null) {
        if (!this.gameActive) {
            return { success: false };
        }
        
        let targetRow = row;
        
        if (this.gravityMode) {
            targetRow = this.getGravityRow(col);
            if (targetRow < 0) {
                return { success: false };  // Column full
            }
        } else {
            if (targetRow === null || !this.isValidMove(targetRow, col)) {
                return { success: false };
            }
        }
        
        // Place the piece
        this.board[targetRow][col] = this.currentPlayer;
        
        if (this.currentPlayer === this.PLAYER_RED) {
            this.usedRed++;
        } else {
            this.usedBlue++;
        }
        
        return { success: true, row: targetRow, col: col, player: this.currentPlayer };
    },
    
    /**
     * Switch to next player
     */
    switchPlayer() {
        this.currentPlayer = (this.currentPlayer === this.PLAYER_RED) 
            ? this.PLAYER_BLUE 
            : this.PLAYER_RED;
    },
    
    /**
     * Check for winner (3-in-a-row)
     * Based on CHECK_WINNER from GAME_CTRL.src
     */
    checkWinner(player) {
        // Horizontal check (3 in a row)
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c <= this.COLS - 3; c++) {
                if (this.board[r][c] === player &&
                    this.board[r][c+1] === player &&
                    this.board[r][c+2] === player) {
                    return true;
                }
            }
        }
        
        // Vertical check (3 in a column)
        for (let r = 0; r <= this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (this.board[r][c] === player &&
                    this.board[r+1][c] === player &&
                    this.board[r+2][c] === player) {
                    return true;
                }
            }
        }
        
        // Diagonal check (top-left to bottom-right)
        for (let r = 0; r <= this.ROWS - 3; r++) {
            for (let c = 0; c <= this.COLS - 3; c++) {
                if (this.board[r][c] === player &&
                    this.board[r+1][c+1] === player &&
                    this.board[r+2][c+2] === player) {
                    return true;
                }
            }
        }
        
        // Diagonal check (bottom-left to top-right)
        for (let r = 2; r < this.ROWS; r++) {
            for (let c = 0; c <= this.COLS - 3; c++) {
                if (this.board[r][c] === player &&
                    this.board[r-1][c+1] === player &&
                    this.board[r-2][c+2] === player) {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    /**
     * Check for draw (board full)
     */
    isDraw() {
        return (this.usedRed + this.usedBlue) >= (this.ROWS * this.COLS);
    },
    
    /**
     * AI Move calculation
     * Based on GET_AI_MOVE from GAME_CTRL.src
     */
    getAIMove(myColor) {
        const oppColor = (myColor === this.PLAYER_RED) 
            ? this.PLAYER_BLUE 
            : this.PLAYER_RED;
        
        // 1. Try to win
        for (let c = 0; c < this.COLS; c++) {
            const testRow = this.getGravityRow(c);
            if (testRow >= 0) {
                // Simulate move
                this.board[testRow][c] = myColor;
                const wins = this.checkWinner(myColor);
                this.board[testRow][c] = this.PLAYER_NONE;
                
                if (wins) {
                    return c;
                }
            }
        }
        
        // 2. Block opponent's win
        for (let c = 0; c < this.COLS; c++) {
            const testRow = this.getGravityRow(c);
            if (testRow >= 0) {
                // Simulate opponent move
                this.board[testRow][c] = oppColor;
                const blocks = this.checkWinner(oppColor);
                this.board[testRow][c] = this.PLAYER_NONE;
                
                if (blocks) {
                    return c;
                }
            }
        }
        
        // 3. Prefer center columns (strategy from KRL)
        if (this.getGravityRow(2) >= 0) return 2;  // Column 3 (0-indexed: 2)
        if (this.getGravityRow(3) >= 0) return 3;  // Column 4 (0-indexed: 3)
        
        // 4. Any valid column
        for (let c = 0; c < this.COLS; c++) {
            if (this.getGravityRow(c) >= 0) {
                return c;
            }
        }
        
        return -1;  // No valid moves
    },
    
    /**
     * Check if current turn should be AI
     */
    isAITurn() {
        if (this.gameMode === this.MODE_RVR) {
            return true;
        }
        if (this.gameMode === this.MODE_HVR && this.currentPlayer === this.PLAYER_BLUE) {
            return true;
        }
        return false;
    },
    
    /**
     * End the game
     */
    endGame() {
        this.gameActive = false;
    },
    
    /**
     * Get current player name
     */
    getCurrentPlayerName() {
        return this.currentPlayer === this.PLAYER_RED ? 'Rot' : 'Blau';
    },
    
    /**
     * Get storage position index for a piece
     * Returns { row, col } in 2x6 storage grid
     */
    getStoragePosition(player, count) {
        const idx = (count - 1) % 12;
        const r = Math.floor(idx / 6);
        const c = idx % 6;
        return { row: r, col: c };
    }
};

// Export for use in other modules
window.GameLogic = GameLogic;
