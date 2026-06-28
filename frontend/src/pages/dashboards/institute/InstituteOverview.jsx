import { useState, useEffect } from "react";
import { GraduationCap, Users, BookOpen, TrendingUp, Activity, Clock, User } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from "../../../api";

function InstituteOverview() {
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalInstructors: 0,
    activeCourses: 0,
    avgCompletion: 0,
    platformGrowth: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const res = await api.get("/api/org-admin/overview-stats");
        setStats(res.data);
      } catch (e) {
        console.error("Failed to load overview stats:", e);
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, []);

  const statCards = [
    {
      label: "TOTAL LEARNERS",
      value: stats.totalLearners.toLocaleString(),
      icon: <GraduationCap className="text-white" size={24} />,
      bgColor: "bg-sky-500 shadow-lg shadow-sky-500/20",
    },
    {
      label: "TOTAL INSTRUCTORS",
      value: stats.totalInstructors.toLocaleString(),
      icon: <Users className="text-white" size={24} />,
      bgColor: "bg-teal-500 shadow-lg shadow-teal-500/20",
    },
    {
      label: "ACTIVE COURSES",
      value: stats.activeCourses.toLocaleString(),
      icon: <BookOpen className="text-white" size={24} />,
      bgColor: "bg-purple-500 shadow-lg shadow-purple-500/20",
    },
    {
      label: "AVG COMPLETION",
      value: `${stats.avgCompletion}%`,
      icon: <TrendingUp className="text-white" size={24} />,
      bgColor: "bg-rose-500 shadow-lg shadow-rose-500/20",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 bg-[#f8fafc] min-h-screen">
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="bg-blue-950 p-6 rounded-xl border border-blue-900 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col">
              <p className="text-[11px] font-bold text-blue-200 tracking-wider mb-2 uppercase">
                {stat.label}
              </p>
              <h3 className="text-3xl font-black text-white leading-none">
                {stat.value}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Platform Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <Activity className="text-slate-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800">
              Platform Growth
            </h3>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={stats.platformGrowth}
                margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                  ticks={[0, 350, 700, 1050, 1400]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                  itemStyle={{ fontSize: "12px", fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="learners"
                  name="Learners"
                  stroke="#eab308"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#fff", stroke: "#eab308", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="courses"
                  name="Courses"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#fff", stroke: "#3b82f6", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="text-slate-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800">
              Recent Activity
            </h3>
          </div>
          
          <div className="space-y-6">
            {stats.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm text-slate-700 leading-snug">
                    <span className="font-bold text-slate-900">{activity.user}</span> {activity.action}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstituteOverview;
