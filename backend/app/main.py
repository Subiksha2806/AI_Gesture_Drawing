import os
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from typing import List, Dict, Any

from app.websocket import router as ws_router
from app.save_manager import SaveManager

app = FastAPI(
    title="AI Virtual Air Canvas API",
    description="Real-time hand tracking and computer vision drawing canvas API",
    version="1.0.0"
)

# Enable CORS for the React frontend (running on Vite, typically port 5173 or others)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SaveManager and ensure drawings directory exists
save_manager = SaveManager()
os.makedirs("drawings", exist_ok=True)

# Mount the drawings folder so images, PDFs, SVGs are statically accessible via HTTP
app.mount("/static", StaticFiles(directory="drawings"), name="static")

# Include the WebSocket router
app.include_router(ws_router)

@app.get("/")
def read_root():
    """Health check endpoint."""
    return {
        "status": "online",
        "app": "AI Virtual Air Canvas Backend API",
        "version": "1.0.0"
    }

@app.get("/api/drawings")
def get_drawings():
    """Retrieves metadata of all saved drawings in the session."""
    try:
        return save_manager.list_drawings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/drawings/{filename}")
def delete_drawing(filename: str):
    """Deletes a drawing from disk."""
    try:
        success = save_manager.delete_drawing(filename)
        if not success:
            raise HTTPException(status_code=404, detail="File not found")
        return {"status": "success", "message": f"{filename} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/pdf")
def export_pdf(payload: Dict[str, str] = Body(...)):
    """
    Receives image base64, converts to PDF and saves it, 
    returning the filename and access link.
    """
    image_b64 = payload.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="Missing base64 image data")
    
    try:
        filename, filepath = save_manager.export_pdf(image_b64)
        return {
            "status": "success",
            "filename": filename,
            "url": f"/static/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/svg")
def export_svg(payload: Dict[str, Any] = Body(...)):
    """
    Receives vector paths, height and width dimensions,
    saves SVG file and returns filename, URL, and raw SVG content.
    """
    paths = payload.get("paths", [])
    width = float(payload.get("width", 800))
    height = float(payload.get("height", 600))
    
    try:
        filename, filepath, svg_content = save_manager.export_svg(paths, width, height)
        return {
            "status": "success",
            "filename": filename,
            "url": f"/static/{filename}",
            "svg_content": svg_content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
