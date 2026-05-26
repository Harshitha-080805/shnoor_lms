import{Link,useNavigate}from"react-router-dom";
import{useState,useEffect}from"react";
import logo from"../assets/shnoor-logo.jpeg";

function Login(){
  const navigate=useNavigate();
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");

  useEffect(()=>{
    const token=localStorage.getItem("access");
    const role=localStorage.getItem("role");
    if(token&&role){
      if(role==="admin"){
        navigate("/admin-dashboard");
      }else if(role==="organization_admin"||role==="manager"){
        navigate("/institute-dashboard");
      }else if(role==="instructor"){
        navigate("/instructor-dashboard");
      }else{
        navigate("/student-dashboard");
      }
    }
  },[navigate]);

  const handleLogin=async(e)=>{
    e.preventDefault();
    try{
      const response=await fetch("http://127.0.0.1:8000/api/auth/login/",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
        },
        body:JSON.stringify({
          email:email,
          password:password,
        }),
      });
      const data=await response.json();
      if(!response.ok){
        if(data.non_field_errors){
          alert(data.non_field_errors[0]);
        }else{
          alert("Login failed");
        }
        return;
      }
      localStorage.setItem("access",data.access);
      localStorage.setItem("refresh",data.refresh);
      localStorage.setItem("role",data.role);
      localStorage.setItem("username",data.username);
      localStorage.setItem("email",data.email);
      if(data.role==="admin"){
        navigate("/admin-dashboard");
      }else if(data.role==="organization_admin"||data.role==="manager"){
        navigate("/institute-dashboard");
      }else if(data.role==="instructor"){
        navigate("/instructor-dashboard");
      }else{
        navigate("/student-dashboard");
      }
    }catch(error){
      alert("Server error"+error);
    }
  };

  return (
    <div className="h-screen grid lg:grid-cols-2 bg-white overflow-hidden">
      <div className="hidden lg:flex h-screen sticky top-0 bg-blue-700 text-white flex-col justify-between p-16">
        <div className="flex items-center gap-4">
          <img
            src={logo}
            alt="SHNOOR"
            className="h-16 bg-white rounded-xl p-2"
          />
          <div>
            <h1 className="text-3xl font-extrabold font-sans">
              SHNOOR LMS
            </h1>
            <p className="text-blue-100 mt-1">
              Subscription Based LMS Platform
            </p>
          </div>
        </div>
        <div className="max-w-xl">
          <h2 className="text-6xl font-extrabold leading-tight">
            Learn. Practice. Track. Achieve.
          </h2>
          <p className="mt-8 text-xl text-blue-100 leading-9">
            Access courses, assignments, quizzes, certificates,
            analytics and progress tracking through a professional LMS platform.
          </p>
        </div>
        <div className="text-blue-200 text-sm">
          © 2026 SHNOOR International LLC
        </div>
      </div>
      <div className="h-screen overflow-y-auto flex items-center justify-center px-8 lg:px-20 py-16 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img
              src={logo}
              alt="SHNOOR"
              className="h-14"
            />
            <h1 className="text-2xl font-extrabold text-blue-700">
              SHNOOR LMS
            </h1>
          </div>
          <h2 className="text-5xl font-extrabold mt-3 leading-tight">
            Login to your account
          </h2>
          <p className="text-slate-600 mt-5 leading-8">
            Continue your learning experience from your LMS dashboard.
          </p>
          <form onSubmit={handleLogin} className="mt-10 grid gap-6">
            <div>
              <label className="font-semibold text-sm">
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                className="w-full mt-3 border border-slate-300 rounded-2xl px-5 py-4 bg-white outline-none focus:border-blue-700"
              />
            </div>
            <div>
              <label className="font-semibold text-sm">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                className="w-full mt-3 border border-slate-300 rounded-2xl px-5 py-4 bg-white outline-none focus:border-blue-700"
              />
            </div>
            <div className="flex justify-between items-center text-sm">
              <div></div>
              <a href="/" className="text-blue-700 font-bold">
                Forgot Password?
              </a>
            </div>
            <button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 transition text-white py-4 rounded-2xl font-bold text-lg"
            >
              Login
            </button>
          </form>
          <p className="mt-8 text-center text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-blue-700 font-bold"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;