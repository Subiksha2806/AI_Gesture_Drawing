import numpy as np
from typing import List, Dict, Any

class GestureDetector:
    """
    Classifies gestures from the 21 hand landmarks using geometric heuristics.
    """
    def __init__(self, pinch_threshold: float = 0.04, spread_threshold: float = 0.07):
        # Thresholds are in normalized coordinates (0.0 to 1.0)
        self.pinch_threshold = pinch_threshold
        self.spread_threshold = spread_threshold

    def _get_distance(self, pt1: List[float], pt2: List[float]) -> float:
        """Calculates Euclidean distance between two 3D/2D points."""
        return float(np.linalg.norm(np.array(pt1[:2]) - np.array(pt2[:2])))

    def detect_gesture(self, hand: Dict[str, Any]) -> str:
        """
        Detects gesture for a single hand.
        Landmark indices correspond to standard MediaPipe hands mapping:
        0: Wrist
        4: Thumb Tip
        8: Index Tip, 7: Index Dip, 6: Index Pip, 5: Index Mcp
        12: Middle Tip, 11: Middle Dip, 10: Middle Pip, 9: Middle Mcp
        16: Ring Tip, 15: Ring Dip, 14: Ring Pip, 13: Ring Mcp
        20: Pinky Tip, 19: Pinky Dip, 18: Pinky Pip, 17: Pinky Mcp
        """
        landmarks = hand["landmarks"]
        label = hand["label"]  # "Left" or "Right"

        # Extract landmarks for convenience
        wrist = landmarks[0]
        thumb_tip = landmarks[4]
        thumb_ip = landmarks[3]
        thumb_mcp = landmarks[2]
        
        index_tip = landmarks[8]
        index_pip = landmarks[6]
        index_mcp = landmarks[5]
        
        middle_tip = landmarks[12]
        middle_pip = landmarks[10]
        middle_mcp = landmarks[9]
        
        ring_tip = landmarks[16]
        ring_pip = landmarks[14]
        ring_mcp = landmarks[13]
        
        pinky_tip = landmarks[20]
        pinky_pip = landmarks[18]
        pinky_mcp = landmarks[17]

        # Determine if fingers are open/extended using rotation-invariant wrist distance comparison.
        # When extended, the fingertip is further from the wrist than the PIP joint.
        # When folded, the finger curls in, making the tip closer to the wrist than the outward-bent PIP joint.
        index_open = self._get_distance(index_tip, wrist) > self._get_distance(index_pip, wrist)
        middle_open = self._get_distance(middle_tip, wrist) > self._get_distance(middle_pip, wrist)
        ring_open = self._get_distance(ring_tip, wrist) > self._get_distance(ring_pip, wrist)
        pinky_open = self._get_distance(pinky_tip, wrist) > self._get_distance(pinky_pip, wrist)

        # For the thumb: distance from tip to pinky MCP compared to IP to pinky MCP
        thumb_open = self._get_distance(thumb_tip, pinky_mcp) > self._get_distance(thumb_ip, pinky_mcp)

        # Count open fingers
        open_fingers = [index_open, middle_open, ring_open, pinky_open]
        num_open_fingers = sum(open_fingers)

        # 1. Closed Fist -> CLEAR_CANVAS
        if num_open_fingers == 0 and not thumb_open:
            return "CLEAR_CANVAS"

        # 2. Thumb Up -> SAVE
        if thumb_open and num_open_fingers == 0:
            if thumb_tip[1] < thumb_mcp[1]:
                return "SAVE"

        # 3. Pinch -> SELECT
        pinch_dist = self._get_distance(thumb_tip, index_tip)
        if pinch_dist < self.pinch_threshold:
            return "SELECT"

        # 4. Open Palm -> PAUSE
        if index_open and middle_open and ring_open and pinky_open and thumb_open:
            return "PAUSE"

        # 5. Peace Sign / Eraser OR Move Cursor
        if index_open and middle_open and not ring_open and not pinky_open:
            tip_dist = self._get_distance(index_tip, middle_tip)
            if tip_dist >= self.spread_threshold:
                return "ERASER"
            else:
                return "MOVE_CURSOR"

        # 6. One Finger Up -> DRAW
        # As long as the index is open and middle is closed, class as DRAW.
        # This prevents ring/pinky finger coordinate jitters from breaking the stroke line.
        if index_open and not middle_open:
            return "DRAW"

        # Default fallback
        if index_open:
            return "MOVE_CURSOR"
        
        return "PAUSE"
