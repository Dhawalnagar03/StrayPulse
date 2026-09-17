"""
Computer Vision service.
Architecture is modular — real YOLO weights can be loaded when available.
Falls back to simulation for development without GPU/model weights.
"""

import logging
import os
from typing import Optional, List, Tuple, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)

_yolo_model = None
_YOLO_AVAILABLE = False

try:
    from ultralytics import YOLO
    _YOLO_AVAILABLE = True
except ImportError:
    logger.warning("Ultralytics YOLO not installed. CV will run in simulation mode.")


def _load_yolo():
    global _yolo_model
    if _yolo_model is None and _YOLO_AVAILABLE:
        model_path = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
        try:
            _yolo_model = YOLO(model_path)
            logger.info(f"YOLO model loaded from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load YOLO: {e}. Using simulation.")
    return _yolo_model


async def detect_animal(image_bytes: bytes) -> Dict[str, Any]:
    """
    Detect animal in image.
    Returns:
        {
            "animal_detected": bool,
            "animal_type": "Dog" | "Cat" | "Other" | "Unknown",
            "confidence": float,
            "bbox": [x1, y1, x2, y2] | None,
            "cropped_image": bytes | None,
            "source": "yolo" | "simulated"
        }
    """
    model = _load_yolo()

    if model is not None:
        return await _detect_with_yolo(model, image_bytes)
    else:
        return _simulate_detection()


async def _detect_with_yolo(model, image_bytes: bytes) -> Dict[str, Any]:
    import numpy as np
    import cv2

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    results = model(img, verbose=False)

    # YOLO COCO classes for animals
    DOG_CLASS = 16
    CAT_CLASS = 15
    ANIMAL_CLASSES = {DOG_CLASS: "Dog", CAT_CLASS: "Cat"}
    OTHER_ANIMALS = {17, 18, 19, 20, 21, 22, 23}  # horse, sheep, cow, etc.

    best_conf = 0.0
    best_type = "Unknown"
    best_bbox = None

    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            if conf > best_conf:
                if cls_id in ANIMAL_CLASSES:
                    best_conf = conf
                    best_type = ANIMAL_CLASSES[cls_id]
                    best_bbox = box.xyxy[0].tolist()
                elif cls_id in OTHER_ANIMALS:
                    best_conf = conf
                    best_type = "Other"
                    best_bbox = box.xyxy[0].tolist()

    if best_conf < 0.3:
        return {"animal_detected": False, "animal_type": "Unknown", "confidence": 0.0,
                "bbox": None, "cropped_image": None, "source": "yolo"}

    # Crop image
    cropped = None
    if best_bbox:
        x1, y1, x2, y2 = [int(v) for v in best_bbox]
        crop = img[y1:y2, x1:x2]
        _, buf = cv2.imencode(".jpg", crop)
        cropped = buf.tobytes()

    return {
        "animal_detected": True,
        "animal_type": best_type,
        "confidence": best_conf,
        "bbox": best_bbox,
        "cropped_image": cropped,
        "source": "yolo",
    }


def _simulate_detection() -> Dict[str, Any]:
    """Simulated detection for development without YOLO weights."""
    import random
    types = ["Dog", "Dog", "Dog", "Cat", "Cat", "Other"]
    atype = random.choice(types)
    return {
        "animal_detected": True,
        "animal_type": atype,
        "confidence": round(random.uniform(0.75, 0.97), 2),
        "bbox": [50, 50, 300, 300],
        "cropped_image": None,
        "source": "simulated",
    }


async def extract_features(image_bytes: bytes) -> Optional[List[float]]:
    """
    Extract a feature vector from the animal crop for re-identification.
    Architecture placeholder — real model (ResNet50/OSNet) to be added.
    Returns a 128-dim mock feature vector for now.
    """
    import hashlib
    import struct

    # Deterministic pseudo-features from image hash
    digest = hashlib.sha256(image_bytes).digest()
    features = []
    for i in range(0, 128 * 4, 4):
        val = struct.unpack("f", digest[i % len(digest): (i % len(digest)) + 4])[0]
        features.append(val)
    # Normalize
    norm = sum(v ** 2 for v in features) ** 0.5 or 1
    return [v / norm for v in features]


async def match_animal(
    query_features: List[float],
    candidate_features: List[Tuple[str, List[float]]],
    threshold: float = 0.85,
) -> List[Dict[str, Any]]:
    """
    Compare query feature vector against candidate animals.
    Returns ranked list of matches above threshold.
    """
    import math

    def cosine_sim(a, b):
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x ** 2 for x in a)) or 1
        nb = math.sqrt(sum(x ** 2 for x in b)) or 1
        return dot / (na * nb)

    matches = []
    for animal_id, feats in candidate_features:
        sim = cosine_sim(query_features, feats)
        if sim >= threshold:
            matches.append({"animal_id": animal_id, "similarity_score": round(sim, 3)})

    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    return matches[:5]
