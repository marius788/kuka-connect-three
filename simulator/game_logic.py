"""
Kuka Robot Connect-3 Game Logic
Translated from KRL (Kuka Robot Language)
"""

import random
from typing import Tuple, Optional, List

# Player Constants
PLAYER_NONE = 0
PLAYER_RED = 1
PLAYER_BLUE = 2

# Board dimensions
ROWS = 4
COLS = 6

# Game modes
MODE_HVH = 0  # Human vs Human
MODE_HVR = 1  # Human vs Robot
MODE_RVR = 2  # Robot vs Robot (Demo)


class GameLogic:
    """Connect-3 game logic for Kuka robot simulation"""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        """Initialize/reset game state"""
        self.board = [[PLAYER_NONE for _ in range(COLS)] for _ in range(ROWS)]
        self.game_mode = MODE_HVH
        self.gravity_mode = True
        self.current_player = PLAYER_RED  # Red starts
        self.win_flag = False
        self.used_red = 0
        self.used_blue = 0
        self.game_over = False
        self.winner = PLAYER_NONE
        self.move_history = []
    
    def get_board_state(self) -> List[List[int]]:
        """Return current board state"""
        return [row[:] for row in self.board]
    
    def set_game_mode(self, mode: int):
        """Set game mode: MODE_HVH, MODE_HVR, or MODE_RVR"""
        if mode in [MODE_HVH, MODE_HVR, MODE_RVR]:
            self.game_mode = mode
    
    def set_gravity_mode(self, enabled: bool):
        """Enable/disable gravity mode"""
        self.gravity_mode = enabled
    
    def set_starting_player(self, player: int):
        """Set which player starts"""
        if player in [PLAYER_RED, PLAYER_BLUE]:
            self.current_player = player
    
    def get_gravity_row(self, col: int) -> int:
        """Get the row where a piece would land in gravity mode (1-indexed, 0 if full)"""
        for r in range(ROWS - 1, -1, -1):
            if self.board[r][col] == PLAYER_NONE:
                return r + 1  # 1-indexed!
        return 0  # Column is full
    
    def is_valid_move(self, row: int, col: int) -> bool:
        """Check if a move is valid (0-indexed internally)"""
        if col < 0 or col >= COLS or row < 0 or row >= ROWS:
            return False
        if self.board[row][col] != PLAYER_NONE:
            return False
        return True
    
    def make_move(self, col: int, row: Optional[int] = None) -> Tuple[bool, int, int]:
        """
        Make a move at the specified column (and optionally row if not gravity mode)
        Returns: (success, actual_row, col) - row is 0-indexed
        """
        if self.game_over:
            return False, -1, col
        
        if self.gravity_mode:
            gravity_row = self.get_gravity_row(col)
            if gravity_row == 0:
                return False, -1, col  # Column full
            actual_row = gravity_row - 1  # Convert to 0-indexed
        else:
            if row is None:
                return False, -1, col
            actual_row = row
        
        if not self.is_valid_move(actual_row, col):
            return False, -1, col
        
        # Place the piece
        self.board[actual_row][col] = self.current_player
        
        # Track usage
        if self.current_player == PLAYER_RED:
            self.used_red += 1
        else:
            self.used_blue += 1
        
        # Record move
        self.move_history.append({
            'player': self.current_player,
            'row': actual_row,
            'col': col
        })
        
        # Check for winner
        if self.check_winner(self.current_player):
            self.win_flag = True
            self.game_over = True
            self.winner = self.current_player
        elif self.used_red + self.used_blue >= ROWS * COLS:
            # Draw
            self.game_over = True
            self.winner = PLAYER_NONE
        else:
            # Switch player
            self.current_player = PLAYER_BLUE if self.current_player == PLAYER_RED else PLAYER_RED
        
        return True, actual_row, col
    
    def check_winner(self, player: int) -> bool:
        """Check if the specified player has won (3 in a row)"""
        # Horizontal check
        for r in range(ROWS):
            for c in range(COLS - 2):
                if (self.board[r][c] == player and 
                    self.board[r][c+1] == player and 
                    self.board[r][c+2] == player):
                    return True
        
        # Vertical check
        for r in range(ROWS - 2):
            for c in range(COLS):
                if (self.board[r][c] == player and 
                    self.board[r+1][c] == player and 
                    self.board[r+2][c] == player):
                    return True
        
        # Diagonal (top-left to bottom-right)
        for r in range(ROWS - 2):
            for c in range(COLS - 2):
                if (self.board[r][c] == player and 
                    self.board[r+1][c+1] == player and 
                    self.board[r+2][c+2] == player):
                    return True
        
        # Diagonal (bottom-left to top-right)
        for r in range(2, ROWS):
            for c in range(COLS - 2):
                if (self.board[r][c] == player and 
                    self.board[r-1][c+1] == player and 
                    self.board[r-2][c+2] == player):
                    return True
        
        return False
    
    def get_ai_move(self) -> int:
        """Calculate AI move - returns column (0-indexed)"""
        my_color = self.current_player
        opp_color = PLAYER_BLUE if my_color == PLAYER_RED else PLAYER_RED
        
        # 1. Try to win
        for c in range(COLS):
            test_row = self.get_gravity_row(c)
            if test_row > 0:
                row_idx = test_row - 1
                self.board[row_idx][c] = my_color
                if self.check_winner(my_color):
                    self.board[row_idx][c] = PLAYER_NONE
                    return c
                self.board[row_idx][c] = PLAYER_NONE
        
        # 2. Block opponent's win
        for c in range(COLS):
            test_row = self.get_gravity_row(c)
            if test_row > 0:
                row_idx = test_row - 1
                self.board[row_idx][c] = opp_color
                if self.check_winner(opp_color):
                    self.board[row_idx][c] = PLAYER_NONE
                    return c
                self.board[row_idx][c] = PLAYER_NONE
        
        # 3. Prefer center columns (strategic)
        center_cols = [2, 3, 1, 4, 0, 5]  # Prioritized order
        for c in center_cols:
            if self.get_gravity_row(c) > 0:
                return c
        
        # 4. Fallback: any available column
        for c in range(COLS):
            if self.get_gravity_row(c) > 0:
                return c
        
        return -1  # No valid move
    
    def is_robot_turn(self) -> bool:
        """Check if it's the robot's turn based on game mode"""
        if self.game_mode == MODE_RVR:
            return True
        if self.game_mode == MODE_HVR and self.current_player == PLAYER_BLUE:
            return True
        return False
    
    def get_game_state(self) -> dict:
        """Return complete game state as dictionary"""
        return {
            'board': self.get_board_state(),
            'current_player': self.current_player,
            'game_mode': self.game_mode,
            'gravity_mode': self.gravity_mode,
            'game_over': self.game_over,
            'winner': self.winner,
            'used_red': self.used_red,
            'used_blue': self.used_blue,
            'is_robot_turn': self.is_robot_turn(),
            'move_history': self.move_history
        }
