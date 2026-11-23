"""
Kuka Robot Simulation - Flask Web Server
"""

import os
import sys
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Add simulator directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from game_logic import GameLogic, PLAYER_RED, PLAYER_BLUE, MODE_HVH, MODE_HVR, MODE_RVR
from robot_motion import RobotMotion

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Global game instances
game = GameLogic()
robot = RobotMotion()


@app.route('/')
def index():
    """Serve the main page"""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/game/state', methods=['GET'])
def get_game_state():
    """Get current game state"""
    state = game.get_game_state()
    state['positions'] = robot.get_all_positions()
    return jsonify(state)


@app.route('/api/game/reset', methods=['POST'])
def reset_game():
    """Reset the game"""
    game.reset()
    robot.reset()
    return jsonify({'success': True, 'state': game.get_game_state()})


@app.route('/api/game/config', methods=['POST'])
def configure_game():
    """Configure game settings"""
    data = request.get_json()
    
    if 'mode' in data:
        mode_map = {'hvh': MODE_HVH, 'hvr': MODE_HVR, 'rvr': MODE_RVR}
        mode = mode_map.get(data['mode'].lower(), MODE_HVH)
        game.set_game_mode(mode)
    
    if 'gravity' in data:
        game.set_gravity_mode(data['gravity'])
    
    if 'starting_player' in data:
        player = PLAYER_RED if data['starting_player'] == 'red' else PLAYER_BLUE
        game.set_starting_player(player)
    
    return jsonify({'success': True, 'state': game.get_game_state()})


@app.route('/api/game/move', methods=['POST'])
def make_move():
    """Make a game move"""
    data = request.get_json()
    col = data.get('col', 0)
    row = data.get('row', None)
    
    success, actual_row, actual_col = game.make_move(col, row)
    
    if success:
        # Get piece count for this player
        if game.move_history[-1]['player'] == PLAYER_RED:
            piece_count = game.used_red
        else:
            piece_count = game.used_blue
        
        # Generate robot motion
        motion = robot.generate_game_move(
            actual_row, actual_col,
            game.move_history[-1]['player'],
            piece_count
        )
        
        return jsonify({
            'success': True,
            'row': actual_row,
            'col': actual_col,
            'motion': motion,
            'state': game.get_game_state()
        })
    
    return jsonify({
        'success': False,
        'message': 'Invalid move',
        'state': game.get_game_state()
    })


@app.route('/api/game/ai-move', methods=['POST'])
def ai_move():
    """Get and execute AI move"""
    if not game.is_robot_turn():
        return jsonify({
            'success': False,
            'message': 'Not robot turn',
            'state': game.get_game_state()
        })
    
    col = game.get_ai_move()
    if col < 0:
        return jsonify({
            'success': False,
            'message': 'No valid moves',
            'state': game.get_game_state()
        })
    
    success, actual_row, actual_col = game.make_move(col)
    
    if success:
        if game.move_history[-1]['player'] == PLAYER_RED:
            piece_count = game.used_red
        else:
            piece_count = game.used_blue
        
        motion = robot.generate_game_move(
            actual_row, actual_col,
            game.move_history[-1]['player'],
            piece_count
        )
        
        return jsonify({
            'success': True,
            'row': actual_row,
            'col': actual_col,
            'motion': motion,
            'state': game.get_game_state()
        })
    
    return jsonify({
        'success': False,
        'message': 'AI move failed',
        'state': game.get_game_state()
    })


@app.route('/api/robot/positions', methods=['GET'])
def get_positions():
    """Get all robot positions for visualization"""
    return jsonify(robot.get_all_positions())


@app.route('/api/robot/setup', methods=['POST'])
def robot_setup():
    """Generate setup motion sequence"""
    motion = robot.generate_setup_sequence()
    return jsonify({'motion': motion})


if __name__ == '__main__':
    print("=" * 50)
    print("  Kuka Robot Connect-3 Simulation")
    print("=" * 50)
    print()
    print("  Open your browser to: http://localhost:5000")
    print("  Press Ctrl+C to stop the server")
    print()
    app.run(host='0.0.0.0', port=5000, debug=True)
