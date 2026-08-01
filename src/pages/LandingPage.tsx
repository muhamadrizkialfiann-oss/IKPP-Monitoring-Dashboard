import React, { useState } from "react";
import { 
  ChevronRight, 
  Shield, 
  UserCheck, 
  Users, 
  Radio, 
  MonitorCheck, 
  TrendingUp, 
  FileText, 
  CheckCircle2, 
  Lock,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import PANCARAN_LOGO_DATA_URL from "../assets/logo";

interface LandingPageProps {
  onLogin: () => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showPortalDropdown, setShowPortalDropdown] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. Header Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img 
              src={PANCARAN_LOGO_DATA_URL} 
              alt="Pancaran Logo" 
              className="w-9 h-9 object-contain rounded-lg bg-white p-1 shadow-md shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-white font-black tracking-wider text-lg">PANCARAN</span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-black tracking-widest text-lg">ONE</span>
            </div>
          </div>

          {/* Navigation Links & Action Button */}
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest text-slate-300">
              <button 
                onClick={() => scrollToSection("why-choose")} 
                className="hover:text-cyan-400 transition-colors uppercase cursor-pointer"
              >
                SOLUTION
              </button>
              <button 
                onClick={() => scrollToSection("portals")} 
                className="hover:text-cyan-400 transition-colors uppercase cursor-pointer"
              >
                PORTALS
              </button>
            </nav>

            {/* Login Portal Button */}
            <div className="relative">
              <button
                id="landing-login-portal-btn"
                onClick={onLogin}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <span>Login Portal</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-950" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Image with Motion Blur Highway Logistics Truck */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80" 
            alt="Logistics Expressway Fleet" 
            className="w-full h-full object-cover object-center filter brightness-[0.45] contrast-[1.15] scale-105"
          />
          {/* Cyan/Blue Ambient Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/30 via-transparent to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center space-y-8 py-20">
          {/* Main Title */}
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-none">
              Orchestrating <br />
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
                Logistics
              </span>
            </h1>
          </div>

          {/* Subtitle Description */}
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto font-medium leading-relaxed drop-shadow">
            A unified platform connecting Customers, Internal Operations, and Partners for seamless end-to-end logistics execution.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              id="hero-get-started-btn"
              onClick={onLogin}
              className="bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-extrabold text-sm px-7 py-3.5 rounded-full flex items-center gap-2 shadow-xl shadow-cyan-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>Get Started</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              onClick={() => scrollToSection("why-choose")}
              className="bg-white/90 hover:bg-white text-slate-900 font-extrabold text-sm px-7 py-3.5 rounded-full transition-all cursor-pointer shadow-lg hover:shadow-white/20 transform hover:-translate-y-0.5"
            >
              About Us
            </button>

            <button
              onClick={() => setShowDemoModal(true)}
              className="border-2 border-slate-300/40 hover:border-cyan-400/80 bg-slate-900/40 backdrop-blur-md text-white font-extrabold text-sm px-7 py-3.5 rounded-full transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/10 transform hover:-translate-y-0.5"
            >
              Request Demo
            </button>
          </div>
        </div>
      </section>

      {/* 3. "One Platform, Three Portals" Section */}
      <section id="portals" className="py-24 bg-slate-950 relative z-10 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              One Platform, Three Portals
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto">
              Tailored experiences for every stakeholder in the logistics lifecycle.
            </p>
          </div>

          {/* 3 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Customer Portal */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between space-y-6 hover:border-cyan-500/50 transition-all duration-300 group shadow-xl hover:shadow-cyan-500/10">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Customer Portal</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Full visibility into orders, tracking, and billing. Create shipments in seconds.
                </p>
              </div>
              <div>
                <button
                  onClick={onLogin}
                  className="text-cyan-400 hover:text-cyan-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer group-hover:translate-x-1 transition-all"
                >
                  <span>Enter Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: Internal Portal */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between space-y-6 hover:border-cyan-500/50 transition-all duration-300 group shadow-xl hover:shadow-cyan-500/10">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Internal Portal</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The Control Tower for Pancaran Group operations.
                </p>
              </div>
              <div>
                <button
                  onClick={onLogin}
                  className="text-cyan-400 hover:text-cyan-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer group-hover:translate-x-1 transition-all"
                >
                  <span>Enter Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 3: Partner Portal */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between space-y-6 hover:border-cyan-500/50 transition-all duration-300 group shadow-xl hover:shadow-cyan-500/10">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Partner Portal</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Empowering vendors to update availability, bid for orders, and manage trips.
                </p>
                <div className="pt-1">
                  <span className="inline-block bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-semibold text-[11px] px-3 py-1 rounded-full">
                    Join as a Partner ›
                  </span>
                </div>
              </div>
              <div>
                <button
                  onClick={onLogin}
                  className="text-cyan-400 hover:text-cyan-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer group-hover:translate-x-1 transition-all"
                >
                  <span>Enter Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "Why Choose Pancaran One?" Section */}
      <section id="why-choose" className="py-24 bg-slate-950 border-t border-slate-900 px-6 relative">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Feature Highlights */}
          <div className="lg:col-span-6 space-y-8">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Why Choose Pancaran <br />
              <span className="text-cyan-400">One?</span>
            </h2>

            <div className="space-y-6">
              {/* Feature 1 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white tracking-wide uppercase">
                    FEATURE: <span className="text-slate-200">REAL-TIME VISIBILITY</span>
                  </h4>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    Track your cargo with GPS-enabled monitoring and automated status updates.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <MonitorCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white tracking-wide uppercase">
                    FEATURE: <span className="text-slate-200">CONTROL TOWER</span>
                  </h4>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    Centralized management for both Own Fleet and Vendor Fleet operations.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white tracking-wide uppercase">
                    FEATURE: <span className="text-slate-200">COST EFFICIENCY</span>
                  </h4>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    Optimize routes and fleet utilization to reduce logistics overhead.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white tracking-wide uppercase">
                    FEATURE: <span className="text-slate-200">TRANSPARENCY</span>
                  </h4>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    Clear pricing, automated invoicing, and digital POD/BAST documents.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Command Center Control Room Image & Metric Overlay */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
              <img 
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80" 
                alt="Pancaran Control Tower Room" 
                className="w-full h-[380px] sm:h-[420px] object-cover object-center filter contrast-[1.1]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            </div>

            {/* Floating Metric Badge */}
            <div className="absolute -bottom-6 -left-2 sm:left-4 bg-white text-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 max-w-[280px] flex items-start gap-3.5 z-20">
              <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 leading-none">99.8%</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">On-time</span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-tight">
                  Industry leading performance across our hybrid fleet network
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5. Footer */}
      <footer className="py-8 bg-slate-950 border-t border-slate-900 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img 
              src={PANCARAN_LOGO_DATA_URL} 
              alt="Pancaran Logo" 
              className="w-7 h-7 object-contain rounded bg-white p-0.5"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center gap-1 text-xs">
              <span className="text-white font-black">PANCARAN</span>
              <span className="text-cyan-400 font-black">ONE</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-bold tracking-wider text-slate-500">
            <button className="hover:text-slate-300 transition-colors uppercase">PRIVACY</button>
            <button className="hover:text-slate-300 transition-colors uppercase">TERMS</button>
            <button className="hover:text-slate-300 transition-colors uppercase">SUPPORT</button>
          </div>
        </div>
      </footer>

      {/* Request Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl relative">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Request a Demo</h3>
              <p className="text-slate-400 text-xs">Experience the power of Pancaran ONE Control Tower.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Company Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. PT Indah Kiat Pulp & Paper Tbk" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Work Email</label>
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowDemoModal(false)} 
                className="text-xs font-bold text-slate-400 hover:text-white px-4 py-2"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowDemoModal(false);
                  onLogin();
                }} 
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                Submit & Enter Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
