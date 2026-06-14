import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, X, Camera, BarChart3 } from 'lucide-react';

export type FullscreenImageDetails = {
  title: string;
  cameraId: string;
  cameraName?: string;
  location?: string;
  zone?: string;
  riskLevel: string;
  riskScore?: number;
  confidence?: number;
  time: string;
  description: string;
  humanAtRisk?: boolean;
};

interface ImageFullscreenModalProps {
  src: string;
  details?: FullscreenImageDetails | null;
  onClose: () => void;
}

export function ImageFullscreenModal({ src, details, onClose }: ImageFullscreenModalProps) {
  const riskTone: Record<string, string> = {
    LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
    HIGH: 'border-orange-200 bg-orange-50 text-orange-700',
    CRITICAL: 'border-red-200 bg-red-50 text-red-700'
  };

  const statusLabel: Record<string, string> = {
    LOW: 'Nguy cơ thấp',
    MEDIUM: 'Cần chú ý',
    HIGH: 'Nguy cơ cao',
    CRITICAL: 'Nguy hiểm khẩn cấp'
  };

  const upperRiskLevel = details?.riskLevel?.toUpperCase() ?? 'LOW';

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-slate-950/60 p-4 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 20 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex h-full max-h-[85vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Chi tiết sự cố</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">{details?.title ?? 'Ảnh chụp sự cố'}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Camera size={12} />
                {details?.cameraName || details?.cameraId}
              </span>
              {details?.location ? (
                <>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span>{details.location}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {details ? (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskTone[upperRiskLevel] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                {statusLabel[upperRiskLevel] || details.riskLevel}
              </span>
            ) : null}
            {details?.humanAtRisk ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                <AlertTriangle size={12} className="animate-bounce" />
                Có người gặp nguy
              </span>
            ) : null}
            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid min-h-0 flex-1 bg-slate-100 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Left: Image Container */}
          <div className="flex min-h-0 flex-col items-center justify-center bg-slate-950 p-4 relative">
            <img
              src={src}
              alt={details?.title ?? "Incident snapshot"}
              className="max-h-[55vh] lg:max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
            />
          </div>

          {/* Right: Detailed Sidebar */}
          {details ? (
            <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0 flex flex-col justify-between gap-5 text-slate-900">
              <div className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 flex items-center gap-1">
                      <BarChart3 size={12} />
                      Mức rủi ro
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {details.riskScore != null ? `${details.riskScore.toFixed(0)}/100` : '--'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      Độ tin cậy
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {details.confidence != null ? `${(details.confidence * 100).toFixed(0)}%` : '--'}
                    </p>
                  </div>
                </div>

                {/* Location & Time info box */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Vị trí lắp đặt</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        {details.location ? `${details.location}${details.zone ? ` · ${details.zone}` : ''}` : 'Không có thông tin'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock size={15} className="mt-0.5 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Thời gian ghi nhận</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-700 leading-4">{details.time}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Nội dung sự kiện</p>
                  <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                    {details.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-orange-600 py-3 text-xs font-semibold text-white shadow-sm shadow-orange-600/20 hover:bg-orange-700 transition active:scale-95 cursor-pointer mt-4"
              >
                Đóng bảng chi tiết
              </button>
            </aside>
          ) : (
            <aside className="min-h-0 border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0 flex flex-col justify-end text-slate-900">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
              >
                Đóng xem ảnh
              </button>
            </aside>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
