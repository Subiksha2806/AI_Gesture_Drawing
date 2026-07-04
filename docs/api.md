# API Specifications - AI Air Canvas Studio

This document contains the endpoint details, request/response models, and message formats for the REST API and real-time WebSocket protocol.

---

## 1. REST API Endpoints

The backend server runs on `http://localhost:8000` by default.

### Health Check
- **Endpoint**: `/`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "online",
    "app": "AI Virtual Air Canvas Backend API",
    "version": "1.0.0"
  }
  ```

### List Drawing Gallery
- **Endpoint**: `/api/drawings`
- **Method**: `GET`
- **Response**: Array of drawing metadata, sorted by creation timestamp (newest first).
  ```json
  [
    {
      "filename": "drawing_20260704_131230.png",
      "format": "PNG",
      "size_bytes": 15432,
      "created_at": 1783161150.0
    }
  ]
  ```

### Delete Drawing
- **Endpoint**: `/api/drawings/{filename}`
- **Method**: `DELETE`
- **Response**:
  ```json
  {
    "status": "success",
    "message": "drawing_20260704_131230.png deleted successfully"
  }
  ```

### Export PDF Document
- **Endpoint**: `/api/export/pdf`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "image": "data:image/png;base64,iVBORw0KGgoAAA..."
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "filename": "drawing_20260704_131230.pdf",
    "url": "/static/drawing_20260704_131230.pdf"
  }
  ```

### Export SVG Vector
- **Endpoint**: `/api/export/svg`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "width": 640,
    "height": 480,
    "paths": [
      {
        "points": [{"x": 100, "y": 150}, {"x": 120, "y": 160}],
        "color": "#a855f7",
        "size": 6,
        "opacity": 1.0,
        "tool": "pencil"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "filename": "drawing_20260704_131230.svg",
    "url": "/static/drawing_20260704_131230.svg",
    "svg_content": "<svg xmlns=\"http://www.w3.org/2000/svg\" ... </svg>"
  }
  ```

---

## 2. WebSocket Protocol (`/ws`)

- **Connection URL**: `ws://localhost:8000/ws`

### Client-to-Server Messages

#### A. Webcam Video Frame (Binary)
- **Format**: Raw binary bytes representing a JPEG image.
- **Rate**: Up to 30 times per second.

#### B. settings Configuration (JSON)
- **Payload**:
  ```json
  {
    "type": "settings",
    "ema_alpha": 0.35
  }
  ```

#### C. Voice Transcript Command (JSON)
- **Payload**:
  ```json
  {
    "type": "voice_transcript",
    "transcript": "use eraser"
  }
  ```

#### D. Shape Auto-correction Request (JSON)
- **Payload**:
  ```json
  {
    "type": "detect_shape",
    "width": 640,
    "height": 480,
    "points": [{"x": 10.0, "y": 15.0}, {"x": 12.0, "y": 16.0}]
  }
  ```

#### E. Handwriting OCR Request (JSON)
- **Payload**:
  ```json
  {
    "type": "ocr_request",
    "image": "data:image/png;base64,iVBORw0..."
  }
  ```

#### F. Drawing Disk Save Request (JSON)
- **Payload**:
  ```json
  {
    "type": "save_request",
    "image": "data:image/png;base64,iVBORw0...",
    "format": "png"
  }
  ```

---

### Server-to-Client Messages

#### A. Video Tracking Response (JSON)
Sent in response to every binary video frame.
- **Payload**:
  ```json
  {
    "type": "frame_response",
    "hands": [
      {
        "label": "Right",
        "score": 0.98,
        "landmarks": [[0.5, 0.6, -0.02], ...],
        "bbox": [120, 200, 310, 420]
      }
    ],
    "gesture": "DRAW",
    "cursor": {"x": 320, "y": 240},
    "smoothed_point": {"x": 320.5, "y": 239.8},
    "fps": 30
  }
  ```

#### B. Shape Correction Output (JSON)
- **Payload**:
  ```json
  {
    "type": "shape_corrected",
    "result": {
      "type": "circle",
      "center": {"x": 200.0, "y": 150.0},
      "radius": 50.0
    }
  }
  ```

#### C. Voice Command Output (JSON)
- **Payload**:
  ```json
  {
    "type": "voice_command",
    "original_text": "use eraser",
    "command": {
      "action": "SET_TOOL",
      "value": "eraser"
    }
  }
  ```

#### D. Handwriting OCR Output (JSON)
- **Payload**:
  ```json
  {
    "type": "ocr_response",
    "text": "hello"
  }
  ```

#### E. Image Disk Save Output (JSON)
- **Payload**:
  ```json
  {
    "type": "save_response",
    "status": "success",
    "filename": "drawing_20260704_131230.png",
    "filepath": "drawings/drawing_20260704_131230.png"
  }
  ```
