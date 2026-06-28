import React,{useState,useEffect} from 'react';
import { useLocation } from 'react-router-dom';
import {Users,Search,Award,BookOpen,TrendingUp,Mail} from 'lucide-react';
import api from '../../../api';

function StudentProgress(){
  const location = useLocation();
  const[enrollments,setEnrollments]=useState([]);
  const[loading,setLoading]=useState(true);
  const[activeCourse,setActiveCourse]=useState('all');
  const[search,setSearch]=useState(location.state?.searchTerm || '');
  const[sortOption,setSortOption]=useState('Newest');


  const fetchEnrollments=async()=>{
    try{
      const res=await api.get(`/api/courses/instructor/students`);
      if((res.status >= 200 && res.status < 300)){
        const data=res.data;
        setEnrollments(data);
      }
    }catch(e){}finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    fetchEnrollments();
  },[]);

  const getProgress=(e)=>{
    let total=0;
    e.course.modules?.forEach(m=>{total+=m.lessons?.length||0;});
    const completed=e.lesson_progress?.filter(p=>p.is_completed).length||0;
    return total>0?Math.round((completed/total)*100):0;
  };

  const getQuizScorePct=(e)=>{
    if(!e.quiz_attempts||e.quiz_attempts.length===0)return null;
    const totalScore=e.quiz_attempts.reduce((sum,a)=>sum+a.score,0);
    const totalQuestions=e.quiz_attempts.reduce((sum,a)=>sum+a.total_questions,0);
    return totalQuestions>0?Math.round((totalScore/totalQuestions)*100):null;
  };

  const courseTitles=['all',...new Set(enrollments.map(e=>e.course?.title))];

  const filteredEnrollments=enrollments.filter(e=>{
    if(activeCourse==='all')return true;
    return e.course?.title===activeCourse;
  });

  const totalStudents=new Set(filteredEnrollments.map(e=>e.student?.id)).size;
  const completions=filteredEnrollments.filter(e=>getProgress(e)===100).length;
  const avgProgress=filteredEnrollments.length>0 
    ?Math.round(filteredEnrollments.reduce((sum,e)=>sum+getProgress(e),0)/filteredEnrollments.length) 
    :0;
  const activeCoursesCount=new Set(filteredEnrollments.map(e=>e.course?.id)).size;

  const sortedEnrollments = React.useMemo(() => {
    if (!filteredEnrollments) return [];
    let dataCopy = [...filteredEnrollments];
    
    // First apply search filters
    if (search) {
      dataCopy = dataCopy.filter(e => {
        const sName=(e.student?.full_name||'').toLowerCase();
        const sEmail=(e.student?.email||'').toLowerCase();
        const query=search.toLowerCase();
        return sName.includes(query)||sEmail.includes(query);
      });
    }
    
    // Then apply sort
    if (sortOption === 'Newest') return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === 'Oldest') return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === 'Title A-Z') return dataCopy.sort((a,b) => (a.student?.full_name||'').localeCompare(b.student?.full_name||''));
    if (sortOption === 'Title Z-A') return dataCopy.sort((a,b) => (b.student?.full_name||'').localeCompare(a.student?.full_name||''));
    
    return dataCopy;
  }, [filteredEnrollments, search, sortOption]);

  return(
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Students List & Progress</h2>
          <p className="text-slate-500 text-sm mt-1">Track your learners' progress across all courses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Total Students</p>
            <h3 className="text-xl font-bold text-white">{totalStudents}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Award size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Completions</p>
            <h3 className="text-xl font-bold text-white">{completions}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Avg Progress</p>
            <h3 className="text-xl font-bold text-white">{avgProgress}%</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
            <BookOpen size={20} />
          </div>
          <div>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Active Courses</p>
            <h3 className="text-xl font-bold text-white">{activeCoursesCount}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              value={activeCourse}
              onChange={(e)=>setActiveCourse(e.target.value)}
              className="w-full md:w-64 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white text-sm font-medium text-slate-700 shadow-sm"
            >
              {courseTitles.map(course=>(
                <option key={course} value={course}>
                  {course==='all'?'All Courses':course}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
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
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search students..." 
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {loading?(
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
          </div>
        ):(
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Course Enrolled</th>
                  <th className="px-6 py-4 text-center">Progress</th>
                  <th className="px-6 py-4 text-center">Quiz Score</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedEnrollments.map((e)=>{
                  const pct=getProgress(e);
                  const score=getQuizScorePct(e);
                  const name=e.student?.full_name||'Student';
                  const email=e.student?.email||'';
                  const initials=name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
                  return(
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm border border-indigo-200">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{name}</p>
                            <p className="text-xs text-slate-500">{email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-slate-700">{e.course?.title}</p>
                        <p className="text-xs text-slate-400">Since {new Date(e.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${pct===100?'bg-emerald-500':'bg-blue-500'}`} 
                              style={{width:`${pct}%`}}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {score!==null?(
                          <span className="font-bold text-slate-800">{score}%</span>
                        ):(
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider
                          ${pct===100?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}
                        >
                          {pct===100?'completed':'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2 transition-opacity">
                          <button 
                            onClick={()=>alert(`Emailing student at ${email}`)}
                            className="p-1.5 text-slate-400 hover:text-blue-950 hover:bg-blue-50 rounded-lg transition-colors" 
                            title="Message Student"
                          >
                            <Mail size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedEnrollments.length===0&&(
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      No students found.
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

export default StudentProgress;