import React, { useState, useEffect } from 'react';
import { Target, CheckSquare, Code, PlayCircle, Clock, BarChart2, Award, ChevronRight, Activity, Calendar, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';

function StudentGlobalArenas() {
  const [arenas, setArenas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState("Newest");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [arenasRes, dashboardRes] = await Promise.all([
        api.get('/api/practice-arenas'),
        api.get('/api/practice-arenas/student/dashboard')
      ]);
      setArenas(arenasRes.data);
      setDashboard(dashboardRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0m 0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const sortedArenas = React.useMemo(() => {
    let dataCopy = [...arenas];

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      dataCopy = dataCopy.filter(a => {
        if (a.title?.toLowerCase().includes(q)) return true;
        if (a.difficulty?.toLowerCase().includes(q)) return true;
        if (a.time_limit_minutes?.toString().includes(q)) return true;
        if ((q.includes('mcq') || q.includes('mcqs')) && a.is_mcq_enabled) return true;
        if ((q.includes('cod') || q.includes('code')) && a.is_coding_enabled) return true;
        return false;
      });
    }

    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === "Title A-Z") return dataCopy.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (sortOption === "Title Z-A") return dataCopy.sort((a,b) => (b.title||'').localeCompare(a.title||''));

    return dataCopy;
  }, [arenas, searchQuery, sortOption]);

  if (loading || !dashboard) {
    return (
      <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
      </div>
    );
  }

  const { stats, recent, leaderboard } = dashboard;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-blue-600 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden z-0">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-blue-500 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 bg-blue-700 rounded-full opacity-50 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-sm shrink-0">
               <Target size={32} className="text-white drop-shadow-sm" />
             </div>
             <div>
               <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 rounded-full text-[11px] uppercase tracking-wider font-bold mb-1.5 backdrop-blur-sm">
                 <Target size={12} /> Practice Arena
               </div>
               <h1 className="text-2xl md:text-3xl font-black mb-1">Sharpen your skills</h1>
               <p className="text-blue-100 text-sm md:text-base">Complete challenges and climb the leaderboard.</p>
             </div>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 sm:flex-none sm:w-[130px] border border-white/20 flex flex-col items-center text-center">
              <div className="text-blue-200 text-[11px] uppercase tracking-wider font-bold mb-1 flex items-center justify-center gap-1.5"><Target size={12}/> Attempted</div>
              <div className="text-2xl font-black leading-none mt-1">{stats?.arenas_attempted || 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 sm:flex-none sm:w-[130px] border border-white/20 flex flex-col items-center text-center">
              <div className="text-blue-200 text-[11px] uppercase tracking-wider font-bold mb-1 flex items-center justify-center gap-1.5"><BarChart2 size={12}/> Avg Score</div>
              <div className="text-2xl font-black leading-none mt-1">{stats?.avg_score || 0}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 flex-1 sm:flex-none sm:w-[150px] border border-white/20 flex flex-col items-center text-center">
              <div className="text-blue-200 text-[11px] uppercase tracking-wider font-bold mb-1 flex items-center justify-center gap-1.5"><Clock size={12}/> Total Time</div>
              <div className="text-2xl font-black leading-none mt-1">{formatTime(stats?.total_time_seconds)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Your Practice Arenas Section */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h2 className="text-xl font-bold text-slate-900">Your Practice Arenas</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-4 py-2 w-full sm:w-auto shadow-sm"
            >
              <option value="Newest">Sort by: Newest</option>
              <option value="Oldest">Sort by: Oldest</option>
              <option value="Title A-Z">Title A-Z</option>
              <option value="Title Z-A">Title Z-A</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search arenas..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:font-normal"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sortedArenas.map((arena, i) => {
            const colors = [
              { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
              { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
              { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
              { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' }
            ];
            const color = colors[i % colors.length];

            return (
              <div key={arena.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition duration-300">
                <div className="p-5 flex-1 flex flex-col">
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${color.bg} ${color.text} ${color.border} border`}>
                    <Code size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1">{arena.title}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {arena.is_mcq_enabled && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 text-slate-600 rounded">MCQs</span>}
                    {arena.is_coding_enabled && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 text-slate-600 rounded">Coding</span>}
                  </div>

                  <div className="flex items-center gap-4 mt-auto mb-4 text-xs font-bold text-slate-500">
                    {arena.time_limit_minutes > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" /> {arena.time_limit_minutes} Mins
                      </div>
                    )}
                    {arena.difficulty && (
                      <div className="flex items-center gap-1.5">
                        <Activity size={14} className="text-slate-400" /> {arena.difficulty}
                      </div>
                    )}
                  </div>

                  <div>
                    <button 
                      onClick={() => navigate(`/student-dashboard/practice-arena/${arena.id}`)}
                      className="w-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold py-2.5 rounded-xl text-sm transition"
                    >
                      Start Arena
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {sortedArenas.length === 0 && (
            <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              No practice arenas found.
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Attempts */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Activity className="text-blue-500"/> Recent Attempts</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            {recent && recent.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="p-4 pl-5">Arena</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Time Taken</th>
                    <th className="p-4">Attempted On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {recent.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-5 font-bold text-slate-800">{r.title}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {r.mcq_count > 0 && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 text-slate-500 rounded">MCQs</span>}
                          {r.coding_count > 0 && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 text-slate-500 rounded">Code</span>}
                        </div>
                      </td>
                      <td className="p-4 font-black text-blue-600">{r.total_score} pts</td>
                      <td className="p-4 text-slate-600 font-medium flex items-center gap-1">
                        <Clock size={14} className="text-slate-400"/> {formatTime(r.time_taken_seconds)}
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-semibold">
                        {new Date(r.attempted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                You haven't attempted any arenas yet.
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Award className="text-amber-500"/> Leaderboard <span className="text-xs font-normal text-slate-500">(All Time)</span></h3>
          </div>
          <div className="p-5 flex-1 space-y-4">
            {leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((user, idx) => (
                <div key={user.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                  <div className={`w-8 text-center font-black ${idx === 0 ? 'text-amber-500 text-xl' : idx === 1 ? 'text-slate-400 text-lg' : idx === 2 ? 'text-amber-700 text-lg' : 'text-slate-300'}`}>
                    #{idx + 1}
                  </div>
                  <img src={user.profile_pic || `https://ui-avatars.com/api/?name=${user.full_name}&background=e2e8f0`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="avatar" />
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 text-sm">{user.full_name}</div>
                    <div className="text-xs font-bold text-blue-600">{user.total_score} pts</div>
                  </div>
                  {idx < 3 && <Award size={20} className={idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-amber-700'} />}
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 text-sm py-8">
                No scores on the leaderboard yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default StudentGlobalArenas;
