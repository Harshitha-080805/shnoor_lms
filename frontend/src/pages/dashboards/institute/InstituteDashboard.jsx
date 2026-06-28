import { useEffect, useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import logo from "../../../assets/shnoor-logo.jpeg";
import GlobalSearch from "../../../components/GlobalSearch";
import { chatService } from "../../../services/chatService";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  LogOut,
  UserCheck,
  TrendingUp,
  CreditCard,
  User,
  Bell,
  Award,
  MessageSquare
} from "lucide-react";
import api from "../../../api";

const isTokenValid = (t) => {
  if (!t) return false;
  try {
    const p = JSON.parse(atob(t.split(".")[1]));
    return p.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};

function InstituteDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePic, setProfilePic] = useState(sessionStorage.getItem("profile_pic"));

  const menuItems = [
    { name: "Overview", path: "/institute-dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "Manage Instructors", path: "/institute-dashboard/instructors", icon: <UserCheck size={20} /> },
    { name: "Manage Learners", path: "/institute-dashboard/learners", icon: <Users size={20} /> },
    { name: "Course Catalog", path: "/institute-dashboard/courses", icon: <BookOpen size={20} /> },
    { name: "Learning Progress", path: "/institute-dashboard/progress", icon: <TrendingUp size={20} /> },
    { name: "Reports and Analytics", path: "/institute-dashboard/reports", icon: <BarChart3 size={20} /> },
    { name: "Exam Evaluation", path: "/institute-dashboard/exams", icon: <Award size={20} /> },
    { name: "Subscriptions", path: "/institute-dashboard/subscriptions", icon: <CreditCard size={20} /> },
    { name: "Certificates", path: "/institute-dashboard/certificates", icon: <Award size={20} /> },
    { name: "Profile", path: "/institute-dashboard/profile", icon: <User size={20} /> },
    { name: "Announcements", path: "/institute-dashboard/announcements", icon: <Bell size={20} /> },
    { name: "Messages", path: "/institute-dashboard/chat", icon: <MessageSquare size={20} /> },
  ];

  useEffect(() => {
    // Listen for custom storage event to update profile pic in real time
    const handleStorageUpdate = () => {
      setProfilePic(sessionStorage.getItem("profile_pic"));
    };
    window.addEventListener('storage', handleStorageUpdate);
    
    // Fetch unread count
    const fetchUnread = async () => {
      try {
        const count = await chatService.getUnreadCount();
        setUnreadCount(count);
      } catch (err) { }
    };
    
    const token = sessionStorage.getItem("access");
    let interval;
    if (isTokenValid(token)) {
      fetchUnread();
      interval = setInterval(fetchUnread, 30000);
    }
    
    return () => {
      window.removeEventListener('storage', handleStorageUpdate);
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("access");
    const role = sessionStorage.getItem("role");
    if (!isTokenValid(token)) {
      sessionStorage.clear();
      navigate("/login");
    } else if (role !== "organization_admin" && role !== "manager") {
      if (role === "admin") {
        navigate("/admin-dashboard");
      } else if (role === "instructor") {
        navigate("/instructor-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const getPageTitle = () => {
    const currentPath = location.pathname;
    if (currentPath === "/institute-dashboard") return "Institute Overview";
    const item = menuItems.find(m => m.path === currentPath);
    return item ? item.name : "Institute Dashboard";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <aside className="w-60 bg-blue-950 text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-20">
        
        <div className="px-6 py-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Logo"
              className="h-12 w-12 rounded-xl bg-white p-1 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                SHNOOR LMS
              </h1>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                Institute Portal
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <nav className="px-3 py-6 space-y-1.5">
            {menuItems.map((item, index) => {
              const isActive =
                location.pathname === item.path ||
                (location.pathname.startsWith(item.path) &&
                  item.path !== "/institute-dashboard");
                return (
                  <Link
                    key={index}
                    to={item.path}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${isActive
                        ? "bg-yellow-500 text-blue-950 font-bold shadow-[0_4px_15px_-3px_rgba(234,179,8,0.5)]"
                        : "text-blue-50 hover:bg-blue-900"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.name}
                    </div>
                    {item.name === "Messages" && unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full bg-blue-900 hover:bg-red-600 text-blue-50 hover:text-white py-2.5 px-4 rounded-xl text-[12px] font-bold transition flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        
      </aside>
      
      <main className="ml-60 flex-1 flex flex-col min-h-screen min-w-0 w-[calc(100%-15rem)]">
        <header className="bg-white px-8 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-50">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {getPageTitle()}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <GlobalSearch />
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-sm overflow-hidden">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (sessionStorage.getItem("username") || "Admin")[0].toUpperCase()
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">
                  {sessionStorage.getItem("username") || (sessionStorage.getItem("loggedInUser") ? JSON.parse(sessionStorage.getItem("loggedInUser")).name : "Organization Admin")}
                </p>
                <p className="text-xs text-slate-500">Organization Admin</p>
              </div>
            </div>
          </div>
        </header>
        <section className="p-8 flex-1">

      <Outlet context={{ orgType: 'institute' }} />
    </section>
      </main>
    </div>
  );
}

export default InstituteDashboard;