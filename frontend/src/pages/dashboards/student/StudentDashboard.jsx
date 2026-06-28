import { useEffect, useState } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import logo from "../../../assets/shnoor-logo.jpeg";
import GlobalSearch from "../../../components/GlobalSearch";
import { chatService } from "../../../services/chatService";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileText,
  Target,
  Award,
  CreditCard,
  LogOut,
  MessageSquare,
  Bell,
  Trophy,
  User,
  TrendingUp,
  FileCheck,
} from "lucide-react";

const isTokenValid = (t) => {
  if (!t) return false;

  try {
    const p = JSON.parse(atob(t.split(".")[1]));
    return p.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};

function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePic, setProfilePic] = useState(sessionStorage.getItem("profile_pic"));

  const menuItems = [
    { name: "Overview", path: "/student-dashboard", icon: <LayoutDashboard size={20} /> },
    { name: "My Courses", path: "/student-dashboard/courses", icon: <BookOpen size={20} /> },
    { name: "Quizzes", path: "/student-dashboard/quizzes", icon: <ClipboardList size={20} /> },
    { name: "Assignments", path: "/student-dashboard/assignments", icon: <FileText size={20} /> },
    { name: "Exams", path: "/student-dashboard/exams", icon: <FileCheck size={20} /> },
    { name: "Practice Arena", path: "/student-dashboard/practice-arena", icon: <Target size={20} /> },
    { name: "Progress Tracker", path: "/student-dashboard/progress", icon: <TrendingUp size={20} /> },
    { name: "Certificates", path: "/student-dashboard/certificates", icon: <Award size={20} /> },
    { name: "Subscription", path: "/student-dashboard/subscription", icon: <CreditCard size={20} /> },
    { name: "Leaderboards", path: "/student-dashboard/leaderboards", icon: <Trophy size={20} /> },
    { name: "Announcements", path: "/student-dashboard/announcements", icon: <Bell size={20} /> },
    { name: "Messages", path: "/student-dashboard/chat", icon: <MessageSquare size={20} /> },
    { name: "Profile", path: "/student-dashboard/profile", icon: <User size={20} /> },
  ];

  const learnerType = sessionStorage.getItem("learnerType")?.toLowerCase() || "";
  if (learnerType !== "independent") {
    const idx = menuItems.findIndex(m => m.name === "Subscription");
    if (idx !== -1) menuItems.splice(idx, 1);
  }

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const count = await chatService.getUnreadCount();
        setUnreadCount(count);
      } catch (err) { }
    };
    const token = sessionStorage.getItem("access");
    if (isTokenValid(token)) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setProfilePic(sessionStorage.getItem("profile_pic"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("access");
    const role = sessionStorage.getItem("role");

    if (!isTokenValid(token)) {
      sessionStorage.clear();
      navigate("/login");
    } else if (role !== "learner") {
      if (role === "admin") navigate("/admin-dashboard");
      else if (role === "organization_admin" || role === "manager") navigate("/institute-dashboard");
      else if (role === "instructor") navigate("/instructor-dashboard");
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const getPageTitle = () => {
    const item = menuItems.find((m) => m.path === location.pathname);
    return item ? item.name : "Learner Portal";
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
              <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                Learner Portal
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
                    item.path !== "/student-dashboard");

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
      <main className="ml-60 flex-1 flex flex-col min-h-screen">
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
                  (sessionStorage.getItem("username") || "Learner")[0].toUpperCase()
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{sessionStorage.getItem("username") || "Learner"}</p>
                <p className="text-xs text-slate-500 capitalize">{(sessionStorage.getItem("learnerType") || "Learner").toLowerCase()}</p>
              </div>
            </div>
          </div>
        </header>
        <section className="p-8 flex-1">

      <Outlet />
    </section>
      </main>
    </div>
  );
}

export default StudentDashboard;