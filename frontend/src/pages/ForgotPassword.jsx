import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import logo from "../assets/shnoor-logo.jpeg";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/forgot-password`, { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-[#EFEAE2]">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0F2F2B] text-white flex-col p-12 lg:p-16 xl:p-20 justify-between h-screen sticky top-0 shadow-2xl z-10">
        <div className="flex items-center gap-4 mb-12 lg:mb-16">
          <div className="bg-white p-1 rounded shadow-sm">
            <img src={logo} alt="SHNOOR" className="h-10 w-auto" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-yellow-500">SHNOOR <span className="text-white">LMS</span></h1>
            <p className="text-slate-300 text-xs mt-0.5">Smart Learning, Better Future</p>
          </div>
        </div>
        
        <div className="mb-10">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Forgot Password?</h2>
          <p className="text-slate-300 text-sm lg:text-base">We'll help you get back to your account.</p>
        </div>
        
        <div className="space-y-6 lg:space-y-8 mb-12 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="w-12 h-12 rounded-lg bg-[#163935] border border-emerald-900/50 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>
            <p className="text-sm lg:text-base text-slate-200 leading-snug">Access your courses<br/>anytime, anywhere</p>
          </div>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="w-12 h-12 rounded-lg bg-[#163935] border border-emerald-900/50 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </div>
            <p className="text-sm lg:text-base text-slate-200 leading-snug">Track your progress<br/>and performance</p>
          </div>
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="w-12 h-12 rounded-lg bg-[#163935] border border-emerald-900/50 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
            </div>
            <p className="text-sm lg:text-base text-slate-200 leading-snug">Earn Certificates<br/>and achieve goals</p>
          </div>
        </div>
        
        <div className="mt-auto pt-8">
          <div className="w-10 h-1 bg-yellow-600 mb-6"></div>
          <p className="text-xs lg:text-sm text-slate-300 leading-relaxed pr-8 max-w-sm">
            shnoor LMS is a powerful platform designed for institutes, instructors and students
          </p>
        </div>
      </div>
      
      {/* RIGHT PANEL (FORM) */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center p-8 sm:p-12 lg:p-16">
        <div className="max-w-md w-full mx-auto">
          <Link to="/login" className="text-xs flex items-center gap-1.5 text-slate-600 hover:text-[#0F2F2B] mb-12 inline-flex font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to Login
          </Link>

          <div className="lg:hidden flex items-center gap-4 mb-8">
            <div className="bg-white p-1 rounded shadow-sm">
              <img src={logo} alt="SHNOOR" className="h-8 w-auto" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F2F2B]">SHNOOR LMS</h1>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F2F2B] mb-3">Reset Password</h2>
          <p className="text-sm lg:text-base text-slate-600 mb-12">Enter your email to receive a reset link.</p>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg font-medium text-sm">{error}</div>}
            {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-lg font-medium text-sm">{message}</div>}

            {!message && (
              <>
                <div>
                  <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0F2F2B]"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </div>
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required
                      disabled={loading}
                      className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base disabled:opacity-50" 
                    />
                  </div>
                </div>
                
                <button type="submit" disabled={loading} className="w-full bg-[#0F2F2B] hover:bg-[#123A38] text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 mt-4 shadow-lg transition-transform hover:-translate-y-0.5 text-base disabled:opacity-50 disabled:hover:translate-y-0">
                  {loading ? "Sending..." : "Send Reset Link"} <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </>
            )}
          </form>
          
          <div className="mt-12 text-center text-sm font-medium text-slate-600">
            Remember your password? <Link to="/login" className="text-[#0F2F2B] hover:text-[#123A38] font-bold ml-1 transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ForgotPassword;
