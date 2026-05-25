import { WebcamPanel } from '../../components/detection/WebcamPanel';

export function LiveDetectionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Live Detection</h1>
        <p className="text-sm text-slate-500">Stream webcam frames into the YOLO/OpenCV detection pipeline.</p>
      </div>
      <WebcamPanel />
    </div>
  );
}
