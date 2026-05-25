import cv2
import numpy as np


def encode_jpeg(frame: np.ndarray) -> bytes:
    success, buffer = cv2.imencode(".jpg", frame)
    if not success:
        raise ValueError("Unable to encode frame as JPEG.")
    return buffer.tobytes()
