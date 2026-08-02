import React, { useState } from "react";
import { ArrowLeft, Lock, Mail, Shield, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import PANCARAN_LOGO_DATA_URL from "../assets/logo";
import { authenticateUser, registerUser } from "../lib/userStore";
import { UserAccount, UserRole } from "../types";

interface LoginPageProps {
  onBackToHome: () => void;
  onLoginSuccess: (user: UserAccount | null) => void;
}

export default function LoginPage({ onBackToHome, onLoginSuccess }: LoginPageProps) {
  const [isRegisterView, setIsRegisterView] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("Operations Staff");
  
  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRegisterSuccessMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (isRegisterView) {
        // Handle User Registration
        if (!fullName.trim()) {
          setErrorMessage("Full Name is required for account registration.");
          return;
        }

        const res = registerUser({
          email,
          passwordHash: password,
          fullName,
          role
        });

        if (res.success) {
          setRegisterSuccessMsg(res.message || "Account registration successful!");
          setIsRegisterView(false);
          setEmail(email);
          setPassword(password);
        } else {
          setErrorMessage(res.message || "Failed to register account.");
        }
      } else {
        // Handle User Login
        const res = authenticateUser(email, password);

        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          setErrorMessage(res.message || "Sign In Failed: Invalid email & password combination or account not yet active.");
        }
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col justify-between font-sans relative selection:bg-sky-500 selection:text-white">
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
                  ? "Create internal Pancaran access credentials"
                  : "Access ecosystem management systems"}
              </p>
            </div>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2.5 text-rose-800 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Success Registration Notice */}
          {registerSuccessMsg && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-amber-900 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">
                {registerSuccessMsg}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterView && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@pancaran-logistic.id"
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
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none transition-colors"
                >
                  <option value="Operations Staff">Operations Staff</option>
                  <option value="Fleet Dispatcher">Fleet Dispatcher</option>
                  <option value="Internal CS">Internal CS</option>
                  <option value="Management Executive">Management Executive</option>
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Password <span className="text-rose-500">*</span>
                </label>
                {!isRegisterView && (
                  <button
                    type="button"
                    onClick={() => alert("To reset your password, please contact Super Admin at digital.solution@pancaran-logistic.id.")}
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
                  <span>{isRegisterView ? "Submit Account Registration" : "Sign In to Portal"}</span>
                  <Shield className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Register / Sign In */}
          <div className="mt-6 text-center text-xs font-semibold text-slate-500">
            {isRegisterView ? (
              <p>
                Already have a verified account?{" "}
                <button
                  onClick={() => {
                    setIsRegisterView(false);
                    setErrorMessage(null);
                  }}
                  className="text-sky-600 font-bold hover:underline cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setIsRegisterView(true);
                    setErrorMessage(null);
                  }}
                  className="text-sky-600 font-bold hover:underline cursor-pointer ml-1"
                >
                  Register Internal Account (Approval Required)
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
