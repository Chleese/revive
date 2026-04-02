"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("注册成功！请登录");
        setIsRegister(false);
        setPassword("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景光效 */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

      <div className="max-w-sm w-full relative z-10">
        {/* 品牌标识 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            Revive
          </h1>
          <p className="text-white/40 text-sm">
            {isRegister ? "创建账号，开始收藏" : "欢迎回来"}
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="邮箱"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="密码"
            />
          </div>

          {error && (
            <div className={`text-sm text-center ${error.includes("成功") ? "text-green-400" : "text-red-400"}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-xl font-medium disabled:opacity-30 hover:bg-white/90 transition-colors"
          >
            {loading ? "处理中..." : isRegister ? "注册" : "登录"}
          </button>
        </form>

        {/* 切换登录/注册 */}
        <div className="mt-8 text-center text-sm text-white/30">
          {isRegister ? "已有账号？" : "没有账号？"}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            className="text-white/60 font-medium ml-1 hover:text-white/80 transition-colors"
          >
            {isRegister ? "去登录" : "注册"}
          </button>
        </div>
      </div>
    </div>
  );
}
