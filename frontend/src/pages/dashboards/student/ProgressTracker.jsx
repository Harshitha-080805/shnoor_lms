import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, ClipboardList, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../../api';
function ProgressTracker() {
  const [enrollments, setEnrollments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const [resEnroll, resCerts] = await Promise.all([
          api.get("/api/courses/enrollments"),
          api.get("/api/courses/certificates"),
        ]);

        if ((resEnroll.status >= 200 && resEnroll.status < 300)) setEnrollments(resEnroll.data);
        if ((resCerts.status >= 200 && resCerts.status < 300)) setRequests(resCerts.data);
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const getStats = () => {
    let totalL = 0;
    let completedL = 0;
    let totalQ = 0;
    let passedQ = 0;

    enrollments.forEach((e) => {
      e.course.modules?.forEach((m) => {
        if (m.title !== "Final Quiz") totalL += m.lessons?.length || 0;

        totalQ += m.quizzes?.length || 0;

        m.quizzes?.forEach((q) => {
          if (e.quiz_attempts?.some((a) => a.quiz === q.id && a.passed)) {
            passedQ++;
          }
        });
      });

      completedL += e.lesson_progress?.filter((p) => p.is_completed).length || 0;
    });

    return { totalL, completedL, totalQ, passedQ };
  };

  const stats = getStats();
  const approvedCerts = requests.filter((r) => r.status?.toLowerCase() === "approved").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Learning Progress Tracker
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Detailed audit of your courses, lessons, and certificates
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                <BookOpen size={24} />
              </div>

              <div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">
                  Courses Enrolled
                </p>
                <h3 className="text-xl font-bold text-white">
                  {enrollments.length}
                </h3>
              </div>
            </div>

            <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} />
              </div>

              <div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">
                  Lessons Done
                </p>
                <h3 className="text-xl font-bold text-white">
                  {stats.completedL}/{stats.totalL}
                </h3>
              </div>
            </div>

            <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                <ClipboardList size={24} />
              </div>

              <div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">
                  Quizzes Passed
                </p>
                <h3 className="text-xl font-bold text-white">
                  {stats.passedQ}/{stats.totalQ}
                </h3>
              </div>
            </div>

            <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center">
                <Target size={24} />
              </div>

              <div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">
                  Certificates Earned
                </p>
                <h3 className="text-xl font-bold text-white">
                  {approvedCerts}
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-800">
                Course Progress
              </h3>
              <div className="h-[300px]">
                {enrollments.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={enrollments.map(e => {
                      let totalL = 0;
                      e.course.modules?.forEach(m => { if(m.title !== "Final Quiz") totalL += m.lessons?.length || 0; });
                      const compL = e.lesson_progress?.filter(p => p.is_completed).length || 0;
                      return { name: e.course.title.substring(0, 15) + "...", progress: totalL > 0 ? Math.round((compL/totalL)*100) : 0 };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 12}} />
                      <YAxis tick={{fontSize: 12}} />
                      <Tooltip />
                      <Line type="monotone" dataKey="progress" stroke="#4f46e5" strokeWidth={3} dot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">No data</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-800">
                Overall Engagement
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Lessons Done", value: stats.completedL, color: "#10b981" },
                        { name: "Lessons Remaining", value: Math.max(0, stats.totalL - stats.completedL), color: "#cbd5e1" }
                      ]}
                      cx="50%" cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[{color: "#10b981"}, {color: "#cbd5e1"}].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProgressTracker;