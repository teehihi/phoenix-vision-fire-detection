import { ArrowLeft, Eye, EyeOff, Lock, Mail, Phone, UserRound } from 'lucide-react';
import { type FormEvent, type ReactNode, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { requestRegistrationOtp, verifyRegistrationOtp } from '../../lib/apiClient';
import { publicAsset } from '../../lib/assets';
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from './AuthContext';

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [otpEmail, setOtpEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';
  const isRegister = mode === 'register';
  const isOtpStep = isRegister && Boolean(challengeToken);

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    if (isOtpStep) {
      try {
        await verifyRegistrationOtp(otpEmail, otp.trim(), challengeToken);
        await register({
          fullName: fullName.trim(),
          email: otpEmail,
          phone: phone.trim(),
          password
        });
        navigate(from, { replace: true });
      } catch (authError) {
        setError(getFriendlyAuthError(authError));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setSubmitting(false);
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }

    if (isRegister && !acceptedTerms) {
      setSubmitting(false);
      setError('Bạn cần đồng ý với điều khoản dịch vụ và chính sách bảo mật.');
      return;
    }

    try {
      if (isRegister) {
        const normalizedEmail = email.trim().toLowerCase();
        const challenge = await requestRegistrationOtp(normalizedEmail);
        setChallengeToken(challenge.challenge_token);
        setOtpExpiresIn(challenge.expires_in_seconds);
        setOtpEmail(normalizedEmail);
        setSuccessMessage('PhoenixVision đã gửi mã OTP đến email của bạn.');
      } else {
        await login(email.trim(), password);
        navigate(from, { replace: true });
      }
    } catch (authError) {
      setError(getFriendlyAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
    setOtp('');
    setChallengeToken('');
    setOtpExpiresIn(0);
    setOtpEmail('');
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-5">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-7 text-center">
          <img src={publicAsset('PhoenixLogoLandscape.png')} alt="PhoenixVision" className="mx-auto h-16 w-auto object-contain" />
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">{isOtpStep ? 'Xác minh email' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isOtpStep ? `Nhập mã OTP đã gửi đến ${otpEmail}.` : isRegister ? 'Bắt đầu hành trình của bạn với PhoenixVision ngay' : 'Đăng nhập để tiếp tục quản lý hệ thống PhoenixVision.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isOtpStep ? (
            <OtpVerificationView
              otp={otp}
              otpExpiresIn={otpExpiresIn}
              onOtpChange={setOtp}
              onBack={() => {
                setChallengeToken('');
                setOtp('');
                setOtpEmail('');
                setSuccessMessage(null);
                setError(null);
              }}
              onResend={async () => {
                setSubmitting(true);
                setError(null);
                setSuccessMessage(null);
                try {
                  const challenge = await requestRegistrationOtp(otpEmail);
                  setChallengeToken(challenge.challenge_token);
                  setOtpExpiresIn(challenge.expires_in_seconds);
                  setSuccessMessage('PhoenixVision đã gửi lại mã OTP mới.');
                } catch (resendError) {
                  setError(getFriendlyAuthError(resendError));
                } finally {
                  setSubmitting(false);
                }
              }}
            />
          ) : isRegister ? (
            <AuthInput
              icon={UserRound}
              label="Họ và tên"
              value={fullName}
              onChange={setFullName}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
              required
            />
          ) : null}

          {!isOtpStep ? (
            <AuthInput icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" autoComplete="email" required />
          ) : null}

          {isRegister && !isOtpStep ? (
            <AuthInput icon={Phone} label="Số điện thoại" type="tel" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" autoComplete="tel" required />
          ) : null}

          {!isOtpStep ? (
            <AuthInput
              icon={Lock}
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="Tối thiểu 6 ký tự"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={6}
              trailingButton={
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="text-slate-500 transition hover:text-slate-800" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              required
            />
          ) : null}

          {isRegister && !isOtpStep ? (
            <AuthInput
              icon={Lock}
              label="Xác nhận mật khẩu"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              minLength={6}
              trailingButton={
                <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="text-slate-500 transition hover:text-slate-800" aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              required
            />
          ) : null}

          {isRegister && !isOtpStep ? (
            <label className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-orange-600 focus:ring-orange-500"
              />
              <span>
                Tôi đồng ý với{' '}
                <Link to="/terms" className="font-medium text-orange-600 hover:text-orange-700">
                  điều khoản dịch vụ
                </Link>{' '}
                và{' '}
                <Link to="/privacy" className="font-medium text-orange-600 hover:text-orange-700">
                  chính sách bảo mật
                </Link>
              </span>
            </label>
          ) : null}

          {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{successMessage}</div> : null}
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

          <button
            type="submit"
            disabled={submitting || (isOtpStep && otp.trim().length !== 6)}
            className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang xử lý...' : getSubmitLabel(isRegister, isOtpStep)}
          </button>
        </form>

        {!isOtpStep ? (
          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <button type="button" onClick={() => switchMode(isRegister ? 'login' : 'register')} className="font-semibold text-orange-600 transition hover:text-orange-700">
              {isRegister ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </p>
        ) : null}

        {!isRegister && !isOtpStep ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Demo: <span className="font-semibold text-slate-700">{DEMO_EMAIL}</span> / <span className="font-semibold text-slate-700">{DEMO_PASSWORD}</span>
          </p>
        ) : null}
      </section>
    </main>
  );
}

function getSubmitLabel(isRegister: boolean, hasChallengeToken: boolean) {
  if (!isRegister) {
    return 'Đăng nhập';
  }
  return hasChallengeToken ? 'Xác minh và tạo tài khoản' : 'Gửi mã OTP';
}

function OtpVerificationView({
  otp,
  otpExpiresIn,
  onOtpChange,
  onBack,
  onResend
}: {
  otp: string;
  otpExpiresIn: number;
  onOtpChange: (value: string) => void;
  onBack: () => void;
  onResend: () => void;
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => otp[index] ?? '');

  function updateDigit(index: number, value: string) {
    const nextDigit = value.replace(/\D/g, '').slice(-1);
    if (!nextDigit) {
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = nextDigit;
    onOtpChange(nextDigits.join('').slice(0, 6));
    inputRefs.current[index + 1]?.focus();
  }

  function removeDigit(index: number) {
    if (index < 0 || index > 5) {
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = '';
    onOtpChange(nextDigits.join('').slice(0, 6));
  }

  function handlePaste(value: string) {
    const pastedDigits = value.replace(/\D/g, '').slice(0, 6);
    if (!pastedDigits) {
      return;
    }

    onOtpChange(pastedDigits);
    inputRefs.current[Math.min(pastedDigits.length, 5)]?.focus();
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-orange-600">
        <ArrowLeft size={15} />
        Quay lại sửa thông tin
      </button>

      <div>
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Mail size={17} />
          Mã OTP
        </span>
        <div className="mt-3 grid grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Backspace') {
                  if (digit) {
                    removeDigit(index);
                  } else {
                    inputRefs.current[index - 1]?.focus();
                    removeDigit(index - 1);
                  }
                }

                if (event.key === 'ArrowLeft') {
                  inputRefs.current[index - 1]?.focus();
                }

                if (event.key === 'ArrowRight') {
                  inputRefs.current[index + 1]?.focus();
                }
              }}
              onPaste={(event) => {
                event.preventDefault();
                handlePaste(event.clipboardData.getData('text'));
              }}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Số OTP thứ ${index + 1}`}
              className="h-14 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-bold text-slate-950 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Mã có hiệu lực khoảng {Math.ceil(otpExpiresIn / 60)} phút.</span>
        <button type="button" onClick={onResend} className="font-semibold text-orange-600 hover:text-orange-700">
          Gửi lại mã
        </button>
      </div>
    </div>
  );
}

function getFriendlyAuthError(error: unknown) {
  const apiDetail = getApiErrorDetail(error);
  if (apiDetail) {
    return apiDetail;
  }

  const message = error instanceof Error ? error.message : '';

  if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) {
    return 'Email hoặc mật khẩu không đúng.';
  }

  if (message.includes('auth/email-already-in-use')) {
    return 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.';
  }

  if (message.includes('auth/weak-password')) {
    return 'Mật khẩu cần có ít nhất 6 ký tự.';
  }

  if (message.includes('auth/too-many-requests')) {
    return 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.';
  }

  if (message.includes('Network Error')) {
    return 'Không kết nối được máy chủ xác minh OTP. Vui lòng kiểm tra backend.';
  }

  return message || 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
}

function getApiErrorDetail(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return null;
  }

  const response = (error as { response?: { data?: { detail?: unknown } } }).response;
  return typeof response?.data?.detail === 'string' ? response.data.detail : null;
}

function AuthInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  minLength,
  trailingButton,
  inputMode,
  maxLength,
  required = false
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
  trailingButton?: ReactNode;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon size={17} />
        {label}
      </span>
      <div className="relative mt-2">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          required={required}
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
          placeholder={placeholder}
        />
        {trailingButton ? <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailingButton}</span> : null}
      </div>
    </label>
  );
}
