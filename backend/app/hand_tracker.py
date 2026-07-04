import cv2
import mediapipe as mp
import numpy as np
import os
import urllib.request
from typing import List, Dict, Any, Tuple

class HandTracker:
    """
    A wrapper class for MediaPipe Tasks Vision HandLandmarker that processes frames 
    to detect hand landmarks, handedness, and calculates bounding boxes.
    """
    def __init__(self, static_mode: bool = False, max_hands: int = 2, 
                 model_complexity: int = 1, detection_confidence: float = 0.5, 
                 tracking_confidence: float = 0.5):
        self.max_hands = max_hands
        self.detection_confidence = detection_confidence
        self.tracking_confidence = tracking_confidence

        # Path to download/load the MediaPipe Task model
        self.model_filename = "hand_landmarker.task"
        self.model_path = os.path.join(os.path.dirname(__file__), self.model_filename)
        
        # Download model if not present locally
        self._ensure_model_exists()

        # Initialize MediaPipe Tasks HandLandmarker
        BaseOptions = mp.tasks.BaseOptions
        HandLandmarker = mp.tasks.vision.HandLandmarker
        HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
        VisionRunningMode = mp.tasks.vision.RunningMode

        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=self.model_path),
            running_mode=VisionRunningMode.IMAGE,
            num_hands=self.max_hands,
            min_hand_detection_confidence=self.detection_confidence,
            min_hand_presence_confidence=self.detection_confidence,
            min_tracking_confidence=self.tracking_confidence
        )
        
        self.landmarker = HandLandmarker.create_from_options(options)

    def _ensure_model_exists(self):
        """Downloads the HandLandmarker task model from Google's official CDN if not found."""
        if not os.path.exists(self.model_path):
            print(f"Downloading MediaPipe HandLandmarker model to {self.model_path}...")
            url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            try:
                # Create parent folders if necessary
                os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
                urllib.request.urlretrieve(url, self.model_path)
                print("Model downloaded successfully!")
            except Exception as e:
                raise IOError(f"Failed to download hand_landmarker.task model: {e}")

    def find_hands(self, img: np.ndarray, draw: bool = False) -> Tuple[List[Dict[str, Any]], np.ndarray]:
        """
        Processes an image frame, finds hand landmarks, and returns list of hands metadata 
        matching the original JSON coordinates mapping structure.
        """
        h, w, c = img.shape
        
        # Convert BGR OpenCV frame to RGB as required by MediaPipe Tasks Image format
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        
        # Detect hands
        result = self.landmarker.detect(mp_image)
        
        hands_list = []

        if result.hand_landmarks:
            for hand_idx, hand_lms in enumerate(result.hand_landmarks):
                # Extract handedness label (Left or Right)
                # MediaPipe Tasks structures handedness as a list of lists of categories
                if hand_idx < len(result.handedness):
                    handedness = result.handedness[hand_idx][0]
                    label = handedness.category_name  # "Left" or "Right"
                    score = handedness.score
                else:
                    label = "Right"
                    score = 0.8

                # Extract landmarks coordinates
                landmarks = []
                x_coords = []
                y_coords = []
                
                for lm in hand_lms:
                    landmarks.append([lm.x, lm.y, lm.z])
                    x_coords.append(int(lm.x * w))
                    y_coords.append(int(lm.y * h))

                # Calculate bounding box
                if x_coords and y_coords:
                    xmin, xmax = min(x_coords), max(x_coords)
                    ymin, ymax = min(y_coords), max(y_coords)
                    bbox = [xmin, ymin, xmax, ymax]
                else:
                    bbox = [0, 0, 0, 0]

                hands_list.append({
                    "label": label,
                    "score": float(score),
                    "landmarks": landmarks,
                    "bbox": bbox
                })

                # Visual debugging circles if requested (optional)
                if draw:
                    for pt in landmarks:
                        px, py = int(pt[0] * w), int(pt[1] * h)
                        cv2.circle(img, (px, py), 4, (16, 185, 129), -1)

        return hands_list, img

    def close(self):
        """Releases HandLandmarker resources."""
        self.landmarker.close()
