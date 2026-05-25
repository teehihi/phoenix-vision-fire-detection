import { Camera, Square } from 'lucide-react';
import { useWebcam } from '../../hooks/useWebcam';

export function WebcamPanel() {
  const { videoRef, isActive, error, start, stop } = useWebcam();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Realtime Webcam</h2>
          <p className="text-sm text-slate-500">Local camera preview for live fire detection.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          onClick={isActive ? stop : start}
        >
          {isActive ? <Square size={16} /> : <Camera size={16} />}
          {isActive ? 'Stop' : 'Start'}
        </button>
      </div>
      <div className="aspect-video overflow-hidden rounded-md bg-slate-950">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
