# AI Virtual Air Canvas (AI Air Studio)

A production-ready, real-time AI-powered virtual drawing board that lets you draw in the air using hand gestures captured via your webcam. Featuring shape auto-correction, speech voice controls, handwriting OCR, glassmorphism UI, and high-fidelity vector exports.

---

## Technical Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend**: Python 3.11+, FastAPI, WebSockets
- **Computer Vision & AI**: OpenCV, MediaPipe Hands, NumPy
- **OCR Engine**: Tesseract OCR (with online API fallback)
- **Deployment**: Docker, Docker Compose, GitHub Actions

---

## Key Features

1. **High-Precision Hand Tracking**: Low-latency MediaPipe skeletal joints estimation running in a pipelined WebSocket loop.
2. **Gesture-Driven Drawing Studio**:
   - **One Finger (Index)**: Draw strokes.
   - **Two Fingers (Close)**: Move cursor without drawing.
   - **Peace Sign (Two Fingers Spread)**: Erase canvas lines.
   - **Pinch (Index + Thumb)**: Hover and pinch to click buttons.
   - **Open Palm**: Pause tracking updates.
   - **Thumb Up**: Quick-save canvas image.
   - **Closed Fist**: Shows clear canvas prompt.
3. **Advanced Brush Styles**: Pencil (solid fine), Marker (translucent), Neon (glowing shadow), and Calligraphy (velocity/angle-sensitive width).
4. **Smart Shape Auto-Correction**: Automatically simplifies hand-drawn squiggles into perfected Lines, Circles, Squares, Rectangles, Triangles, Stars, and Arrows.
5. **Speech Command Assistant**: Control properties using browser voice recognition (e.g. say "switch to marker", "change color to blue", "brush size twenty", "undo").
6. **Handwriting Recognition**: Crop drawings and transcribe characters using Tesseract OCR or public API backup.
7. **Vector and Document Exports**: Export files directly to PNG, JPG, PDF, or SVG vector code.

---

## Installation & Running

### Option A: Local Dev Servers (Recommended for dev)

#### 1. Setup Backend
You need Python 3.11+ installed.
```bash
# Navigate to backend and create virtual env
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server (runs on port 8000)
uvicorn app.main:app --reload
```

*Note on Tesseract (Optional)*: To run OCR fully offline, install [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) on your computer and make sure it is added to your system environment variables PATH. If not found, the app automatically falls back to an online trial API key (zero configuration required!).

#### 2. Setup Frontend
You need Node.js v20+ and npm installed.
```bash
# Navigate to frontend and install dependencies
cd ../frontend
npm install

# Start Vite dev server (runs on port 5173)
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser!

---

### Option B: Docker Compose (One-Command Launch)

You can build and run the entire stack inside Docker containers.
Make sure you have Docker and Docker Compose installed.
```bash
# Run from the root folder
docker-compose up --build
```
This maps:
- Frontend Client: [http://localhost:5173](http://localhost:5173)
- Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

*Note*: Inside Docker, the backend container includes a fully pre-installed local `tesseract-ocr` installation, meaning offline OCR works 100% out of the box!

---

## Project Structure

```
AI_Canva/
├── backend/            # FastAPI router, websocket server, CV engines, PyTest suite
├── frontend/           # React SPA, custom hooks, canvas drawing components, Tailwind CSS
├── docs/               # System architecture and API endpoint documentation
├── docker-compose.yml  # Deployment orchestration configuration
└── README.md           # Getting started overview
```
For deep-dives into system designs and protocols, see:
- [docs/architecture.md](file:///C:/Users/Acer%20one/OneDrive/Desktop/AI_Canva/docs/architecture.md)
- [docs/api.md](file:///C:/Users/Acer%20one/OneDrive/Desktop/AI_Canva/docs/api.md)
