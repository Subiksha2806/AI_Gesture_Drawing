import os
import re
import io
import time
import base64
from PIL import Image
from typing import List, Dict, Any, Tuple, Optional

class SaveManager:
    """
    Manages saving and exporting drawings to disk as PNG, JPG, PDF, or SVG.
    Also handles drawing history and session exports.
    """
    def __init__(self, base_dir: str = "drawings"):
        self.base_dir = base_dir
        # Create output directory if it doesn't exist
        os.makedirs(self.base_dir, exist_ok=True)

    def _decode_base64_image(self, base64_str: str) -> bytes:
        """Helper to decode base64 image strings (handles data URI schemes)."""
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        return base64.b64decode(base64_str)

    def save_image(self, base64_data: str, format_type: str = "png") -> Tuple[str, str]:
        """
        Saves a base64 encoded image as PNG or JPG.
        Returns a tuple of (file_name, file_path).
        """
        format_type = format_type.lower()
        if format_type not in ["png", "jpg", "jpeg"]:
            format_type = "png"

        img_bytes = self._decode_base64_image(base64_data)
        image = Image.open(io.BytesIO(img_bytes))

        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"drawing_{timestamp}.{format_type}"
        filepath = os.path.join(self.base_dir, filename)

        if format_type in ["jpg", "jpeg"]:
            # JPG requires converting RGBA to RGB
            if image.mode == 'RGBA':
                rgb_image = Image.new("RGB", image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[3])
                rgb_image.save(filepath, "JPEG", quality=95)
            else:
                image.save(filepath, "JPEG", quality=95)
        else:
            image.save(filepath, "PNG")

        return filename, filepath

    def export_pdf(self, base64_data: str) -> Tuple[str, str]:
        """
        Converts a base64 encoded image to a PDF file.
        Returns a tuple of (file_name, file_path).
        """
        img_bytes = self._decode_base64_image(base64_data)
        image = Image.open(io.BytesIO(img_bytes))

        # Convert to RGB (required for PDF)
        if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
            rgb_image = Image.new("RGB", image.size, (255, 255, 255))
            # If RGBA, use alpha channel as mask
            if image.mode == 'RGBA':
                rgb_image.paste(image, mask=image.split()[3])
            else:
                rgb_image.paste(image)
        else:
            rgb_image = image.convert("RGB")

        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"drawing_{timestamp}.pdf"
        filepath = os.path.join(self.base_dir, filename)
        
        rgb_image.save(filepath, "PDF")
        return filename, filepath

    def export_svg(self, paths: List[Dict[str, Any]], width: float, height: float) -> Tuple[str, str, str]:
        """
        Compiles vector drawing paths from the client into a clean SVG file.
        Returns a tuple of (file_name, file_path, svg_content).
        
        `paths` is a list of strokes:
        [
          {
            "points": [{"x": 10, "y": 20}, ...],
            "color": "#ff0000",
            "size": 5,
            "opacity": 0.8,
            "tool": "pencil" // or "marker", "neon", "calligraphy", "eraser"
          },
          ...
        ]
        """
        # Start SVG document
        svg_lines = [
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%">',
            '  <!-- Background -->',
            f'  <rect width="{width}" height="{height}" fill="none"/>',
            '  <!-- Drawing Paths -->'
        ]

        for i, path in enumerate(paths):
            pts = path.get("points", [])
            if not pts:
                continue

            color = path.get("color", "#000000")
            size = path.get("size", 5)
            opacity = path.get("opacity", 1.0)
            tool = path.get("tool", "pencil")

            # Handle eraser styling in SVG (uses destination-out mask, or white line as fallback)
            stroke_color = color
            if tool == "eraser":
                stroke_color = "#ffffff"  # simple white stroke overlay

            # Formulate the SVG Path 'd' attribute: M x0 y0 L x1 y1 ...
            d_parts = []
            d_parts.append(f"M {pts[0]['x']:.1f} {pts[0]['y']:.1f}")
            for p in pts[1:]:
                d_parts.append(f"L {p['x']:.1f} {p['y']:.1f}")
            d_attr = " ".join(d_parts)

            # Extra effects for neon brush
            neon_filter = ""
            if tool == "neon":
                svg_lines.append(
                    f'  <filter id="neon-glow-{i}" x="-50%" y="-50%" width="200%" height="200%">'
                    f'    <feGaussianBlur stdDeviation="{size/1.5}" result="blur" />'
                    f'    <feMerge>'
                    f'      <feMergeNode in="blur" />'
                    f'      <feMergeNode in="SourceGraphic" />'
                    f'    </feMerge>'
                    f'  </filter>'
                )
                neon_filter = f' filter="url(#neon-glow-{i})"'

            path_tag = (
                f'  <path d="{d_attr}"'
                f' fill="none"'
                f' stroke="{stroke_color}"'
                f' stroke-width="{size}"'
                f' stroke-opacity="{opacity}"'
                f' stroke-linecap="round"'
                f' stroke-linejoin="round"'
                f'{neon_filter}'
                f' />'
            )
            svg_lines.append(path_tag)

        svg_lines.append('</svg>')
        svg_content = "\n".join(svg_lines)

        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"drawing_{timestamp}.svg"
        filepath = os.path.join(self.base_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg_content)

        return filename, filepath, svg_content

    def list_drawings(self) -> List[Dict[str, Any]]:
        """Lists all files in the drawings directory with size and timestamp metadata."""
        files = []
        if not os.path.exists(self.base_dir):
            return files

        for fname in os.listdir(self.base_dir):
            fpath = os.path.join(self.base_dir, fname)
            if os.path.isfile(fpath):
                stat = os.stat(fpath)
                # Determine file format from extension
                _, ext = os.path.splitext(fname)
                fmt = ext.replace(".", "").upper()
                
                files.append({
                    "filename": fname,
                    "format": fmt,
                    "size_bytes": stat.st_size,
                    "created_at": stat.st_mtime
                })
        
        # Sort by creation time descending (newest first)
        files.sort(key=lambda x: x["created_at"], reverse=True)
        return files

    def delete_drawing(self, filename: str) -> bool:
        """Deletes a drawing from disk. Prevents path traversal vulnerabilities."""
        # Sanitize filename to prevent directory traversal
        sanitized = os.path.basename(filename)
        filepath = os.path.join(self.base_dir, sanitized)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
