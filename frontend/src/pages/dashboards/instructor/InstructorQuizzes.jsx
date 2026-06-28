import React,{useState,useEffect} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {ClipboardList,Plus,Search,Edit,BookOpen,HelpCircle,X} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../../api';

function InstructorQuizzes(){
  const navigate=useNavigate();
  const location = useLocation();
  const[courses,setCourses]=useState([]);
  const[quizzes,setQuizzes]=useState([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState(location.state?.searchTerm || '');
  const[sortOption,setSortOption]=useState('Newest');
  const[showCreateModal,setShowCreateModal]=useState(false);

  const[quizTitle,setQuizTitle]=useState('');
  const[selectedCourseId,setSelectedCourseId]=useState('');
  const[selectedModuleId,setSelectedModuleId]=useState('');
  const[quizAnalytics,setQuizAnalytics]=useState([]);


  const fetchQuizzesAndCourses=async()=>{
    try{
      const res=await api.get(`/api/courses/instructor/my-courses`);
      if((res.status >= 200 && res.status < 300)){
        const data=res.data;
        setCourses(data);
        const extracted=[];
        data.forEach(course=>{
          course.modules?.forEach(mod=>{
            mod.quizzes?.forEach(quiz=>{
              extracted.push({
                ...quiz,
                courseTitle:course.title,
                courseId:course.id,
                moduleTitle:mod.title,
                moduleId:mod.id,
                questionsCount:quiz.questions?.length||0
              });
            });
          });
        });
        setQuizzes(extracted);
      }
    }catch(e){
      console.error(e);
    }

    try {
      const analyticsRes = await api.get('/api/courses/instructor/analytics/quizzes');
      if(analyticsRes.status >= 200 && analyticsRes.status < 300) {
        const formattedAnalytics = analyticsRes.data.map(q => ({
          ...q,
          pending_count: Math.max(0, parseInt(q.total_enrolled) - parseInt(q.submitted_count)),
          submitted_count: parseInt(q.submitted_count)
        }));
        setQuizAnalytics(formattedAnalytics);
      }
    }catch(e){
      console.error(e);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    fetchQuizzesAndCourses();
  },[]);

  const handleCreateQuiz=async(e)=>{
    e.preventDefault();
    if(!quizTitle.trim()||!selectedModuleId||!selectedCourseId)return;
    try{
      const res=await api.post(`/api/courses/modules/${selectedModuleId}/quizzes`, {title:quizTitle});
      if((res.status >= 200 && res.status < 300)){
        alert("Quiz created successfully! Redirecting to Course Builder to add questions.");
        setShowCreateModal(false);
        setQuizTitle('');
        setSelectedCourseId('');
        setSelectedModuleId('');
        navigate(`/instructor-dashboard/courses/${selectedCourseId}/build`);
      }else{
        alert("Failed to create quiz");
      }
    }catch(e){
      alert("Failed to create quiz");
    }
  };

  const totalQuizzes=quizzes.length;
  const totalQuestions=quizzes.reduce((sum,q)=>sum+q.questionsCount,0);
  const coursesWithQuizzes=new Set(quizzes.map(q=>q.courseId)).size;

  const sortedQuizzes = React.useMemo(() => {
    if (!quizzes) return [];
    let dataCopy = [...quizzes];
    
    // First apply search filters
    if (search) {
      dataCopy = dataCopy.filter(q => 
        (q.title||'').toLowerCase().includes(search.toLowerCase())||
        (q.courseTitle||'').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply sort
    if (sortOption === 'Newest') return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === 'Oldest') return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === 'Title A-Z') return dataCopy.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (sortOption === 'Title Z-A') return dataCopy.sort((a,b) => (b.title||'').localeCompare(a.title||''));
    
    return dataCopy;
  }, [quizzes, search, sortOption]);

  const selectedCourse=courses.find(c=>c.id===parseInt(selectedCourseId));
  const modulesList=selectedCourse?selectedCourse.modules||[]:[];

  return(
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quizzes</h2>
          <p className="text-slate-500 text-sm mt-1">Manage quizzes, MCQs, and student assessments</p>
        </div>
        <button 
          onClick={()=>setShowCreateModal(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Create Quiz
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Total Quizzes</p>
            <h3 className="text-2xl font-bold text-white">{totalQuizzes}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <HelpCircle size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Question Bank</p>
            <h3 className="text-2xl font-bold text-white">{totalQuestions}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Courses with Quizzes</p>
            <h3 className="text-2xl font-bold text-white">{coursesWithQuizzes}</h3>
          </div>
        </div>
      </div>

      {quizAnalytics.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Quiz Engagement Analytics</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={quizAnalytics}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="quiz_title" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" />
                <Bar dataKey="submitted_count" name="Written (Submitted)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={60} />
                <Bar dataKey="pending_count" name="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 w-full sm:w-auto">
            <span className="px-4 py-1.5 text-sm font-semibold text-blue-950">Quiz Listings</span>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
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
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search quizzes..." 
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
          <div className="divide-y divide-slate-100">
            {sortedQuizzes.map((quiz)=>(
              <div key={quiz.id} className="p-6 hover:bg-slate-50 transition-colors group">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-100 text-blue-800">
                        active
                      </span>
                      <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">{quiz.courseTitle}</span>
                      <span className="text-xs text-slate-400 font-medium">Module: {quiz.moduleTitle}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 mb-1">{quiz.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5"><HelpCircle size={14} /> {quiz.questionsCount} Questions</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={()=>navigate(`/instructor-dashboard/courses/${quiz.courseId}/build`)}
                      className="bg-blue-50 text-blue-950 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Edit size={16} />
                      Edit in Builder
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {sortedQuizzes.length===0&&(
              <div className="p-8 text-center text-slate-500">No quizzes found.</div>
            )}
          </div>
        )}
      </div>

      {showCreateModal&&(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="text-blue-950" /> Create New Quiz
              </h3>
              <button onClick={()=>setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateQuiz} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Quiz Title</label>
                  <input 
                    type="text" 
                    value={quizTitle}
                    onChange={(e)=>setQuizTitle(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white" 
                    placeholder="e.g. Final Assessment" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Target Course</label>
                  <select 
                    value={selectedCourseId}
                    onChange={(e)=>{
                      setSelectedCourseId(e.target.value);
                      setSelectedModuleId('');
                    }}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white"
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(course=>(
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Target Module</label>
                <select 
                  value={selectedModuleId}
                  onChange={(e)=>setSelectedModuleId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white"
                  required
                  disabled={!selectedCourseId}
                >
                  <option value="">Select Module</option>
                  {modulesList.map(mod=>(
                    <option key={mod.id} value={mod.id}>{mod.title}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={()=>setShowCreateModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] rounded-xl font-bold transition-colors shadow-md">Save and Add Questions</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorQuizzes;