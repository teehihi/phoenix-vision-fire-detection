import { Settings, Volume2, Globe } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import { useState, useEffect } from 'react';

export function SettingsPage() {
  const { language, setLanguage, t } = useTranslation();
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('soundEnabled') !== 'false';
  });

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('soundEnabled', String(next));
    window.dispatchEvent(new Event('sound-enabled-changed'));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">System Preferences</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">{t('nav_settings', 'Cài đặt')}</h1>
            <p className="mt-1 text-sm text-slate-500">Cấu hình ngôn ngữ, âm thanh và các thông số hệ thống.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Ngôn ngữ (Language)</h2>
              <p className="text-sm text-slate-500">Thay đổi ngôn ngữ hiển thị của hệ thống</p>
            </div>
          </div>
          
          <div className="mt-5 space-y-3">
            <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${language === 'vi' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇻🇳</span>
                <span className="font-medium text-slate-900">Tiếng Việt</span>
              </div>
              <input
                type="radio"
                name="language"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                checked={language === 'vi'}
                onChange={() => setLanguage('vi')}
              />
            </label>
            
            <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${language === 'en' ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇺🇸</span>
                <span className="font-medium text-slate-900">English</span>
              </div>
              <input
                type="radio"
                name="language"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500"
                checked={language === 'en'}
                onChange={() => setLanguage('en')}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-600">
              <Volume2 size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Âm thanh cảnh báo</h2>
              <p className="text-sm text-slate-500">Bật/tắt âm báo khẩn cấp khi phát hiện rủi ro</p>
            </div>
          </div>
          
          <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 p-4">
            <span className="font-medium text-slate-900">Âm thanh báo động (Siren)</span>
            <button 
              onClick={handleToggleSound}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${soundEnabled ? 'bg-orange-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
