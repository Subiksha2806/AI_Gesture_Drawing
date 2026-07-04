import json
import time
import logging
import numpy as np
import cv2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any, List

from app.hand_tracker import HandTracker
from app.gesture_detector import GestureDetector
from app.drawing_engine import DrawingEngine
from app.shape_detector import ShapeDetector
from app.ocr import HandwritingRecognizer
from app.voice_commands import VoiceCommandParser
from app.save_manager import SaveManager

# Setup logger
logger = logging.getLogger(__name__)

router = APIRouter()

# Instantiate modules globally or per connection.
# For simplicity and speed, we share models across requests.
tracker = HandTracker(max_hands=2, detection_confidence=0.55, tracking_confidence=0.55)
gesture_detector = GestureDetector()
drawing_engine = DrawingEngine()
shape_detector = ShapeDetector()
ocr_recognizer = HandwritingRecognizer()
voice_parser = VoiceCommandParser()
save_manager = SaveManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to AI Canvas WebSocket")
    
    # Store per-connection state
    prev_gesture = "PAUSE"
    fps_start_time = time.time()
    fps_counter = 0
    fps_value = 0

    try:
        while True:
            # We can receive either text (JSON settings/commands) or binary (video frame)
            message = await websocket.receive()
            
            # --- HANDLE BINARY (Video Frame Processing) ---
            if "bytes" in message:
                frame_bytes = message["bytes"]
                fps_counter += 1
                
                # Update FPS every second
                current_time = time.time()
                if current_time - fps_start_time >= 1.0:
                    fps_value = fps_counter
                    fps_counter = 0
                    fps_start_time = current_time

                # Decode frame
                nparr = np.frombuffer(frame_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame is None:
                    await websocket.send_json({"type": "error", "message": "Failed to decode frame"})
                    continue

                h, w, c = frame.shape

                # Find hands
                hands, annotated_frame = tracker.find_hands(frame, draw=False)
                
                # Debug logging
                if len(hands) > 0:
                    logger.info(f"Frame received. Width={w}, Height={h}. Hands detected: {len(hands)}")
                
                response_payload = {
                    "type": "frame_response",
                    "hands": [],
                    "gesture": "PAUSE",
                    "cursor": None,
                    "smoothed_point": None,
                    "fps": fps_value
                }

                if hands:
                    # Sort hands by detection score, pick primary hand
                    hands.sort(key=lambda x: x["score"], reverse=True)
                    primary_hand = hands[0]
                    
                    # Detect gesture
                    gesture = gesture_detector.detect_gesture(primary_hand)
                    
                    # Map index tip (landmark 8) to normalized space (0 to 1)
                    index_tip = primary_hand["landmarks"][8]
                    raw_cursor_x = index_tip[0]
                    raw_cursor_y = index_tip[1]
                    
                    # Manage smoothing state transitions
                    # Reset smoothing if we just started drawing to prevent lines from snapping
                    if gesture == "DRAW" and prev_gesture != "DRAW":
                        drawing_engine.reset_smoothing()
                    
                    # Smooth drawing point
                    smooth_x, smooth_y = drawing_engine.smooth_point(raw_cursor_x, raw_cursor_y)
                    
                    # Update state
                    prev_gesture = gesture

                    response_payload["hands"] = hands
                    response_payload["gesture"] = gesture
                    response_payload["cursor"] = {"x": raw_cursor_x, "y": raw_cursor_y}
                    response_payload["smoothed_point"] = {"x": smooth_x, "y": smooth_y}
                else:
                    prev_gesture = "PAUSE"
                    drawing_engine.reset_smoothing()

                # Send tracking response
                await websocket.send_json(response_payload)

            # --- HANDLE TEXT (JSON Settings, Commands, and Requests) ---
            elif "text" in message:
                data = json.loads(message["text"])
                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type == "settings":
                    # Update smoothing configuration
                    alpha = data.get("ema_alpha")
                    if alpha is not None:
                        drawing_engine.ema_alpha = float(alpha)

                elif msg_type == "voice_transcript":
                    transcript = data.get("transcript", "")
                    cmd = voice_parser.parse(transcript)
                    if cmd:
                        await websocket.send_json({
                            "type": "voice_command",
                            "command": cmd,
                            "original_text": transcript
                        })

                elif msg_type == "detect_shape":
                    points = data.get("points", [])
                    # Shape detector expects width/height dimensions
                    shape_detector.canvas_width = data.get("width", 640)
                    shape_detector.canvas_height = data.get("height", 480)
                    
                    corrected = shape_detector.detect_and_correct(points)
                    if corrected:
                        await websocket.send_json({
                            "type": "shape_corrected",
                            "result": corrected
                        })
                    else:
                        await websocket.send_json({
                            "type": "shape_corrected",
                            "result": None
                        })

                elif msg_type == "ocr_request":
                    image_b64 = data.get("image", "")
                    try:
                        img_bytes = save_manager._decode_base64_image(image_b64)
                        recognized_text = ocr_recognizer.recognize_text(img_bytes)
                        await websocket.send_json({
                            "type": "ocr_response",
                            "text": recognized_text
                        })
                    except Exception as e:
                        logger.error(f"OCR websocket failed: {e}")
                        await websocket.send_json({
                            "type": "ocr_response",
                            "text": "",
                            "error": str(e)
                        })

                elif msg_type == "save_request":
                    image_b64 = data.get("image", "")
                    format_type = data.get("format", "png")
                    try:
                        filename, filepath = save_manager.save_image(image_b64, format_type)
                        await websocket.send_json({
                            "type": "save_response",
                            "status": "success",
                            "filename": filename,
                            "filepath": filepath
                        })
                    except Exception as e:
                        await websocket.send_json({
                            "type": "save_response",
                            "status": "error",
                            "message": str(e)
                        })

    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
