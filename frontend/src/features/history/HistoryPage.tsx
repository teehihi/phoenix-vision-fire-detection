import { IncidentTimeline } from './IncidentTimeline';
import { useTranslation } from '../../lib/i18n';

export function HistoryPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">{t('history_title', 'Lịch sử phát hiện')}</h1>
        <p className="text-sm text-slate-500">{t('history_subtitle', 'Xem lại các sự kiện đã được AI ghi nhận')}</p>
      </div>
      <IncidentTimeline />
    </div>
  );
}
