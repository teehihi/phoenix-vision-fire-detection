# Development Commands

```bash
cd backend && uvicorn app.main:app --reload --port 8000
cd ai-service && uvicorn app.main:app --reload --port 8100
cd desktop-app && python run.py
```

## Publish a local video as a low-latency RTSP camera

Start MediaMTX on port `8554`, then run this command from the directory
containing the video:

```bash
ffmpeg -re -stream_loop -1 -i cam1.mp4 \
  -an -c:v libx264 -preset ultrafast -tune zerolatency \
  -g 10 -keyint_min 10 -sc_threshold 0 \
  -f rtsp -rtsp_transport tcp rtsp://localhost:8554/fire
```

Use `rtsp://localhost:8554/fire` as the camera URL. The short GOP prevents
new camera readers from waiting several seconds for the next H.264 keyframe.
