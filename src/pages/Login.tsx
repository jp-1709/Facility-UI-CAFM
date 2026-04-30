import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, User, Building2, Shield, Zap, BarChart3 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/* ── Inline styles & keyframes injected once ─────────────────────────── */
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:   #08111f;
    --navy-2: #0d1b2e;
    --navy-3: #112240;
    --steel:  #1e3a5f;
    --blue:   #2563eb;
    --blue-l: #3b82f6;
    --gold:   #f59e0b;
    --gold-l: #fbbf24;
    --white:  #f0f6ff;
    --muted:  #8faec8;
    --glass:  rgba(255,255,255,0.04);
    --glass-b:rgba(255,255,255,0.08);
    --border: rgba(255,255,255,0.08);
    --shadow: 0 32px 80px rgba(0,0,0,0.6);
  }

  @keyframes fadeUp {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity:0; } to { opacity:1; }
  }
  @keyframes pulse-ring {
    0%   { transform:scale(0.95); box-shadow:0 0 0 0 rgba(37,99,235,0.4); }
    70%  { transform:scale(1);    box-shadow:0 0 0 14px rgba(37,99,235,0); }
    100% { transform:scale(0.95); box-shadow:0 0 0 0  rgba(37,99,235,0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes float {
    0%,100% { transform:translateY(0px) rotate(0deg); }
    33%      { transform:translateY(-12px) rotate(1deg); }
    66%      { transform:translateY(-6px) rotate(-1deg); }
  }
  @keyframes scan {
    0%   { top:-4px; }
    100% { top:100%; }
  }

  .fm-root {
    font-family: 'Outfit', sans-serif;
    min-height: 100vh;
    display: flex;
    background: var(--navy);
    overflow: hidden;
    position: relative;
  }

  /* ── Left panel ── */
  .fm-left {
    flex: 1.1;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 64px;
    overflow: hidden;
  }
  .fm-left-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 40%, rgba(37,99,235,0.18) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 80%, rgba(245,158,11,0.08) 0%, transparent 60%),
      linear-gradient(135deg, #08111f 0%, #0d1b2e 50%, #08111f 100%);
    z-index: 0;
  }
  .fm-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    z-index: 1;
  }

  /* Building SVG illustration */
  .fm-illustration {
    position: absolute;
    bottom: -20px;
    right: -40px;
    width: 480px;
    opacity: 0.07;
    z-index: 1;
    animation: float 8s ease-in-out infinite;
  }

  .fm-left-content {
    position: relative;
    z-index: 2;
    animation: fadeUp 0.8s ease both;
  }

  .fm-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(37,99,235,0.15);
    border: 1px solid rgba(37,99,235,0.3);
    border-radius: 100px;
    padding: 6px 16px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--blue-l);
    margin-bottom: 32px;
  }
  .fm-badge-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--blue-l);
    animation: pulse-ring 2s infinite;
  }

  .fm-headline {
    font-size: clamp(32px, 3.5vw, 48px);
    font-weight: 800;
    line-height: 1.15;
    color: var(--white);
    margin-bottom: 16px;
  }
  .fm-headline span {
    background: linear-gradient(120deg, var(--gold) 0%, var(--gold-l) 50%, #fff 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  .fm-sub {
    font-size: 15px;
    color: var(--muted);
    line-height: 1.7;
    max-width: 400px;
    margin-bottom: 48px;
    font-weight: 400;
  }

  .fm-stats {
    display: flex;
    gap: 32px;
  }
  .fm-stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fm-stat-num {
    font-size: 26px;
    font-weight: 700;
    color: var(--white);
  }
  .fm-stat-lbl {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .fm-stat-divider {
    width: 1px;
    background: var(--border);
    align-self: stretch;
  }

  .fm-features {
    margin-top: 56px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .fm-feature {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--muted);
    font-size: 13px;
    font-weight: 500;
    animation: fadeUp 0.8s ease both;
  }
  .fm-feature:nth-child(1) { animation-delay: 0.2s; }
  .fm-feature:nth-child(2) { animation-delay: 0.35s; }
  .fm-feature:nth-child(3) { animation-delay: 0.5s; }
  .fm-feature-icon {
    width: 32px; height: 32px;
    border-radius: 8px;
    background: var(--glass-b);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    color: var(--blue-l);
  }

  /* ── Right panel ── */
  .fm-right {
    width: 480px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 40px;
    background: rgba(13,27,46,0.7);
    backdrop-filter: blur(24px);
    border-left: 1px solid var(--border);
    position: relative;
    z-index: 10;
    animation: fadeIn 0.6s ease both;
  }

  .fm-card {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Logo */
  .fm-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 40px;
    animation: fadeUp 0.6s ease both;
  }
  .fm-logo-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--blue) 0%, #1d4ed8 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 24px rgba(37,99,235,0.4);
  }
  .fm-logo-text { display: flex; flex-direction: column; }
  .fm-logo-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--white);
    letter-spacing: -0.01em;
  }
  .fm-logo-sub {
    font-size: 10px;
    font-weight: 500;
    color: var(--blue-l);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .fm-form-header {
    margin-bottom: 32px;
    animation: fadeUp 0.6s 0.1s ease both;
  }
  .fm-form-title {
    font-size: 26px;
    font-weight: 700;
    color: var(--white);
    margin-bottom: 6px;
  }
  .fm-form-desc {
    font-size: 13px;
    color: var(--muted);
  }

  /* Fields */
  .fm-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
    animation: fadeUp 0.6s ease both;
  }
  .fm-field:nth-child(1) { animation-delay: 0.2s; }
  .fm-field:nth-child(2) { animation-delay: 0.3s; }
  .fm-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .fm-input-wrap {
    position: relative;
  }
  .fm-input-icon {
    position: absolute;
    left: 14px; top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
    transition: color 0.2s;
  }
  .fm-input {
    width: 100%;
    height: 48px;
    padding: 0 16px 0 44px;
    background: var(--glass);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--white);
    font-family: 'Outfit', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .fm-input::placeholder { color: rgba(143,174,200,0.5); }
  .fm-input:focus {
    border-color: var(--blue);
    background: rgba(37,99,235,0.06);
    box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
  }
  .fm-input:focus + .fm-input-icon,
  .fm-input-wrap:focus-within .fm-input-icon { color: var(--blue-l); }
  .fm-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .fm-error {
    font-size: 11px;
    color: #f87171;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Alert */
  .fm-alert {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.3);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    color: #fca5a5;
    margin-bottom: 20px;
    animation: fadeUp 0.3s ease both;
  }

  /* Submit button */
  .fm-btn {
    width: 100%;
    height: 52px;
    background: linear-gradient(135deg, var(--blue) 0%, #1d4ed8 100%);
    border: none;
    border-radius: 12px;
    color: #fff;
    font-family: 'Outfit', sans-serif;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 8px 32px rgba(37,99,235,0.4);
    margin-top: 4px;
    position: relative;
    overflow: hidden;
    animation: fadeUp 0.6s 0.4s ease both;
  }
  .fm-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.2s;
  }
  .fm-btn:hover:not(:disabled)::before { opacity: 1; }
  .fm-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 40px rgba(37,99,235,0.5);
  }
  .fm-btn:active:not(:disabled) { transform: translateY(0); }
  .fm-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Scan line on button when loading */
  .fm-btn-scanning::after {
    content:'';
    position:absolute;
    left:0; right:0; height:2px;
    background:rgba(255,255,255,0.5);
    animation: scan 1.2s linear infinite;
  }

  /* Footer */
  .fm-footer {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    animation: fadeUp 0.6s 0.5s ease both;
  }
  .fm-footer-brand {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .fm-footer-brand strong { color: var(--gold); }
  .fm-footer-copy {
    font-size: 10px;
    color: rgba(143,174,200,0.4);
  }

  /* Responsive */
  @media (max-width: 900px) {
    .fm-left { display: none; }
    .fm-right {
      width: 100%;
      border-left: none;
      background: var(--navy-2);
    }
  }
`;

const Login = () => {
  const { login, loading, error } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear stale auth data on login page mount to prevent cache issues
  useEffect(() => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    const result = await login({ email: data.email, password: data.password });
    if (result.success) {
      console.log('Login successful, redirecting...');
    }
    setIsSubmitting(false);
  };

  const busy = isSubmitting || loading;

  return (
    <>
      <style>{globalStyles}</style>

      <div className="fm-root">
        {/* ── Left decorative panel ─────────────────────────── */}
        <div className="fm-left">
          <div className="fm-left-bg" />
          <div className="fm-grid" />

          {/* Background building illustration */}
          <svg className="fm-illustration" viewBox="0 0 500 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Main tower */}
            <rect x="140" y="80" width="220" height="520" fill="white"/>
            {/* Windows grid */}
            {Array.from({length: 12}).map((_,row) =>
              Array.from({length: 5}).map((_,col) => (
                <rect key={`w-${row}-${col}`}
                  x={158 + col*40} y={100 + row*38}
                  width="24" height="26"
                  fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"
                />
              ))
            )}
            {/* Left wing */}
            <rect x="60" y="220" width="80" height="380" fill="white" opacity="0.8"/>
            {Array.from({length: 8}).map((_,row) =>
              Array.from({length: 2}).map((_,col) => (
                <rect key={`lw-${row}-${col}`}
                  x={72 + col*32} y={235 + row*40}
                  width="18" height="22"
                  fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"
                />
              ))
            )}
            {/* Right wing */}
            <rect x="360" y="280" width="80" height="320" fill="white" opacity="0.6"/>
            {Array.from({length: 7}).map((_,row) =>
              Array.from({length: 2}).map((_,col) => (
                <rect key={`rw-${row}-${col}`}
                  x={372 + col*32} y={295 + row*40}
                  width="18" height="22"
                  fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2"
                />
              ))
            )}
            {/* Antenna */}
            <line x1="250" y1="80" x2="250" y2="20" stroke="white" strokeWidth="4"/>
            <circle cx="250" cy="16" r="5" fill="white"/>
          </svg>

          <div className="fm-left-content">
            <div className="fm-badge">
              <span className="fm-badge-dot" />
              Enterprise Platform
            </div>

            <h1 className="fm-headline">
              Intelligent <span>Facility</span><br />Management Suite
            </h1>

            <p className="fm-sub">
              Centralize operations, automate workflows, and gain real-time
              visibility across all your facilities — from a single, powerful platform.
            </p>

            <div className="fm-stats">
              <div className="fm-stat">
                <span className="fm-stat-num">99.9%</span>
                <span className="fm-stat-lbl">Uptime SLA</span>
              </div>
              <div className="fm-stat-divider" />
              <div className="fm-stat">
                <span className="fm-stat-num">500+</span>
                <span className="fm-stat-lbl">Assets Tracked</span>
              </div>
              <div className="fm-stat-divider" />
              <div className="fm-stat">
                <span className="fm-stat-num">24/7</span>
                <span className="fm-stat-lbl">Monitoring</span>
              </div>
            </div>

            <div className="fm-features">
              <div className="fm-feature">
                <div className="fm-feature-icon"><Shield size={14}/></div>
                Role-based access control & audit trails
              </div>
              <div className="fm-feature">
                <div className="fm-feature-icon"><Zap size={14}/></div>
                Automated preventive maintenance scheduling
              </div>
              <div className="fm-feature">
                <div className="fm-feature-icon"><BarChart3 size={14}/></div>
                Real-time dashboards & compliance reports
              </div>
            </div>
          </div>
        </div>

        {/* ── Right login panel ─────────────────────────────── */}
        <div className="fm-right">
          <div className="fm-card">

            {/* Logo */}
            <div className="fm-logo">
              <div className="fm-logo-icon">
                <Building2 size={22} color="#fff" />
              </div>
              <div className="fm-logo-text">
                <span className="fm-logo-name">FacilityMS</span>
                <span className="fm-logo-sub">by Quantbit Technologies</span>
              </div>
            </div>

            {/* Heading */}
            <div className="fm-form-header">
              <div className="fm-form-title">Welcome back</div>
              <div className="fm-form-desc">Sign in to your workspace to continue</div>
            </div>

            {/* Error */}
            {error && <div className="fm-alert">{error}</div>}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="fm-field">
                <label className="fm-label" htmlFor="email">Username</label>
                <div className="fm-input-wrap">
                  <input
                    id="email"
                    type="text"
                    placeholder="Enter your username"
                    className="fm-input"
                    {...register('email')}
                    disabled={busy}
                    autoComplete="username"
                  />
                  <span className="fm-input-icon"><User size={16}/></span>
                </div>
                {errors.email && <span className="fm-error">⚠ {errors.email.message}</span>}
              </div>

              <div className="fm-field">
                <label className="fm-label" htmlFor="password">Password</label>
                <div className="fm-input-wrap">
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="fm-input"
                    {...register('password')}
                    disabled={busy}
                    autoComplete="current-password"
                  />
                  <span className="fm-input-icon"><Lock size={16}/></span>
                </div>
                {errors.password && <span className="fm-error">⚠ {errors.password.message}</span>}
              </div>

              <button
                type="submit"
                className={`fm-btn${busy ? ' fm-btn-scanning' : ''}`}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Sign In Securely
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="fm-footer">
              <span className="fm-footer-brand">
                Developed & maintained by <strong>Quantbit Technologies Pvt. Ltd.</strong>
              </span>
              <span className="fm-footer-copy">© {new Date().getFullYear()} · All rights reserved · v2.4.1</span>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Login;