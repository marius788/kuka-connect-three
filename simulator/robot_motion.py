"""
Kuka Robot Motion Simulator
Simulates robot movements for the Connect-3 game
"""

import math
from typing import List, Dict, Tuple
from game_logic import ROWS, COLS, PLAYER_RED, PLAYER_BLUE, PLAYER_NONE

# Configuration distances (mm) - from GAME_DATA.dat
DX_COL = 47.0
DY_ROW = 32.0
SAFE_Z = 50.0
APP_DIST = 60.0
APP_Z = 40.0

# Reference positions from the original KRL code
XP_FIELD_REF = {'x': 66.14, 'y': 99.44, 'z': -0.31}
XP_REF_RED = {'x': 20.29, 'y': 36.43, 'z': 0.77}
XP_REF_BLUE = {'x': 221.16, 'y': 37.29, 'z': -1.01}
XP_MAG_RED = {'x': -227.58, 'y': 358.88, 'z': 22.45}
XP_MAG_BLUE = {'x': 569.80, 'y': 360.56, 'z': 18.95}
XP_HOME = {'x': 200.0, 'y': 0.0, 'z': 300.0}


class RobotMotion:
    """Simulates Kuka robot motion for the Connect-3 game"""
    
    def __init__(self):
        self.current_position = XP_HOME.copy()
        self.gripper_open = True
        self.motion_sequence = []
        self.p_field = [[{} for _ in range(COLS)] for _ in range(ROWS)]
        self.p_store_red = [[{} for _ in range(6)] for _ in range(2)]
        self.p_store_blue = [[{} for _ in range(6)] for _ in range(2)]
        self._init_positions()
    
    def _init_positions(self):
        """Calculate all positions (from ROBOT_MOTION_INIT)"""
        # Field positions (4x6 grid)
        for r in range(ROWS):
            for c in range(COLS):
                self.p_field[r][c] = {
                    'x': XP_FIELD_REF['x'] + c * DX_COL,
                    'y': XP_FIELD_REF['y'] + (ROWS - 1 - r) * DY_ROW,
                    'z': XP_FIELD_REF['z']
                }
        
        # Red storage (2x6)
        for r in range(2):
            for c in range(6):
                self.p_store_red[r][c] = {
                    'x': XP_REF_RED['x'] + c * DY_ROW,
                    'y': XP_REF_RED['y'] + (1 - r) * DX_COL,
                    'z': XP_REF_RED['z']
                }
        
        # Blue storage (2x6)
        for r in range(2):
            for c in range(6):
                self.p_store_blue[r][c] = {
                    'x': XP_REF_BLUE['x'] + c * DY_ROW,
                    'y': XP_REF_BLUE['y'] + (1 - r) * DX_COL,
                    'z': XP_REF_BLUE['z']
                }
    
    def reset(self):
        """Reset motion sequence"""
        self.motion_sequence = []
        self.current_position = XP_HOME.copy()
        self.gripper_open = True
    
    def _add_motion(self, motion_type: str, target: dict, duration: float = 0.5, 
                    gripper_state: str = None, description: str = ""):
        """Add a motion step to the sequence"""
        step = {
            'type': motion_type,  # 'PTP' or 'LIN'
            'target': target.copy(),
            'duration': duration,
            'description': description
        }
        if gripper_state:
            step['gripper'] = gripper_state
        self.motion_sequence.append(step)
        self.current_position = target.copy()
    
    def move_to_home(self):
        """Move robot to home position"""
        self._add_motion('PTP', XP_HOME, 0.8, description='Moving to home')
    
    def gripper_close(self):
        """Close gripper"""
        self.motion_sequence.append({
            'type': 'GRIPPER',
            'action': 'close',
            'duration': 0.3,
            'description': 'Closing gripper'
        })
        self.gripper_open = False
    
    def gripper_open_action(self):
        """Open gripper"""
        self.motion_sequence.append({
            'type': 'GRIPPER',
            'action': 'open',
            'duration': 0.2,
            'description': 'Opening gripper'
        })
        self.gripper_open = True
    
    def get_pick_position(self, player: int, piece_count: int) -> dict:
        """Get the position to pick a piece from storage"""
        # Handle refill (wrap around after 12)
        idx = (piece_count - 1) % 12
        r_idx = idx // 6
        c_idx = idx % 6
        
        if player == PLAYER_RED:
            return self.p_store_red[r_idx][c_idx].copy()
        else:
            return self.p_store_blue[r_idx][c_idx].copy()
    
    def get_field_position(self, row: int, col: int) -> dict:
        """Get position on the game board (0-indexed)"""
        return self.p_field[row][col].copy()
    
    def generate_game_move(self, row: int, col: int, player: int, piece_count: int) -> List[dict]:
        """Generate motion sequence for a game move (pick from storage, place on board)"""
        self.reset()
        
        # Get positions
        pick_pos = self.get_pick_position(player, piece_count)
        place_pos = self.get_field_position(row, col)
        
        # Pick sequence
        pick_high = pick_pos.copy()
        pick_high['z'] = pick_pos['z'] + SAFE_Z
        
        self._add_motion('PTP', pick_high, 0.6, description=f'Approaching storage')
        self._add_motion('LIN', pick_pos, 0.4, description='Lowering to piece')
        self.gripper_close()
        self._add_motion('LIN', pick_high, 0.4, description='Lifting piece')
        
        # Place sequence
        place_high = place_pos.copy()
        place_high['z'] = place_pos['z'] + SAFE_Z
        
        self._add_motion('PTP', place_high, 0.6, description=f'Moving to board [{row+1},{col+1}]')
        self._add_motion('LIN', place_pos, 0.4, description='Placing piece')
        self.gripper_open_action()
        self._add_motion('LIN', place_high, 0.4, description='Retracting')
        
        self.move_to_home()
        
        return self.motion_sequence
    
    def generate_cleanup_move(self, row: int, col: int, player: int, 
                              piece_count: int) -> List[dict]:
        """Generate motion sequence for cleanup (pick from board, place in storage)"""
        self.reset()
        
        # Get positions
        pick_pos = self.get_field_position(row, col)
        place_pos = self.get_pick_position(player, piece_count)
        
        # Pick from board
        pick_high = pick_pos.copy()
        pick_high['z'] = pick_pos['z'] + SAFE_Z
        
        self._add_motion('PTP', pick_high, 0.5, description='Approaching board position')
        self._add_motion('LIN', pick_pos, 0.3, description='Picking up piece')
        self.gripper_close()
        self._add_motion('LIN', pick_high, 0.3, description='Lifting piece')
        
        # Place in storage
        place_high = place_pos.copy()
        place_high['z'] = place_pos['z'] + SAFE_Z
        
        self._add_motion('PTP', place_high, 0.5, description='Moving to storage')
        self._add_motion('LIN', place_pos, 0.3, description='Placing in storage')
        self.gripper_open_action()
        self._add_motion('LIN', place_high, 0.3, description='Retracting')
        
        return self.motion_sequence
    
    def generate_setup_sequence(self) -> List[dict]:
        """Generate the full setup sequence (distribute pieces from magazine to storage)"""
        self.reset()
        
        # Red pieces from magazine
        mag_red = XP_MAG_RED.copy()
        approach_red = {
            'x': mag_red['x'],
            'y': mag_red['y'] - APP_DIST,
            'z': mag_red['z'] + APP_Z
        }
        
        for r in range(2):
            for c in range(6):
                # Approach magazine
                self._add_motion('PTP', approach_red, 0.5, description='Approaching red magazine')
                self._add_motion('LIN', mag_red, 0.4, description='Picking from magazine')
                self.gripper_close()
                self._add_motion('LIN', approach_red, 0.4, description='Retracting')
                
                # Place in storage
                target = self.p_store_red[r][c].copy()
                target_high = target.copy()
                target_high['z'] = target['z'] + SAFE_Z
                
                self._add_motion('PTP', target_high, 0.5, description=f'Moving to red storage [{r+1},{c+1}]')
                self._add_motion('LIN', target, 0.3, description='Placing in storage')
                self.gripper_open_action()
                self._add_motion('LIN', target_high, 0.3, description='Retracting')
        
        # Blue pieces from magazine
        mag_blue = XP_MAG_BLUE.copy()
        approach_blue = {
            'x': mag_blue['x'],
            'y': mag_blue['y'] - APP_DIST,
            'z': mag_blue['z'] + APP_Z
        }
        
        for r in range(2):
            for c in range(6):
                # Approach magazine
                self._add_motion('PTP', approach_blue, 0.5, description='Approaching blue magazine')
                self._add_motion('LIN', mag_blue, 0.4, description='Picking from magazine')
                self.gripper_close()
                self._add_motion('LIN', approach_blue, 0.4, description='Retracting')
                
                # Place in storage
                target = self.p_store_blue[r][c].copy()
                target_high = target.copy()
                target_high['z'] = target['z'] + SAFE_Z
                
                self._add_motion('PTP', target_high, 0.5, description=f'Moving to blue storage [{r+1},{c+1}]')
                self._add_motion('LIN', target, 0.3, description='Placing in storage')
                self.gripper_open_action()
                self._add_motion('LIN', target_high, 0.3, description='Retracting')
        
        self.move_to_home()
        return self.motion_sequence
    
    def get_all_positions(self) -> dict:
        """Return all calculated positions for visualization"""
        return {
            'home': XP_HOME,
            'field': self.p_field,
            'store_red': self.p_store_red,
            'store_blue': self.p_store_blue,
            'mag_red': XP_MAG_RED,
            'mag_blue': XP_MAG_BLUE
        }
