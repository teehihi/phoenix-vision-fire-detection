import base64

import cv2
import numpy as np


def encode_jpeg_base64(frame: np.ndarray, quality: int = 72) -> str:
    quality = max(30, min(quality, 95))
    success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not success:
        raise ValueError("Unable to encode frame as JPEG.")
    return base64.b64encode(buffer).decode("ascii")
