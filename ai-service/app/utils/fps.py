from collections import deque
from time import perf_counter


class FPSCounter:
    def __init__(self, window_size: int = 30) -> None:
        self.window_size = window_size
        self.timestamps: deque[float] = deque(maxlen=window_size)

    def update(self) -> float:
        now = perf_counter()
        self.timestamps.append(now)

        if len(self.timestamps) < 2:
            return 0.0

        elapsed = self.timestamps[-1] - self.timestamps[0]
        if elapsed <= 0:
            return 0.0

        return (len(self.timestamps) - 1) / elapsed
