import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Language = 'vi' | 'en';

const translations = {
  vi: {
    nav_dashboard: 'Quản lý Camera',
    nav_statistics: 'Thống kê',
    nav_history: 'Lịch sử',
    nav_alerts: 'Cảnh báo',
    nav_settings: 'Cài đặt',
    nav_logout: 'Đăng xuất',
    account: 'XIN CHÀO',
    
    project_title: 'Đề tài: Xây dựng hệ thống cảnh báo cháy thông minh sử dụng YOLO và xử lý ảnh thời gian thực',
    project_group: 'Nhóm 9',
    project_advisor: 'GVHD: PGS.TS Hoàng Văn Dũng',

    stat_risk_level: 'Mức độ rủi ro',
    stat_risk_score: 'Điểm rủi ro',
    stat_fire: 'Lửa',
    stat_smoke: 'Khói',
    stat_human: 'Người',
    stat_duration: 'Thời lượng',
    stat_consistency: 'Độ ổn định',
    stat_nearby: 'Người xung quanh',
    
    status_normal: 'BÌNH THƯỜNG',
    status_normal_desc: 'Hệ thống hoạt động ổn định',
    status_warning: 'CẢNH BÁO',
    status_warning_desc: 'Có dấu hiệu bất thường',
    status_danger: 'NGUY HIỂM',
    status_danger_desc: 'Phát hiện cháy/khói',
    status_critical: 'NGHIÊM TRỌNG',
    status_critical_desc: 'Cháy lớn, sơ tán khẩn cấp',

    history_title: 'Lịch sử phát hiện',
    history_subtitle: 'Xem lại các sự kiện đã được AI ghi nhận',
    history_clear: 'Xoá lịch sử',
    
    alerts_title: 'Danh sách Cảnh báo',
    alerts_subtitle: 'Các báo động cần xử lý',
    alerts_ack: 'Xác nhận',
    alerts_resolve: 'Giải quyết',
    alerts_cleared: 'Đã xử lý',

    dash_title: 'Bảng Thống kê Cảnh báo cháy sớm AI',
    dash_subtitle: 'Giám sát theo thời gian thực, đánh giá mức độ rủi ro, theo dõi tình trạng khẩn cấp và xem lại lịch sử các sự kiện dành cho ban quản lý toà nhà.',
    dash_current_posture: 'Trạng thái hiện tại',
    dash_trigger_alert: 'Báo cháy',
    dash_reset_safe: 'Trở về An toàn',
    dash_camera_feed: 'Dữ liệu Camera thời gian thực',
    dash_live: 'TRỰC TIẾP',
    dash_danger_zone: 'KHU VỰC NGUY HIỂM',
    dash_sys_status: 'TRẠNG THÁI HỆ THỐNG',
    dash_human_danger: 'Phát hiện có người trong khu vực cháy',
    dash_fire_evacuate: 'CHÁY LỚN CẦN SƠ TÁN KHẨN CẤP',
    dash_high_risk: 'Phát hiện nguy cơ cháy nổ cao',
    dash_normal: 'Hoạt động bình thường - An toàn',
    dash_alerts_title: 'Thông báo Khẩn cấp',
    dash_alerts_desc_danger: 'Có các cảnh báo chưa được xử lý.',
    dash_alerts_desc_safe: 'Không có báo động mới.',
    dash_evidence_title: 'Bằng chứng Camera',
    dash_evidence_desc: 'Hình ảnh tự động cắt từ camera giám sát.',
    dash_integrity_title: 'Hoạt động hệ thống',
    dash_integrity_desc_on: 'Camera stream, Server và hệ thống AI vẫn đang hoạt động tốt.',
    dash_integrity_desc_off: 'Đã mất kết nối server.',
    dash_risk_gauge_title: 'Biểu đồ rủi ro',
    dash_risk_gauge_desc: 'Đánh giá dựa trên diện tích, thời lượng và số người.',
    dash_timeline_title: 'Dòng sự kiện',
    dash_timeline_empty: 'Chưa có sự kiện timeline nào được ghi nhận.',
    
    stat_fire_conf: 'Tỉ lệ Lửa (Fire Confidence)',
    stat_hazard_detected: 'phát hiện nguy hiểm',
    stat_stable: 'hoạt động ổn định',
    stat_smoke_dens: 'Mật độ Khói (Smoke Density)',
    stat_spread: 'lan toả',
    stat_no_smoke: 'không có khói',
    stat_human_nearby: 'Người xung quanh (Humans Nearby)',
    stat_human_risk: '1 người vùng nguy hiểm',
    stat_safe: 'an toàn',
    stat_ai_latency: 'Độ trễ AI (AI Latency)',
  },
  en: {
    nav_dashboard: 'Camera Management',
    nav_statistics: 'Statistics',
    nav_history: 'History',
    nav_alerts: 'Alerts',
    nav_settings: 'Settings',
    nav_logout: 'Logout',
    account: 'HELLO',
    
    project_title: 'Project: Smart Fire Warning System using YOLO and Real-time Image Processing',
    project_group: 'Group 9',
    project_advisor: 'Advisor: Assoc. Prof. Dr. Hoang Van Dung',

    stat_risk_level: 'Risk Level',
    stat_risk_score: 'Risk Score',
    stat_fire: 'Fire',
    stat_smoke: 'Smoke',
    stat_human: 'Human',
    stat_duration: 'Duration',
    stat_consistency: 'Consistency',
    stat_nearby: 'Nearby',
    
    status_normal: 'NORMAL',
    status_normal_desc: 'System is operating normally',
    status_warning: 'WARNING',
    status_warning_desc: 'Signs of anomaly',
    status_danger: 'DANGER',
    status_danger_desc: 'Fire/Smoke detected',
    status_critical: 'CRITICAL',
    status_critical_desc: 'Major fire, evacuate immediately',

    history_title: 'Detection History',
    history_subtitle: 'Review AI recorded events',
    history_clear: 'Clear History',
    
    alerts_title: 'Alerts List',
    alerts_subtitle: 'Actionable alarms',
    alerts_ack: 'Acknowledge',
    alerts_resolve: 'Resolve',
    alerts_cleared: 'Cleared',

    dash_title: 'AI Fire Early Warning Dashboard',
    dash_subtitle: 'Realtime surveillance, risk scoring, emergency state monitoring, and incident timeline for apartment and mini building safety teams.',
    dash_current_posture: 'Current posture',
    dash_trigger_alert: 'Test Alert',
    dash_reset_safe: 'Reset Safe',
    dash_camera_feed: 'Realtime Surveillance Feed',
    dash_live: 'LIVE 12 FPS',
    dash_danger_zone: 'DANGER ZONE',
    dash_sys_status: 'SYSTEM STATUS',
    dash_human_danger: 'Human proximity risk detected',
    dash_fire_evacuate: 'CRITICAL FIRE ESCALATION ACTIVE',
    dash_high_risk: 'High fire risk detected',
    dash_normal: 'Normal monitoring - All systems safe',
    dash_alerts_title: 'Emergency Alerts',
    dash_alerts_desc_danger: 'Active escalations waiting for operator acknowledgement.',
    dash_alerts_desc_safe: 'No active alerts.',
    dash_evidence_title: 'Snapshot Evidence',
    dash_evidence_desc: 'Auto-captured frames attached to risk and emergency events.',
    dash_integrity_title: 'System Integrity',
    dash_integrity_desc_on: 'Camera stream, backend API, and AI service are operational.',
    dash_integrity_desc_off: 'Backend connection offline.',
    dash_risk_gauge_title: 'Dynamic Risk',
    dash_risk_gauge_desc: 'Score uses area, duration, proximity, and consistency.',
    dash_timeline_title: 'Live Timeline',
    dash_timeline_empty: 'No incident timeline events recorded.',
    
    stat_fire_conf: 'Fire Confidence',
    stat_hazard_detected: 'hazard detected',
    stat_stable: 'stable monitoring',
    stat_smoke_dens: 'Smoke Density',
    stat_spread: 'moderate spread',
    stat_no_smoke: 'no smoke',
    stat_human_nearby: 'Humans Nearby',
    stat_human_risk: '1 at risk zone',
    stat_safe: 'all clear',
    stat_ai_latency: 'AI Latency',
  }
};

type TranslationKey = keyof typeof translations['vi'];

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('phoenix_lang') as Language) || 'vi';
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem('phoenix_lang', lang);
    setLanguageState(lang);
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const text = translations[language][key];
    return text ?? fallback ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
