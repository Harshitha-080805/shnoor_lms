import{useState,useEffect}from"react";
import{useNavigate}from"react-router-dom";
import logo from"../../assets/shnoor-logo.jpeg";

function InstituteDashboard(){
  const navigate=useNavigate();
  const[activeMenu,setActiveMenu]=useState("Overview");

  const menuItems=[
    "Overview",
    "Manage Instructors",
    "Manage Learners",
    "Courses Catalog",
    "Subscriptions",
    "Settings"
  ];

  useEffect(()=>{
    const token=localStorage.getItem("access");
    const role=localStorage.getItem("role");
    if(!token){
      navigate("/login");
    }else if(role!=="organization_admin"&&role!=="manager"){
      if(role==="admin"){
        navigate("/admin-dashboard");
      }else if(role==="instructor"){
        navigate("/instructor-dashboard");
      }else{
        navigate("/student-dashboard");
      }
    }
  },[navigate]);

  const handleLogout=()=>{
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen fixed left-0 top-0 flex flex-col justify-between shadow-lg">
        <div>
          <div className="px-6 py-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-12 w-12 rounded-xl bg-white p-1 object-contain"/>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">SHNOOR LMS</h1>
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Institute Portal</p>
              </div>
            </div>
          </div>
          <nav className="px-3 py-6 space-y-1.5">
            {menuItems.map((item,index)=>(
              <button
                key={index}
                onClick={()=>setActiveMenu(item)}
                className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeMenu===item
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full bg-slate-800 hover:bg-red-900 text-slate-300 hover:text-white py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{activeMenu}</h2>
            <p className="text-sm text-slate-500 mt-1">Control panel for managing your institute.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-900">Welcome, {localStorage.getItem("username")||"Institute Admin"}</span>
          </div>
        </header>

        <div className="p-8 flex-1">
          <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{activeMenu} Module</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">This section is currently under development. You can configure portal settings and assign managers/learners here.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InstituteDashboard;