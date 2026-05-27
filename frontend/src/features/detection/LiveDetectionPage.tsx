import { WebcamPanel } from '../../components/detection/WebcamPanel';
import { RealtimeStreamPanel } from './RealtimeStreamPanel';

export function LiveDetectionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Live Detection</h1>
        <p className="text-sm text-slate-500">Theo dõi webcam local và stream frame đã xử lý từ YOLOv11/OpenCV.</p>
      </div>
      <RealtimeStreamPanel />
      <WebcamPanel />
    </div>
  );
}
