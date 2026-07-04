import re
from typing import Dict, Any, Optional

class VoiceCommandParser:
    """
    Parses voice transcripts received from the frontend into structured canvas control commands.
    """
    def __init__(self):
        # Mapping common color words to hex values
        self.color_map = {
            "red": "#ef4444",
            "blue": "#3b82f6",
            "green": "#10b981",
            "yellow": "#eab308",
            "purple": "#a855f7",
            "orange": "#f97316",
            "pink": "#ec4899",
            "white": "#ffffff",
            "black": "#000000",
            "cyan": "#06b6d4",
            "magenta": "#d946ef",
            "gray": "#6b7280"
        }

        # Mapping common tool words
        self.tool_map = {
            "draw": "pencil",
            "brush": "pencil",
            "pencil": "pencil",
            "marker": "marker",
            "neon": "neon",
            "calligraphy": "calligraphy",
            "eraser": "eraser",
            "erase": "eraser"
        }

    def parse(self, transcript: str) -> Optional[Dict[str, Any]]:
        """
        Parses transcript string and extracts action, value, and payload.
        """
        text = transcript.lower().strip()

        # 1. Check Tool Changes
        for keyword, tool in self.tool_map.items():
            if f"use {keyword}" in text or f"switch to {keyword}" in text or text == keyword:
                return {"action": "SET_TOOL", "value": tool}
            if keyword == "eraser" and ("eraser" in text or "erase" in text):
                return {"action": "SET_TOOL", "value": "eraser"}

        # 2. Check Color Changes
        for color_name, hex_val in self.color_map.items():
            if f"color {color_name}" in text or f"change color to {color_name}" in text or f"make it {color_name}" in text:
                return {"action": "SET_COLOR", "value": hex_val}
            # Single word match for colors
            if text == color_name:
                return {"action": "SET_COLOR", "value": hex_val}

        # 3. Check Brush Size Updates (e.g. "brush size 20" or "size fifteen")
        size_match = re.search(r'(?:brush\s+)?size\s+(\d+)', text)
        if size_match:
            size_val = int(size_match.group(1))
            # Clamp size to reasonable limits
            size_val = max(1, min(100, size_val))
            return {"action": "SET_SIZE", "value": size_val}

        # Numeric words fallback for brush size (e.g., "size five")
        num_words = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "fifteen": 15, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50
        }
        for word, val in num_words.items():
            if f"size {word}" in text or f"brush size {word}" in text:
                return {"action": "SET_SIZE", "value": val}

        # 4. Check Global Canvas Commands
        if "clear" in text or "reset" in text:
            return {"action": "CLEAR_CONFIRM"}
        
        if "undo" in text:
            return {"action": "UNDO"}
        
        if "redo" in text:
            return {"action": "REDO"}
        
        if "save" in text or "export" in text:
            return {"action": "SAVE"}
        
        if "pause" in text:
            return {"action": "PAUSE"}
            
        if "resume" in text or "start drawing" in text:
            return {"action": "RESUME"}

        return None
