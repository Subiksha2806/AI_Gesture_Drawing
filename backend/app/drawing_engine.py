import numpy as np
from typing import Tuple, List, Dict, Optional

class DrawingEngine:
    """
    Manages coordinate smoothing and brush stroke styling (e.g., calligraphy speed/angle offsets).
    """
    def __init__(self, ema_alpha: float = 0.35):
        # Smoothing factor: lower = smoother but more lag, higher = more responsive but jittery
        self.ema_alpha = ema_alpha
        self.prev_smoothed_x: Optional[float] = None
        self.prev_smoothed_y: Optional[float] = None

    def reset_smoothing(self):
        """Resets the history of the EMA filter (call this when starting a new stroke)."""
        self.prev_smoothed_x = None
        self.prev_smoothed_y = None

    def smooth_point(self, raw_x: float, raw_y: float) -> Tuple[float, float]:
        """
        Applies Exponential Moving Average (EMA) to smooth the input coordinates.
        """
        if self.prev_smoothed_x is None or self.prev_smoothed_y is None:
            self.prev_smoothed_x = raw_x
            self.prev_smoothed_y = raw_y
            return raw_x, raw_y

        smoothed_x = self.ema_alpha * raw_x + (1 - self.ema_alpha) * self.prev_smoothed_x
        smoothed_y = self.ema_alpha * raw_y + (1 - self.ema_alpha) * self.prev_smoothed_y

        self.prev_smoothed_x = smoothed_x
        self.prev_smoothed_y = smoothed_y

        return float(smoothed_x), float(smoothed_y)

    def calculate_calligraphy_width(self, pt1: Tuple[float, float], pt2: Tuple[float, float], base_size: float) -> float:
        """
        Calculates stroke width for Calligraphy brush mode.
        Calligraphy lines change thickness based on the angle and speed of the stroke.
        """
        dx = pt2[0] - pt1[0]
        dy = pt2[1] - pt1[1]
        
        # Calculate angle of movement
        angle = np.arctan2(dy, dx)
        
        # Calligraphy brush is thickest at 45 degrees (pi/4) and thinnest at -45 degrees
        # We can map the angle to a scale between 0.3 and 1.5 of base_size
        factor = 0.3 + 1.2 * abs(np.sin(angle - np.pi/4))
        
        # Add velocity factor (faster movement -> thinner line)
        distance = np.sqrt(dx**2 + dy**2)
        speed_factor = max(0.5, min(1.5, 1.0 - (distance * 5.0))) # arbitrary normalization
        
        return float(base_size * factor * speed_factor)
