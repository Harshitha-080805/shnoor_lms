import React, { useState, useEffect } from "react";
import { BookOpen, Users, Clock, AlertCircle, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../../api';

function InstructorOverview() {
  const [stats, setStats] = useState([
    { label: "Total Courses", value: "0", icon: <BookOpen className="text-blue-950" size={24} />, bgColor: "bg-blue-50" },
    { label: "Active Students", value: "0", icon: <Users className="text-blue-950" size={24} />, bgColor: "bg-blue-50" },
    { label: "Pending Assignments", value: "0", icon: <Clock className="text-blue-950" size={24} />, bgColor: "bg-blue-50" },
    { label: "Unread Messages", value: "0", icon: <AlertCircle className="text-blue-950" size={24} />, bgColor: "bg-blue-50" },
  ]);
  const [trendStats, setTrendStats] = useState({ enrollments: 0, completions: 0, active: 0, rate: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const [resCourses, resSubmissions, resStudents] = await Promise.all([
          api.get(`/api/courses/instructor/my-courses`),
          api.get(`/api/courses/instructor/submissions`),
          api.get(`/api/courses/instructor/students`)
        ]);
        let coursesList = [];
        let subsList = [];
        let studentsList = [];
        if ((resCourses.status >= 200 && resCourses.status < 300)) coursesList = resCourses.data;
        if ((resSubmissions.status >= 200 && resSubmissions.status < 300)) subsList = resSubmissions.data;
        if ((resStudents.status >= 200 && resStudents.status < 300)) studentsList = resStudents.data;
        
        const totalCourses = coursesList.length;
        const activeStudents = coursesList.reduce((acc, c) => acc + (parseInt(c.enrollments_count) || 0), 0);
        const pendingSubmissions = subsList.filter(s => !s.is_graded).length;
        setStats([
          { label: "Total Courses", value: totalCourses.toString(), icon: <BookOpen className="text-white" size={24} />, bgColor: "bg-sky-500" },
          { label: "Active Students", value: activeStudents.toString(), icon: <Users className="text-white" size={24} />, bgColor: "bg-teal-500" },
          { label: "Pending Assignments", value: pendingSubmissions.toString(), icon: <Clock className="text-white" size={24} />, bgColor: "bg-amber-500" },
          { label: "Unread Messages", value: "0", icon: <AlertCircle className="text-white" size={24} />, bgColor: "bg-rose-500" },
        ]);
        
        const courseCompletions = studentsList.filter(e => {
          let total = 0;
          e.course.modules?.forEach(m => { total += m.lessons?.length || 0; });
          const completed = e.lesson_progress?.filter(p => p.is_completed).length || 0;
          return total > 0 && Math.round((completed / total) * 100) === 100;
        }).length;
        
        const completionRate = activeStudents > 0 ? Math.round((courseCompletions / activeStudents) * 100) : 0;
        
        setTrendStats({
          enrollments: activeStudents,
          completions: courseCompletions,
          active: activeStudents,
          rate: completionRate
        });
        const cData = coursesList.map(c => {
          const courseStudents = studentsList.filter(e => e.course.id === c.id);
          const completions = courseStudents.filter(e => {
            let total = 0;
            e.course.modules?.forEach(m => { total += m.lessons?.length || 0; });
            const completed = e.lesson_progress?.filter(p => p.is_completed).length || 0;
            return total > 0 && Math.round((completed / total) * 100) === 100;
          }).length;
          
          return {
            name: c.title,
            enrollments: parseInt(c.enrollments_count) || 0,
            completions: completions
          };
        });
        setChartData(cData);
      } catch (e) { } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, []);
  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] flex items-center gap-5 hover:shadow-md transition-shadow">
                <div className={`p-4 rounded-xl ${stat.bgColor}`}>{stat.icon}</div>
                <div className="flex flex-col">
                  <p className="text-xs font-semibold text-blue-200 mb-0.5">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-white leading-tight">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Enrollment Trends</h2>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <Calendar size={16} />
                This Month
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-950/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 border-l-2 border-blue-950 bg-white shadow-sm rounded-r-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">New Enrollments</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-800">{trendStats.enrollments}</span>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-950/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 border-l-2 border-blue-950 bg-white shadow-sm rounded-r-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Course Completions</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-800">{trendStats.completions}</span>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-950/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 border-l-2 border-blue-950 bg-white shadow-sm rounded-r-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Students</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-800">{trendStats.active}</span>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-950/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 border-l-2 border-blue-950 bg-white shadow-sm rounded-r-2xl">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completion Rate</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-800">{trendStats.rate}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#0f172a', fontWeight: 600 }} width={120} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#334155', paddingTop: '10px' }} />
                  <Bar dataKey="enrollments" name="New Enrollments" fill="#172554" radius={[0, 4, 4, 0]} barSize={20} />
                  <Bar dataKey="completions" name="Completions" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export default InstructorOverview;