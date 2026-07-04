import cv2
import numpy as np
import base64
import urllib.request
import urllib.parse
import json
import logging
from PIL import Image
import io

try:
    import pytesseract
except ImportError:
    pytesseract = None

logger = logging.getLogger(__name__)

class HandwritingRecognizer:
    """
    Recognizes handwritten text from drawing canvas images.
    Combines local Tesseract OCR with an online API fallback to ensure it works out of the box.
    """
    def __init__(self, tesseract_cmd: str = None):
        if tesseract_cmd and pytesseract:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    def preprocess_canvas(self, img_bytes: bytes) -> Tuple[np.ndarray, bytes]:
        """
        Decodes raw image bytes, converts them to high-contrast black text on a white background,
        crops the image to the bounding box of the strokes, and returns the processed image
        and its JPEG encoded bytes.
        """
        # Decode image
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        
        if img is None:
            raise ValueError("Invalid image bytes provided.")

        # Handle alpha channel (transparent canvas)
        if img.shape[2] == 4:
            # Create white background
            alpha = img[:, :, 3] / 255.0
            bg = np.ones_like(img[:, :, :3]) * 255
            for c in range(3):
                img[:, :, c] = (img[:, :, c] * alpha + bg[:, :, c] * (1.0 - alpha)).astype(np.uint8)
            img = img[:, :, :3]

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Binarization (invert colors if drawing was light lines on dark background)
        # Standardize to black strokes (0) on white background (255)
        mean_val = np.mean(gray)
        if mean_val < 127:  # Dark background, light strokes
            _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)
        else:  # Light background, dark strokes
            _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

        # Crop to bounding box of black pixels (the text)
        coords = cv2.findNonZero(cv2.bitwise_not(thresh))
        if coords is not None:
            x, y, w, h = cv2.boundingRect(coords)
            # Add padding
            pad = 10
            x_min = max(0, x - pad)
            y_min = max(0, y - pad)
            x_max = min(img.shape[1], x + w + pad)
            y_max = min(img.shape[0], y + h + pad)
            
            cropped = thresh[y_min:y_max, x_min:x_max]
            # Resize slightly to make text larger for OCR
            h_c, w_c = cropped.shape
            if h_c > 0 and w_c > 0:
                cropped = cv2.resize(cropped, (w_c * 2, h_c * 2), interpolation=cv2.INTER_CUBIC)
                thresh = cropped

        # Encode processed image back to JPEG bytes
        _, encoded_img = cv2.imencode('.jpg', thresh)
        return thresh, encoded_img.tobytes()

    def recognize_text(self, img_bytes: bytes) -> str:
        """
        Orchestrates OCR on canvas image bytes.
        Tries local Tesseract first; falls back to free OCR.Space API if Tesseract fails/is missing.
        """
        try:
            processed_img, processed_bytes = self.preprocess_canvas(img_bytes)
        except Exception as e:
            logger.error(f"Preprocessing error: {e}")
            return ""

        text = ""
        # 1. Try PyTesseract locally
        if pytesseract:
            try:
                pil_img = Image.open(io.BytesIO(processed_bytes))
                # Page Segmentation Mode (PSM) 6: Assume a single uniform block of text.
                text = pytesseract.image_to_string(pil_img, config='--psm 6').strip()
                if text:
                    logger.info("OCR successfully completed using local PyTesseract.")
                    return text
            except Exception as e:
                logger.warning(f"Local PyTesseract failed (likely Tesseract binary not on PATH): {e}")

        # 2. Online API Fallback (OCR.space free endpoint)
        # Using built-in urllib to keep it zero-dependency
        try:
            logger.info("Attempting online OCR API fallback...")
            base64_data = base64.b64encode(processed_bytes).decode('utf-8')
            payload = {
                'apikey': 'helloworld',  # OCR.space public free trial key
                'language': 'eng',
                'isOverlayRequired': 'false',
                'base64Image': f"data:image/jpeg;base64,{base64_data}"
            }
            
            data = urllib.parse.urlencode(payload).encode('utf-8')
            req = urllib.request.Request(
                "https://api.ocr.space/parse/image",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            with urllib.request.urlopen(req, timeout=8) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                if res_data.get("OCRExitCode") == 1:
                    parsed_results = res_data.get("ParsedResults", [])
                    if parsed_results:
                        text = parsed_results[0].get("ParsedText", "").strip()
                        if text:
                            logger.info("OCR successfully completed using online API.")
                            return text
                else:
                    logger.error(f"OCR.space API Error: {res_data.get('ErrorMessage')}")
        except Exception as e:
            logger.error(f"Online OCR fallback failed: {e}")

        # 3. Simple offline heuristic fallback (if all else fails, return a friendly placeholder or empty)
        # Since handwriting in the air is hard, let's return a default notice or attempt to guess if empty
        return text if text else ""
