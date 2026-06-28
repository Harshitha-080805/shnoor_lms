import{Link,useNavigate}from"react-router-dom";
import{useState,useEffect}from"react";
import logo from"../assets/shnoor-logo.jpeg";
import api from '../api';

const isTokenValid=(t)=>{
  if(!t)return false;
  try{
    const p=JSON.parse(atob(t.split(".")[1]));
    return p.exp*1000>Date.now();
  }catch(e){
    return false;
  }
};

function Register(){
  const navigate=useNavigate();
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[role,setRole]=useState("Learner");
  const[learnerType,setLearnerType]=useState("Independent Learner");
  const[organizationCode,setOrganizationCode]=useState("");
  const[rollNumber,setRollNumber]=useState("");
  const[employeeId,setEmployeeId]=useState("");
  const[organizationType,setOrganizationType]=useState("Company");
  const[organizationName,setOrganizationName]=useState("");
  const[organizationLocation,setOrganizationLocation]=useState("");
  const[website,setWebsite]=useState("");
  const[password,setPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");
  
  useEffect(()=>{
    const token=sessionStorage.getItem("access");
    const roleVal=sessionStorage.getItem("role");
    if(isTokenValid(token)&&roleVal){
      if(roleVal==="admin"){
        navigate("/admin-dashboard");
      }else if(roleVal==="organization_admin"||roleVal==="manager"){
        navigate("/institute-dashboard");
      }else if(roleVal==="instructor"){
        navigate("/instructor-dashboard");
      }else{
        navigate("/student-dashboard");
      }
    }
  },[navigate]);
  
  const inputClass="w-full mt-2 border-2 border-slate-200 rounded-xl px-5 py-4 bg-white outline-none focus:border-blue-950 focus:ring-2 focus:ring-blue-900/10 transition-all font-medium text-blue-950";
  const labelClass="font-bold text-sm text-blue-950 block";

  const handleRegister=(e)=>{
    e.preventDefault();
    if(password!==confirmPassword){
      alert("Passwords do not match");
      return;
    }
    const payload={
      email:email,
      full_name:name,
      password:password,
      confirm_password:confirmPassword,
      role:role==="Learner"?"learner":role==="Instructor"?"instructor":"organization_admin"
    };
    if(payload.role==="learner"){
      payload.learner_type=learnerType==="Independent Learner"?"independent":learnerType==="Student"?"student":"employee";
      if(organizationCode)payload.organization_code=organizationCode;
      if(rollNumber)payload.roll_number=rollNumber;
      if(employeeId)payload.employee_id=employeeId;
    }else if(payload.role==="instructor"){
      if(organizationCode)payload.organization_code=organizationCode;
      if(employeeId)payload.employee_id=employeeId;
    }else if(payload.role==="organization_admin"){
      payload.organization_type=organizationType==="Company"?"company":"institute";
      payload.organization_name=organizationName;
      payload.location=organizationLocation;
      if(website)payload.website=website;
      payload.organization_code=organizationCode;
    }
    api.post("/api/accounts/register", payload)
    .then(res=>{
      alert("Registration successful. Please login.");
      navigate("/login");
    })
    .catch((err)=>{
      const errData = err.response?.data;
      if (errData && errData.error) {
        alert(`Error: ${errData.error}`);
      } else {
        alert("Registration failed. Please try again.");
      }
    });
  };

  return(
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
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Join our community</h2>
          <p className="text-slate-300 text-sm lg:text-base">Create an account to start your learning journey.</p>
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
      <div className="w-full lg:w-[55%] flex flex-col justify-center p-8 sm:p-12 lg:p-16 xl:p-24 min-h-screen">
        <div className="max-w-xl w-full mx-auto">
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

          <h2 className="text-3xl lg:text-4xl font-bold text-[#0F2F2B] mb-3">Create account</h2>
          <p className="text-sm lg:text-base text-slate-600 mb-12">Join us and start your journey today.</p>
          
          <form onSubmit={handleRegister} className="flex flex-col gap-6">
            <div>
              <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Select Role</label>
              <div className="relative">
                <select value={role} onChange={(e)=>setRole(e.target.value)} className="w-full bg-[#FCFBF8] border border-[#DDD7CF] text-[#0F2F2B] rounded-lg py-3.5 pl-4 pr-10 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base appearance-none cursor-pointer">
                  <option>Learner</option>
                  <option>Instructor</option>
                  <option>Organization Admin</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Full Name</label>
              <input type="text" placeholder="Full Name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base" />
            </div>

            {role === "Learner" && (
              <>
                <div className="pt-2 border-t border-[#0F2F2B]/10">
                  <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Learner Type</label>
                  <div className="relative">
                    <select value={learnerType} onChange={(e)=>setLearnerType(e.target.value)} className="w-full bg-[#FCFBF8] border border-[#DDD7CF] text-[#0F2F2B] rounded-lg py-3 pl-4 pr-10 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm appearance-none cursor-pointer">
                      <option>Independent Learner</option>
                      <option>Student</option>
                      <option>Employee</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
                {learnerType === "Student" && (
                  <div className="flex flex-col gap-4 bg-[#FCFBF8] p-4 rounded-xl border border-[#DDD7CF] mt-1 border-dashed">
                    <div>
                      <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Organization Code <span className="text-slate-500 font-normal">(Optional)</span></label>
                      <input type="text" placeholder="Enter organization code" value={organizationCode} onChange={(e)=>setOrganizationCode(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Roll Number <span className="text-slate-500 font-normal">(Optional)</span></label>
                      <input type="text" placeholder="Enter roll number" value={rollNumber} onChange={(e)=>setRollNumber(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                    </div>
                  </div>
                )}
                {learnerType === "Employee" && (
                  <div className="flex flex-col gap-4 bg-[#FCFBF8] p-4 rounded-xl border border-[#DDD7CF] mt-1 border-dashed">
                    <div>
                      <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Organization Code <span className="text-slate-500 font-normal">(Optional)</span></label>
                      <input type="text" placeholder="Enter organization code" value={organizationCode} onChange={(e)=>setOrganizationCode(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Employee ID <span className="text-slate-500 font-normal">(Optional)</span></label>
                      <input type="text" placeholder="Enter employee ID" value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                    </div>
                  </div>
                )}
              </>
            )}

            {role === "Instructor" && (
              <div className="bg-[#FCFBF8] border border-[#DDD7CF] p-5 rounded-xl border-dashed mt-1">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Organization Code <span className="text-slate-500 font-normal">(Optional)</span></label>
                    <input type="text" placeholder="Enter organization code" value={organizationCode} onChange={(e)=>setOrganizationCode(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Employee ID <span className="text-slate-500 font-normal">(Optional)</span></label>
                    <input type="text" placeholder="Enter employee ID" value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                  </div>
                </div>
              </div>
            )}

            {role === "Organization Admin" && (
              <div className="flex flex-col gap-4 bg-[#FCFBF8] p-5 rounded-xl border border-[#DDD7CF] mt-1 border-dashed">
                <h3 className="font-bold text-[#0F2F2B] mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
                  Organization Details
                </h3>
                <div>
                  <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Organization Type</label>
                  <div className="relative">
                    <select value={organizationType} onChange={(e)=>setOrganizationType(e.target.value)} className="w-full bg-white border border-[#DDD7CF] text-[#0F2F2B] rounded-lg py-2.5 pl-4 pr-10 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm appearance-none cursor-pointer">
                      <option>Company</option>
                      <option>Institute</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Organization Name</label>
                    <input type="text" placeholder="Enter organization name" value={organizationName} onChange={(e)=>setOrganizationName(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Organization Code</label>
                    <input type="text" placeholder="Enter organization code" value={organizationCode} onChange={(e)=>setOrganizationCode(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Location</label>
                  <input type="text" placeholder="Enter location" value={organizationLocation} onChange={(e)=>setOrganizationLocation(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                </div>
                <div>
                  <label className="text-sm font-bold text-[#0F2F2B] mb-2 block">Website <span className="text-slate-500 font-normal">(Optional)</span></label>
                  <input type="text" placeholder="Enter website URL" value={website} onChange={(e)=>setWebsite(e.target.value)} className="w-full bg-white border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-2.5 px-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-sm" />
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[#0F2F2B]/10"></div>

            <div>
              <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0F2F2B]"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <input type="email" placeholder="Email Address" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0F2F2B]"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base" />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-bold text-[#0F2F2B] mb-3 block">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0F2F2B]"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} className="w-full bg-[#FCFBF8] border border-[#DDD7CF] placeholder-slate-400 text-[#0F2F2B] rounded-lg py-3.5 pl-12 pr-4 outline-none focus:border-[#0F2F2B] focus:ring-1 focus:ring-[#0F2F2B] transition-all font-medium text-base" />
                </div>
              </div>
            </div>
            
            <button type="submit" className="w-full bg-[#0F2F2B] hover:bg-[#123A38] text-white py-4 rounded-lg font-bold flex items-center justify-center gap-2 mt-4 shadow-lg transition-transform hover:-translate-y-0.5 text-base">
              Create Account <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm font-medium text-slate-600 pb-4">
            Already have an account? <Link to="/login" className="text-[#0F2F2B] hover:text-[#123A38] font-bold ml-1">Login here</Link>
          </div>
        </div>
      </div>
    </div>
  
  );
}
export default Register;