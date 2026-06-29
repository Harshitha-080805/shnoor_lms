import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import logo from "../assets/shnoor-logo.jpeg";
import api from '../api';

const isTokenValid = (t) => {
  if (!t) return false;
  try {
    const p = JSON.parse(atob(t.split(".")[1]));
    return p.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("access");
    const roleVal = sessionStorage.getItem("role");
    if (isTokenValid(token) && roleVal) {
      if (roleVal === "admin") {
        navigate("/admin-dashboard");
      } else if (roleVal === "organization_admin" || roleVal === "manager") {
        navigate("/institute-dashboard");
      } else if (roleVal === "instructor") {
        navigate("/instructor-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } else {
      sessionStorage.removeItem("access");
      sessionStorage.removeItem("refresh");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("email");
      sessionStorage.removeItem("loggedInUser");
    }
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    api.post("/api/accounts/login", { email: email, password: password })
      .then(res => {
        const data = res.data;
        sessionStorage.setItem("access", data.token);
        sessionStorage.setItem("role", data.user.role.toLowerCase());
        sessionStorage.setItem("email", data.user.email);
        sessionStorage.setItem("username", data.user.fullName);
        if (data.user.profilePic) {
          sessionStorage.setItem("profile_pic", data.user.profilePic);
        } else {
          sessionStorage.removeItem("profile_pic");
        }
        if (data.user.learnerType) {
          sessionStorage.setItem("learnerType", data.user.learnerType);
        }
        const mappedUser = {
          name: data.user.fullName,
          email: data.user.email,
          role: data.user.role === "ORGANIZATION_ADMIN" ? "Organization Admin" : data.user.role === "LEARNER" ? "Learner" : data.user.role === "INSTRUCTOR" ? "Instructor" : "Super Admin",
          status: "Approved"
        };
        sessionStorage.setItem("loggedInUser", JSON.stringify(mappedUser));

        const role = data.user.role.toLowerCase();
        if (role === "admin") {
          navigate("/admin-dashboard");
        } else if (role === "learner") {
          navigate("/student-dashboard");
        } else if (role === "instructor") {
          navigate("/instructor-dashboard");
        } else {
          navigate("/institute-dashboard");
        }
      })
      .catch((err) => {
        const errData = err.response?.data;
        if (errData) {
          alert(errData.non_field_errors || errData.detail || JSON.stringify(errData));
        } else {
          alert("Login failed");
        }
      });
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
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Welcome Back!</h2>
          <p className="text-slate-300 text-sm lg:text-base">Login to continue your learning journey.</p>
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
          <Link to="/" className="text-xs flex items-center gap-1.5 text-slate-600 hover:text-[#0F2F2B] mb-12 inline-flex font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to home
          </Link>
          
          <div className="lg:hidden flex items-center gap-4 mb-8">
            <div className="bg-white p-1 rounded shadow-sm">
              <img src={logo} alt="SHNOOR" className="h-8 w-auto" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F2F2B]">SHNOOR LMS</h1>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F2F2B] mb-3">Login to your account</h2>
          <p className="text-sm lg:text-base text-slate-600 mb-12">Enter your credentials to access your account</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-7">
            <div>
              <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0F2F2B]"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <input type="email" placeholder="Enter your Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base" />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0F2F2B]"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base" />
                <div 
                  className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} className="text-[#0F2F2B]" /> : <Eye size={18} className="text-[#0F2F2B]" />}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-[-12px]">
              <Link to="/forgot-password" className="text-sm font-bold text-[#0F2F2B] hover:opacity-70 transition-opacity">forgot password?</Link>
            </div>
            
            <button type="submit" className="w-full bg-[#0F2F2B] hover:bg-[#123A38] text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 mt-4 shadow-lg transition-transform hover:-translate-y-0.5 text-base">
              Login <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </form>
          
          <div className="mt-12 text-center text-sm font-medium text-slate-600">
            Don't have an account? <Link to="/register" className="text-yellow-600 hover:text-yellow-700 font-bold ml-1 transition-colors">Register Now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Login;