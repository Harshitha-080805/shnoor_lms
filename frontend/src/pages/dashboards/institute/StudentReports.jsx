import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { useOutletContext } from "react-router-dom";
import {
  Users,
  Search,
  BookOpen,
  Award,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../../api";

function StudentReports() {
  const { orgType } = useOutletContext();
  const learnerText = orgType === 'company' ? 'Employee' : 'Student';
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("Name A-Z");
  const [expandedStudent, setExpandedStudent] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get("/api/org-admin/reports/students");
        setReports(res.data || []);
      } catch (e) {
        console.error("Failed to fetch reports:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const totalStudents = reports.length;
  const totalEnrollments = reports.reduce(
    (sum, r) => sum + (r.total_courses || 0),
    0
  );
  const completedCourses = reports.reduce(
    (sum, r) =>
      sum + (r.courses?.filter((c) => c.completed_at).length || 0),
    0
  );
  const avgCourses =
    totalStudents > 0
      ? (totalEnrollments / totalStudents).toFixed(1)
      : 0;

  const filtered = React.useMemo(() => {
    let dataCopy = reports.filter((r) => {
      const q = search.toLowerCase();
      return (
        (r.full_name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q)
      );
    });

    if (sortOption === "Name A-Z") return dataCopy.sort((a,b) => (a.full_name||'').localeCompare(b.full_name||''));
    if (sortOption === "Name Z-A") return dataCopy.sort((a,b) => (b.full_name||'').localeCompare(a.full_name||''));
    if (sortOption === "Most Enrolled") return dataCopy.sort((a,b) => (b.total_courses || 0) - (a.total_courses || 0));
    if (sortOption === "Most Completed") {
      return dataCopy.sort((a,b) => {
        const aCompleted = a.courses?.filter((c) => c.completed_at).length || 0;
        const bCompleted = b.courses?.filter((c) => c.completed_at).length || 0;
        return bCompleted - aCompleted;
      });
    }

    return dataCopy;
  }, [reports, search, sortOption]);

  // Calculate Chart Data
  const courseCounts = {};
  let totalInProgress = 0;
  let totalCompletedChart = 0;

  reports.forEach(r => {
    (r.courses || []).forEach(c => {
      if (!courseCounts[c.course_title]) courseCounts[c.course_title] = 0;
      courseCounts[c.course_title]++;

      if (c.completed_at) totalCompletedChart++;
      else totalInProgress++;
    });
  });

  const barData = Object.keys(courseCounts)
    .map(title => ({ name: title, Enrollments: courseCounts[title] }))
    .sort((a, b) => b.Enrollments - a.Enrollments)
    .slice(0, 5); // Top 5 courses

  const pieData = [
    { name: "Completed", value: totalCompletedChart },
    { name: "In Progress", value: totalInProgress }
  ];
  const COLORS = ['#10b981', '#3b82f6']; // Emerald for Completed, Blue for In Progress

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-800">{learnerText} Reports</h2>
        <p className="text-surface-500 text-sm mt-1">
          Comprehensive analytics for all approved {learnerText.toLowerCase()}s
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">
              Total {learnerText}s
            </p>
            <h3 className="text-xl font-bold text-white">
              {totalStudents}
            </h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">
              Total Enrollments
            </p>
            <h3 className="text-xl font-bold text-white">
              {totalEnrollments}
            </h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Award size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">
              Completions
            </p>
            <h3 className="text-xl font-bold text-white">
              {completedCourses}
            </h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">
              Avg Courses/{learnerText}
            </p>
            <h3 className="text-xl font-bold text-white">{avgCourses}</h3>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm">
            <h3 className="text-sm font-bold text-surface-800 mb-6 uppercase tracking-wider">Top 5 Courses by Enrollment</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    cursor={{fill: '#f1f5f9'}} 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  />
                  <Bar dataKey="Enrollments" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-surface-800 mb-6 uppercase tracking-wider">Overall Completion Status</h3>
            <div className="h-64 flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-xs font-semibold text-surface-600">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-base-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-200 bg-surface-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
              size={16}
            />
            <input
              type="text"
              placeholder={`Search ${learnerText.toLowerCase()}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 transition-all bg-base-white"
            />
          </div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-base-white border border-surface-200 text-surface-700 text-sm rounded-xl focus:ring-brand-500 focus:border-brand-500 block px-4 py-2 w-full sm:w-auto shadow-sm"
          >
            <option value="Name A-Z">Name A-Z</option>
            <option value="Name Z-A">Name Z-A</option>
            <option value="Most Enrolled">Most Enrolled</option>
            <option value="Most Completed">Most Completed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200 text-xs uppercase tracking-wider text-surface-500 font-semibold">
                  <th className="px-6 py-4 w-8"></th>
                  <th className="px-6 py-4">{learnerText}</th>
                  <th className="px-6 py-4 text-center">Courses Enrolled</th>
                  <th className="px-6 py-4 text-center">Completed</th>
                  <th className="px-6 py-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => {
                  const initials = student.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const completedCount =
                    student.courses?.filter((c) => c.completed_at).length || 0;
                  const isExpanded = expandedStudent === student.id;

                  return (
                    <React.Fragment key={student.id}>
                      <tr
                        className="hover:bg-surface-50 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedStudent(isExpanded ? null : student.id)
                        }
                      >
                        <td className="px-6 py-4">
                          <button className="text-surface-400 hover:text-surface-600 transition-colors">
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-sm shadow-sm border border-accent-200">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-surface-800">
                                {student.full_name}
                              </p>
                              <p className="text-xs text-surface-500">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-surface-800">
                            {student.total_courses || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                              completedCount > 0
                                ? "bg-success-100 text-success-700"
                                : "bg-surface-100 text-surface-500"
                            }`}
                          >
                            {completedCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">
                          {new Date(student.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" className="px-6 py-0">
                            <div className="bg-surface-50 rounded-xl p-5 mb-4 border border-surface-100">
                              <h4 className="text-sm font-bold text-surface-700 mb-3">
                                Enrolled Courses
                              </h4>
                              {student.courses && student.courses.length > 0 ? (
                                <div className="space-y-2">
                                  {student.courses.map((course, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between bg-base-white p-3 rounded-lg border border-surface-100"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                                          <BookOpen size={14} />
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-surface-700">
                                            {course.course_title}
                                          </p>
                                          {course.assessments &&
                                            course.assessments.length > 0 && (
                                              <p className="text-xs text-surface-400">
                                                {course.assessments.length}{" "}
                                                assessment(s) graded
                                              </p>
                                            )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {course.assessments &&
                                          course.assessments.length > 0 && (
                                            <div className="flex gap-1">
                                              {course.assessments.map(
                                                (a, aIdx) => (
                                                  <span
                                                    key={aIdx}
                                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700"
                                                    title={a.assessment_title}
                                                  >
                                                    {a.grade || "N/A"}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          )}
                                        {course.completed_at ? (
                                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-success-100 text-success-700">
                                            Completed
                                          </span>
                                        ) : (
                                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700">
                                            In Progress
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-surface-400">
                                  No courses enrolled yet
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-12 text-center text-surface-400"
                    >
                      <Users
                        size={48}
                        className="mx-auto mb-4 text-surface-300"
                      />
                      <p className="text-lg font-semibold text-surface-500">
                        No {learnerText.toLowerCase()} data found
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentReports;
