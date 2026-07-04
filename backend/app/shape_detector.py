import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional

class ShapeDetector:
    """
    Detects and auto-corrects drawn shapes (Line, Circle, Square, Rectangle, Triangle, Arrow, Star)
    from a sequence of 2D coordinates.
    """
    def __init__(self, canvas_width: int = 640, canvas_height: int = 480):
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height

    def detect_and_correct(self, points: List[Tuple[float, float]]) -> Optional[Dict[str, Any]]:
        """
        Takes a list of (x, y) coordinates (normalized 0-1 or raw pixels),
        classifies the shape, and returns the parameters of the corrected shape.
        """
        if len(points) < 8:
            return None

        # Convert to numpy array
        # Handle both list of dicts [{"x": ..., "y": ...}] and list of tuples/lists [[x, y]]
        if isinstance(points[0], dict):
            pts_list = [[float(p.get("x", 0.0)), float(p.get("y", 0.0))] for p in points]
        else:
            pts_list = points
            
        pts = np.array(pts_list, dtype=np.float32)

        # If points are normalized, scale them to canvas dimensions
        if np.max(pts) <= 1.05:
            pts[:, 0] *= self.canvas_width
            pts[:, 1] *= self.canvas_height

        pts = pts.astype(np.int32)

        # 1. Check if it's a Line first (simplest case)
        # Check the ratio of start-to-end distance to total path distance
        start_pt = pts[0]
        end_pt = pts[-1]
        direct_dist = np.linalg.norm(end_pt - start_pt)
        total_path_dist = sum(np.linalg.norm(pts[i] - pts[i-1]) for i in range(1, len(pts)))
        
        if total_path_dist > 0 and (direct_dist / total_path_dist) > 0.88:
            return {
                "type": "line",
                "points": [
                    {"x": float(start_pt[0]), "y": float(start_pt[1])},
                    {"x": float(end_pt[0]), "y": float(end_pt[1])}
                ]
            }

        # 2. Render path on a binary image for contour analysis
        # Create a bounding box around the points to crop and center it
        x, y, w, h = cv2.boundingRect(pts)
        padding = 20
        # Draw on an image slightly larger than the bounding box
        mask_w, mask_h = w + padding * 2, h + padding * 2
        mask = np.zeros((mask_h, mask_w), dtype=np.uint8)

        # Offset points to fit inside the mask
        offset_pts = pts - [x - padding, y - padding]
        cv2.polylines(mask, [offset_pts], isClosed=True, color=255, thickness=4)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None

        contour = contours[0]
        
        # Compute geometric properties
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        if perimeter == 0:
            return None

        circularity = 4 * np.pi * area / (perimeter ** 2)
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0

        # Polygon approximation
        # Try different epsilon values to find a good polygonal fit
        epsilon = 0.03 * perimeter
        approx = cv2.approxPolyDP(contour, epsilon, True)
        num_vertices = len(approx)

        # Shift approx vertices back to original canvas coordinates
        orig_approx = approx + [x - padding, y - padding]
        orig_approx = orig_approx.reshape(-1, 2)

        # Centroid (center of mass)
        M = cv2.moments(contour)
        if M["m00"] > 0:
            cx = int(M["m10"] / M["m00"]) + (x - padding)
            cy = int(M["m01"] / M["m00"]) + (y - padding)
        else:
            cx, cy = int(np.mean(pts[:, 0])), int(np.mean(pts[:, 1]))

        # --- SHAPE CLASSIFICATION HEURISTICS ---

        # A. Circle
        # High circularity, high solidity
        if 0.72 <= circularity <= 1.25 and solidity > 0.85:
            # Radius is the average distance from centroid to all points
            distances = [np.linalg.norm(p - np.array([cx, cy])) for p in pts]
            r = float(np.mean(distances))
            return {
                "type": "circle",
                "center": {"x": float(cx), "y": float(cy)},
                "radius": r
            }

        # B. Star
        # Stars have low solidity (typically 0.55 - 0.75) because of the deep valleys
        # Let's count convexity defects. A star has 5 outer peaks and 5 valleys (convexity defects)
        # Find hull with returnPoints=False for convexity defects
        hull_indices = cv2.convexHull(contour, returnPoints=False)
        defects = None
        if len(hull_indices) >= 3:
            try:
                defects = cv2.convexityDefects(contour, hull_indices)
            except cv2.error:
                pass
        
        num_defects = 0
        if defects is not None:
            # Filter defects by depth
            for i in range(defects.shape[0]):
                s, e, f, d = defects[i, 0]
                depth = d / 256.0
                if depth > 10:  # Threshold for valid valley depth in pixels
                    num_defects += 1

        # Check if solidity is low and defects are around 4-6
        if solidity < 0.82 and (4 <= num_defects <= 6 or num_vertices >= 8):
            # Perfect 5-pointed star centered at cx, cy
            distances = [np.linalg.norm(p - np.array([cx, cy])) for p in pts]
            outer_r = float(np.max(distances))
            inner_r = outer_r * 0.4  # Classic star ratio
            
            star_points = []
            # Calculate 10 points of the star (5 outer, 5 inner)
            for i in range(10):
                angle = i * np.pi / 5 - np.pi / 2
                r = outer_r if i % 2 == 0 else inner_r
                px = cx + r * np.cos(angle)
                py = cy + r * np.sin(angle)
                star_points.append({"x": float(px), "y": float(py)})

            return {
                "type": "star",
                "points": star_points
            }

        # C. Triangle
        if num_vertices == 3 or (num_vertices == 4 and solidity > 0.9):
            # If 4 vertices, we can check if it looks like a triangle (one small side or close vertices)
            if num_vertices == 4:
                # Find the two closest vertices and average them
                dists = [np.linalg.norm(orig_approx[i] - orig_approx[(i+1)%4]) for i in range(4)]
                min_idx = np.argmin(dists)
                merged = (orig_approx[min_idx] + orig_approx[(min_idx+1)%4]) / 2
                tri_pts = []
                for j in range(4):
                    if j == min_idx:
                        tri_pts.append(merged)
                    elif j == (min_idx+1)%4:
                        continue
                    else:
                        tri_pts.append(orig_approx[j])
                orig_approx = np.array(tri_pts)

            return {
                "type": "triangle",
                "points": [{"x": float(p[0]), "y": float(p[1])} for p in orig_approx]
            }

        # D. Square / Rectangle
        if num_vertices == 4:
            # Let's align it nicely (perpendicular/horizontal)
            # Find the bounding box corners
            rx, ry, rw, rh = cv2.boundingRect(contour)
            # Center of the box
            bcx, bcy = rx + rw/2 + (x - padding), ry + rh/2 + (y - padding)
            
            # Check aspect ratio to determine if Square or Rectangle
            aspect_ratio = rw / rh
            is_square = 0.82 <= aspect_ratio <= 1.22
            
            if is_square:
                side = max(rw, rh)
                half = side / 2
                rect_pts = [
                    {"x": float(bcx - half), "y": float(bcy - half)},
                    {"x": float(bcx + half), "y": float(bcy - half)},
                    {"x": float(bcx + half), "y": float(bcy + half)},
                    {"x": float(bcx - half), "y": float(bcy + half)}
                ]
                return {
                    "type": "square",
                    "points": rect_pts
                }
            else:
                rect_pts = [
                    {"x": float(bcx - rw/2), "y": float(bcy - rh/2)},
                    {"x": float(bcx + rw/2), "y": float(bcy - rh/2)},
                    {"x": float(bcx + rw/2), "y": float(bcy + rh/2)},
                    {"x": float(bcx - rw/2), "y": float(bcy + rh/2)}
                ]
                return {
                    "type": "rectangle",
                    "points": rect_pts
                }

        # E. Arrow
        # Arrow: long shaft with a point. Often has 7 vertices.
        # Let's detect it if vertices are 5 to 8 and solidity is moderate
        if 5 <= num_vertices <= 8 and 0.65 <= solidity <= 0.85:
            # We can find the start point (tail of arrow) and end point (head of arrow)
            # Usually the user draws from tail to head or vice versa.
            # End point is close to the arrow tip. Let's find the point furthest from start.
            start_p = pts[0]
            end_p = pts[-1]
            
            # Perfected Arrow has: shaft start, shaft end, and arrowhead wings
            # We assume it's drawn from start_p (tail) to end_p (tip)
            dx = float(end_p[0] - start_p[0])
            dy = float(end_p[1] - start_p[1])
            length = np.sqrt(dx**2 + dy**2)
            
            if length > 20:
                ux, uy = dx/length, dy/length
                # Arrowhead wings size
                head_len = min(25.0, length * 0.3)
                # Wings angles (30 degrees from shaft)
                wing_angle = np.pi / 6
                
                # Backwards unit vector
                bx, by = -ux, -uy
                
                # Left wing
                lx = end_p[0] + head_len * (bx * np.cos(wing_angle) - by * np.sin(wing_angle))
                ly = end_p[1] + head_len * (bx * np.sin(wing_angle) + by * np.cos(wing_angle))
                
                # Right wing
                rx_wing = end_p[0] + head_len * (bx * np.cos(-wing_angle) - by * np.sin(-wing_angle))
                ry_wing = end_p[1] + head_len * (bx * np.sin(-wing_angle) + by * np.cos(-wing_angle))

                return {
                    "type": "arrow",
                    "points": [
                        {"x": float(start_p[0]), "y": float(start_p[1])}, # Tail
                        {"x": float(end_p[0]), "y": float(end_p[1])},     # Tip
                        {"x": float(lx), "y": float(ly)},                 # Left wing
                        {"x": float(rx_wing), "y": float(ry_wing)}        # Right wing
                    ]
                }

        # Fallback: if it has 5-6 corners but doesn't map to anything specific, check if it fits rectangle
        if 4 <= num_vertices <= 6:
            # Return rectangle as fallback for shapes that look rectangular
            rx, ry, rw, rh = cv2.boundingRect(contour)
            bcx, bcy = rx + rw/2 + (x - padding), ry + rh/2 + (y - padding)
            return {
                "type": "rectangle",
                "points": [
                    {"x": float(bcx - rw/2), "y": float(bcy - rh/2)},
                    {"x": float(bcx + rw/2), "y": float(bcy - rh/2)},
                    {"x": float(bcx + rw/2), "y": float(bcy + rh/2)},
                    {"x": float(bcx - rw/2), "y": float(bcy + rh/2)}
                ]
            }

        return None
