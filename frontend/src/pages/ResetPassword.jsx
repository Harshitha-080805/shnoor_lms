import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import logo from "../assets/shnoor-logo.jpeg";

function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/verify-reset-token/${token}`);
        if (res.data.valid) {
          setValidToken(true);
        } else {
          setError("This reset link is invalid or has expired.");
        }
      } catch (err) {
        setError("This reset link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/reset-password-with-token`, { token, newPassword });
      setMessage(res.data.message);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 font-sans text-slate-500 font-bold">
        Verifying reset link...
      </div>
    );
  }

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
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Reset Password</h2>
          <p className="text-slate-300 text-sm lg:text-base">Create a strong new password.</p>
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

          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F2F2B] mb-3">Set New Password</h2>
          <p className="text-sm lg:text-base text-slate-600 mb-12">Create a strong new password for your account.</p>

          {!validToken ? (
            <div className="mt-4 text-center">
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg font-medium text-sm">{error}</div>
              <Link to="/forgot-password" className="inline-block mt-6 text-[#0F2F2B] hover:opacity-80 transition-opacity font-bold text-sm">
                Request New Link
              </Link>
            </div>
          ) : message ? (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-lg text-center">
              <p className="font-bold text-sm mb-2">{message}</p>
              <p className="text-emerald-600 font-medium text-sm">Redirecting to login page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-7">
              {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg font-medium text-sm">{error}</div>}

              <div>
                <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0F2F2B]"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input 
                    type="password" 
                    placeholder="Enter new password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required
                    className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base" 
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0F2F2B]"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input 
                    type="password" 
                    placeholder="Repeat new password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required
                    className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base" 
                  />
                </div>
              </div>
              
              <button type="submit" className="w-full bg-[#0F2F2B] hover:bg-[#123A38] text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 mt-4 shadow-lg transition-transform hover:-translate-y-0.5 text-base">
                Update Password <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
export default ResetPassword;
