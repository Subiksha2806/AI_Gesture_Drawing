import pytest
import numpy as np
from app.gesture_detector import GestureDetector
from app.shape_detector import ShapeDetector
from app.voice_commands import VoiceCommandParser

def test_voice_command_parser():
    parser = VoiceCommandParser()
    
    # Test tool switches
    cmd = parser.parse("use eraser")
    assert cmd is not None
    assert cmd["action"] == "SET_TOOL"
    assert cmd["value"] == "eraser"
    
    # Test color shifts
    cmd = parser.parse("change color to blue")
    assert cmd is not None
    assert cmd["action"] == "SET_COLOR"
    assert cmd["value"] == "#3b82f6"
    
    # Test size adjustments
    cmd = parser.parse("brush size 15")
    assert cmd is not None
    assert cmd["action"] == "SET_SIZE"
    assert cmd["value"] == 15

    # Test actions
    cmd = parser.parse("clear canvas")
    assert cmd is not None
    assert cmd["action"] == "CLEAR_CONFIRM"

def test_shape_detector_line():
    detector = ShapeDetector(canvas_width=640, canvas_height=480)
    
    # Generate points in a perfect straight line
    line_points = [(float(x), 100.0) for x in range(10, 100, 5)]
    res = detector.detect_and_correct(line_points)
    
    assert res is not None
    assert res["type"] == "line"
    assert res["points"][0]["x"] == 10.0
    assert res["points"][-1]["x"] == 95.0

def test_shape_detector_circle():
    detector = ShapeDetector(canvas_width=640, canvas_height=480)
    
    # Generate points roughly in a circle (centered at 200, 200 with radius 50)
    circle_points = []
    cx, cy, r = 200, 200, 50
    for deg in range(0, 360, 15):
        rad = np.radians(deg)
        # Add slight jitter to simulate hand drawing
        jitter = np.random.uniform(-1, 1)
        circle_points.append((float(cx + (r + jitter) * np.cos(rad)), float(cy + (r + jitter) * np.sin(rad))))
        
    res = detector.detect_and_correct(circle_points)
    
    assert res is not None
    assert res["type"] == "circle"
    # Centroid should be very close to 200, 200
    assert abs(res["center"]["x"] - 200) < 5
    # Radius should be close to 50
    assert abs(res["radius"] - 50) < 5

def test_gesture_detector_draw():
    detector = GestureDetector()
    
    # Mock landmarks for a closed fist / Draw gesture
    # We want DRAW: Index extended, Middle/Ring/Pinky folded.
    # Landmanks: [ [x, y, z], ... ]
    # Landmark 8 (index tip) should have y much smaller (higher on screen) than landmark 6 (index pip)
    # Folded fingers (12 middle, 16 ring, 20 pinky) have tip y >= pip y
    mock_lms = [[0.5, 0.9, 0.0]] * 21  # Initialize all joints to center
    
    # Index extended
    mock_lms[8] = [0.5, 0.2, 0.0]  # Tip high
    mock_lms[6] = [0.5, 0.4, 0.0]  # Pip lower
    mock_lms[5] = [0.5, 0.5, 0.0]  # Mcp lowest
    
    # Middle folded
    mock_lms[12] = [0.6, 0.5, 0.0] # Tip
    mock_lms[10] = [0.6, 0.4, 0.0] # Pip
    
    # Ring folded
    mock_lms[16] = [0.7, 0.5, 0.0] # Tip
    mock_lms[14] = [0.7, 0.4, 0.0] # Pip
    
    # Pinky folded
    mock_lms[20] = [0.8, 0.5, 0.0] # Tip
    mock_lms[18] = [0.8, 0.4, 0.0] # Pip

    # Thumb folded (close to index mcp)
    mock_lms[4] = [0.45, 0.6, 0.0] # Tip
    mock_lms[3] = [0.45, 0.65, 0.0] # IP
    mock_lms[2] = [0.45, 0.7, 0.0] # MCP
    mock_lms[17] = [0.8, 0.6, 0.0] # Pinky MCP (used for thumb distance)

    hand = {
        "label": "Right",
        "score": 0.9,
        "landmarks": mock_lms
    }

    gesture = detector.detect_gesture(hand)
    assert gesture == "DRAW"
