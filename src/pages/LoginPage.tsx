import React, { useState } from "react";
import { ArrowLeft, Lock, Mail, Shield, User, Eye, EyeOff, UserCheck } from "lucide-react";
import PANCARAN_LOGO_DATA_URL from "../assets/logo";

interface LoginPageProps {
  onBackToHome: () => void;
  onLoginSuccess: (isGuest?: boolean) => void;
}

export default function LoginPage({ onBackToHome, onLoginSuccess }: LoginPageProps) {
  const [isRegisterView, setIsRegisterView] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("staff@pancaran.com");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Operations Staff");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(false);
    }, 600);
  };

  const handleGuestLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(true);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between font-sans relative selection:bg-sky-500 selection:text-white">
      {/* Plain White Background */}

      {/* Top Header / Back Link */}
      <header className="relative z-10 px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-sky-600 bg-white hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main Login / Register Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-100 relative overflow-hidden">
          {/* Logo & Header */}
          <div className="text-center space-y-3 mb-6">
            <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-white border border-slate-200 shadow-md mb-1">
              <img
                src={PANCARAN_LOGO_DATA_URL}
                alt="Pancaran Logo"
                className="w-10 h-10 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isRegisterView ? "Register Account" : "Internal Portal"}
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
                {isRegisterView
                  ? "Create internal access credentials"
                  : "Access ecosystem management systems"}
              </p>
            </div>
          </div>

          {/* GUEST LOGIN BUTTON (Bypass Login) */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-500/50 hover:border-emerald-500 text-emerald-800 font-extrabold text-xs sm:text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer transform active:scale-[0.99]"
            >
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Login Sebagai Tamu (Guest Access)</span>
              <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider ml-auto">
                Direct
              </span>
            </button>
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase">or sign in with credentials</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterView && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Budi Santoso"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@pancaran.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {isRegisterView && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Department / Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none transition-colors"
                >
                  <option value="Operations Staff">Operations Staff</option>
                  <option value="Fleet Dispatcher">Fleet Dispatcher</option>
                  <option value="Customer Support CS">Customer Support CS</option>
                  <option value="Management">Management Executive</option>
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Password
                </label>
                {!isRegisterView && (
                  <button
                    type="button"
                    onClick={() => alert("Gunakan Login Sebagai Tamu untuk akses langsung tanpa password!")}
                    className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Main Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-extrabold text-xs sm:text-sm py-3 px-4 rounded-2xl transition-all shadow-lg shadow-sky-600/20 cursor-pointer transform active:scale-[0.99] mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegisterView ? "Complete Registration" : "Sign In to Portal"}</span>
                  <Shield className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Register / Sign In */}
          <div className="mt-6 text-center text-xs font-semibold text-slate-500">
            {isRegisterView ? (
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setIsRegisterView(false)}
                  className="text-sky-600 font-bold hover:underline cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => setIsRegisterView(true)}
                  className="text-sky-600 font-bold hover:underline cursor-pointer ml-1"
                >
                  Register Internal Account
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-[11px] font-medium text-slate-400 border-t border-slate-200/60 bg-white/60">
        © 2026 PT Pancaran Darat Transport. All rights reserved.
      </footer>
    </div>
  );
}
