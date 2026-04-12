"use client";

import { useState } from "react";
import { authService } from "@/lib/services/auth";

type BgStyle = "particles" | "grid";

function BackgroundEffect({ style }: { style: BgStyle }) {
  switch (style) {
    case "particles":
      return <ParticlesBg />;
    case "grid":
      return <GridBg />;
  }
}

function ParticlesBg() {
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${(i * 17) % 100}%`,
    top: `${(i * 29) % 100}%`,
    size: ((i % 4) + 1) * 0.8,
    delay: `${(i % 5) * 0.7}s`,
    duration: `${4 + (i % 4)}s`,
    anim: ["float-1", "float-2", "float-3"][i % 3],
  }));

  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animation: `${p.anim} ${p.duration} ${p.delay} infinite ease-in-out`,
          }}
        />
      ))}
    </>
  );
}

function GridBg() {
  const cols = 7;
  const rows = 14;

  return (
    <>
      <style>{`
        @keyframes grid-draw {
          0%, 3% { stroke-dashoffset: 5000; }
          35% { stroke-dashoffset: 0; }
          65% { stroke-dashoffset: 0; }
          97%, 100% { stroke-dashoffset: -5000; }
        }
        .grid-line {
          stroke-dasharray: 5000;
          stroke-dashoffset: 5000;
          animation: grid-draw var(--dur) var(--delay) ease-in-out infinite;
        }
      `}</style>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {Array.from({ length: cols }, (_, i) => {
          const pct = (i / (cols - 1)) * 100;
          return (
            <line
              key={`v${i}`}
              x1={`${pct}%`} y1="0" x2={`${pct}%`} y2="100%"
              stroke="white" strokeWidth="0.5" strokeOpacity="0.15"
              className="grid-line"
              style={{ "--dur": "14s", "--delay": `${(i * 0.3).toFixed(2)}s` } as React.CSSProperties}
            />
          );
        })}
        {Array.from({ length: rows }, (_, i) => {
          const pct = (i / (rows - 1)) * 100;
          return (
            <line
              key={`h${i}`}
              x1="0" y1={`${pct}%`} x2="100%" y2={`${pct}%`}
              stroke="white" strokeWidth="0.5" strokeOpacity="0.15"
              className="grid-line"
              style={{ "--dur": "14s", "--delay": `${(i * 0.15).toFixed(2)}s` } as React.CSSProperties}
            />
          );
        })}
      </svg>
    </>
  );
}

const BG_OPTIONS: { key: BgStyle; label: string }[] = [
  { key: "particles", label: "微光粒子" },
  { key: "grid", label: "画线网格" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bgStyle, setBgStyle] = useState<BgStyle>("particles");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isReset) {
        await authService.resetPasswordForEmail(
          email,
          `${window.location.origin}/reset-password`
        );
        setSuccess("重置链接已发送到您的邮箱");
        setError("");
      } else if (isRegister) {
        await authService.signUp(email, password);
        setError("注册成功！请登录");
        setIsRegister(false);
        setPassword("");
      } else {
        await authService.signInWithPassword(email, password);
        window.location.replace("/");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundEffect style={bgStyle} />

      <div className="max-w-sm w-full relative z-10">
        {/* 品牌标识 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Revive
          </h1>
          <p className="text-white/40 text-sm">
            {isReset ? "重置密码" : isRegister ? "创建账号，开始收藏" : "欢迎回来"}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full ${bgStyle === "grid" ? "bg-black" : "bg-white/7"} border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors`}
              placeholder="邮箱"
            />
          </div>

          {!isReset && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={`w-full ${bgStyle === "grid" ? "bg-black" : "bg-white/7"} border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors`}
                placeholder="密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className={`text-sm text-center ${error.includes("成功") ? "text-green-400" : "text-red-400"}`}>
              {error}
            </div>
          )}

          {success && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
                <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" className="animate-[check_0.3s_ease-out_0.1s_both]" />
                </svg>
              </div>
              <div className="text-sm text-green-400">{success}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full bg-white text-black py-3 rounded-xl font-medium disabled:opacity-30 hover:bg-white/90 transition-colors"
          >
            {loading ? "处理中..." : success ? "已发送" : isReset ? "发送重置密码链接" : isRegister ? "注册" : "登录"}
          </button>
        </form>

        {/* 切换 */}
        <div className="mt-8 text-center text-sm text-white/30 space-y-2">
          {isReset ? (
            <button
              onClick={() => { setIsReset(false); setError(""); setSuccess(""); }}
              className="text-white/60 font-medium hover:text-white/80 transition-colors"
            >
              返回登录
            </button>
          ) : (
            <>
              <div>
                <button
                  onClick={() => { setIsReset(true); setError(""); setSuccess(""); }}
                  className="text-white/60 font-medium hover:text-white/80 transition-colors"
                >
                  忘记密码？
                </button>
              </div>
              <div>
                {isRegister ? "已有账号？" : "没有账号？"}
                <button
                  onClick={() => { setIsRegister(!isRegister); setError(""); }}
                  className="text-white/60 font-medium ml-1 hover:text-white/80 transition-colors"
                >
                  {isRegister ? "去登录" : "注册"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 临时切换按钮 — 选好背景后删除 */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2">
        {BG_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setBgStyle(opt.key)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              bgStyle === opt.key
                ? "bg-white text-black"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
