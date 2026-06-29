import { useState, useEffect, useMemo } from "react";
import { BookOpen, Search, CheckCircle, XCircle, ArrowLeft, User, Users } from "lucide-react";
import { useLocation } from "react-router-dom";
import api from "../../../api";

function InstituteCourses() {
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(location.state?.searchTerm || "");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'table'
  const [gridFilter, setGridFilter] = useState("all");
  const [sortOption, setSortOption] = useState("Newest");
  const [selectedCourse, setSelectedCourse] = useState(null);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/org-admin/instructors/courses");
      setCourses(res.data || []);
    } catch (e) {
      console.error("Failed to fetch courses:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleReview = async (id, action) => {
    const actionText = action === 'approve' ? 'approve' : 'reject and delete';
    if (!window.confirm(`Are you sure you want to ${actionText} this course?`)) return;
    try {
      const res = await api.post(`/api/org-admin/instructors/courses/${id}/review`, { action });
      if (res.status >= 200 && res.status < 300) {
        fetchCourses();
        if (viewMode === 'detail') setViewMode('table');
      }
    } catch (err) {
      alert(`Failed to ${action} course.`);
    }
  };

  const handleManageClick = (courseTitle) => {
    setSearch(courseTitle);
    setViewMode("table");
  };

  const totalEnrollments = courses.reduce(
    (sum, c) => sum + (parseInt(c.total_enrollments) || 0),
    0
  );
  const publishedCount = courses.filter((c) => c.is_published && c.is_approved).length;

  const sortedGrid = useMemo(() => {
    let dataCopy = [...courses].filter(Boolean);
    
    // Grid Filter
    dataCopy = dataCopy.filter((c) => {
      if (gridFilter === "published" && (!c.is_published || !c.is_approved)) return false;
      if (gridFilter === "pending" && c.is_approved) return false;
      if (location.state?.targetCourseId && c.id === location.state.targetCourseId) return true;
      if (search) {
        const q = search.toLowerCase();
        if (!((c.title || "").toLowerCase().includes(q) || (c.instructor?.full_name || "").toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });

    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0));
    if (sortOption === "Title A-Z") return dataCopy.sort((a,b) => (a?.title||'').localeCompare(b?.title||''));
    if (sortOption === "Title Z-A") return dataCopy.sort((a,b) => (b?.title||'').localeCompare(a?.title||''));
    
    return dataCopy;
  }, [courses, gridFilter, search, location.state, sortOption]);

  const sortedTable = useMemo(() => {
    let dataCopy = [...courses].filter(Boolean);
    
    dataCopy = dataCopy.filter((c) => {
      if (filter === "published") return c.is_published && c.is_approved;
      if (filter === "pending") return !c.is_approved;
      return true;
    }).filter((c) => {
      if (location.state?.targetCourseId && c.id === location.state.targetCourseId) return true;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (c.title || "").toLowerCase().includes(q) ||
        (c.instructor?.full_name || "").toLowerCase().includes(q)
      );
    });

    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0));
    if (sortOption === "Title A-Z") return dataCopy.sort((a,b) => (a?.title||'').localeCompare(b?.title||''));
    if (sortOption === "Title Z-A") return dataCopy.sort((a,b) => (b?.title||'').localeCompare(a?.title||''));
    
    return dataCopy;
  }, [courses, filter, search, location.state, sortOption]);

  const renderGrid = () => (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Total Courses</p>
            <h3 className="text-xl font-bold text-white">{courses.length}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Published</p>
            <h3 className="text-xl font-bold text-white">{publishedCount}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Users size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Total Enrollments</p>
            <h3 className="text-xl font-bold text-white">{totalEnrollments}</h3>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-8">
        {["all", "published", "pending"].map((f) => (
          <button
            key={f}
            onClick={() => setGridFilter(f)}
            className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
              gridFilter === f
                ? "bg-blue-950 text-white shadow-md"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All Courses" : f === "published" ? "Published" : "Pending Review"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sortedGrid.map((course) => (
          <div key={course.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="h-40 bg-slate-100 relative p-4 overflow-hidden">
              {(course.thumbnail_file || course.thumbnail_url) && (
                <img 
                  src={(course.thumbnail_file || course.thumbnail_url).startsWith('http') ? (course.thumbnail_file || course.thumbnail_url) : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${(course.thumbnail_file || course.thumbnail_url).replace(/\\/g, '/')}`} 
                  alt={course.title} 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
              )}
              <span className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm border border-slate-200 z-10">
                {course.category || "General"}
              </span>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-black text-slate-900 text-lg mb-2 leading-tight">{course.title}</h3>
              <div className="flex items-center gap-2 mb-6">
                <User size={14} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-500">{course.instructor?.full_name || "Unknown"}</span>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-600">
                  {course.total_enrollments || 0} Enrolled
                </span>
                <button 
                  onClick={() => handleManageClick(course.title)}
                  className="text-sm font-bold text-blue-950 hover:text-blue-700 transition-colors flex items-center"
                >
                  Manage <span className="ml-1">&gt;</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {sortedGrid.length === 0 && (
        <div className="py-12 text-center text-slate-400">
          <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-semibold text-slate-500">No courses match this filter.</p>
        </div>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="space-y-6">
      <button 
        onClick={() => { setViewMode("grid"); setSearch(""); }}
        className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 mb-2 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Catalog
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-end items-center gap-3">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          >
            <option value="Newest">Sort by: Newest</option>
            <option value="Oldest">Sort by: Oldest</option>
            <option value="Title A-Z">Title A-Z</option>
            <option value="Title Z-A">Title Z-A</option>
          </select>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search courses or instructors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Instructor</th>
                  <th className="px-6 py-4 text-center">Enrollments</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTable.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-800">{course.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{course.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                          {(course.instructor?.full_name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{course.instructor?.full_name}</p>
                          <p className="text-xs text-slate-400">{course.instructor?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-bold text-slate-800">{course.total_enrollments || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-2">
                        {course.is_published && course.is_approved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                            <CheckCircle size={12} /> Published
                          </span>
                        ) : !course.is_approved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            Draft
                          </span>
                        )}
                        {!course.is_approved && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(course.id, 'approve')}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(course.id, 'reject')}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(course.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {sortedTable.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-12 text-center text-slate-400"
                    >
                      <BookOpen
                        size={48}
                        className="mx-auto mb-4 text-slate-300"
                      />
                      <p className="text-lg font-semibold text-slate-500">
                        No courses found
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'grid' ? (
        renderGrid()
      ) : (
        renderTable()
      )}
    </div>
  );
}

export default InstituteCourses;
