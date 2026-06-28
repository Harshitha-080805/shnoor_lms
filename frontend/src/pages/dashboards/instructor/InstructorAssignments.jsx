import React,{useState,useEffect} from 'react';
import { useLocation } from 'react-router-dom';
import {FileText,Plus,Search,CheckCircle,Clock,X} from 'lucide-react';
import api from '../../../api';

function InstructorAssignments(){
  const location = useLocation();
  const[submissions,setSubmissions]=useState([]);
  const[courses,setCourses]=useState([]);
  const[loading,setLoading]=useState(true);
  const[activeTab,setActiveTab]=useState('all');
  const[showCreateModal,setShowCreateModal]=useState(false);
  const[selectedSubmission,setSelectedSubmission]=useState(null);
  const[showGradeModal,setShowGradeModal]=useState(false);
  const[gradeInput,setGradeInput]=useState('');
  const[search,setSearch]=useState(location.state?.searchTerm || '');
  const[sortOption,setSortOption]=useState('Newest');
  const[newTitle,setNewTitle]=useState('');
  const[newCourseId,setNewCourseId]=useState('');
  const[newDesc,setNewDesc]=useState('');



  const fetchSubmissions=async()=>{
    try{
      const res=await api.get(`/api/courses/instructor/submissions`);
      if((res.status >= 200 && res.status < 300)){
        const data=res.data;
        setSubmissions(data);
      }
    }catch(e){}finally{
      setLoading(false);
    }
  };

  const fetchCourses=async()=>{
    try{
      const res=await api.get(`/api/courses/instructor/my-courses`);
      if((res.status >= 200 && res.status < 300)){
        const data=res.data;
        setCourses(data);
      }
    }catch(e){}
  };

  useEffect(()=>{
    fetchSubmissions();
    fetchCourses();
  },[]);

  const handleOpenGradeModal=(sub)=>{
    setSelectedSubmission(sub);
    setGradeInput(sub.grade||'');
    setShowGradeModal(true);
  };

  const handleGradeSubmit=async(e)=>{
    e.preventDefault();
    if(!gradeInput.trim()||!selectedSubmission)return;
    try{
      const res=await api.post(`/api/courses/assessments/submissions/${selectedSubmission.id}/grade`, {grade:gradeInput});
      if((res.status >= 200 && res.status < 300)){
        alert("Submission graded successfully");
        setShowGradeModal(false);
        fetchSubmissions();
      }else{
        alert("Failed to submit grade");
      }
    }catch(e){
      alert("Failed to submit grade");
    }
  };

  const handlePublishAssignment=async(e)=>{
    e.preventDefault();
    if(!newTitle.trim()||!newCourseId||!newDesc.trim())return;
    try{
      const res=await api.post(`/api/courses/${newCourseId}/assessments`, {title:newTitle,description:newDesc});
      if((res.status >= 200 && res.status < 300)){
        alert("Assignment created successfully");
        setShowCreateModal(false);
        setNewTitle('');
        setNewCourseId('');
        setNewDesc('');
        fetchSubmissions();
      }else{
        alert("Failed to create assignment");
      }
    }catch(e){
      alert("Failed to create assignment");
    }
  };

  const totalSubmissions=submissions.length;
  const toGrade=submissions.filter(s=>!s.is_graded).length;
  const graded=submissions.filter(s=>s.is_graded).length;

  const sortedSubmissions = React.useMemo(() => {
    if (!submissions) return [];
    let dataCopy = [...submissions];
    
    if (activeTab === 'active') dataCopy = dataCopy.filter(s => !s.is_graded);
    else if (activeTab === 'completed') dataCopy = dataCopy.filter(s => s.is_graded);
    
    // First apply search filters
    if (search) {
      dataCopy = dataCopy.filter(s => 
        (s.student_name||'').toLowerCase().includes(search.toLowerCase())||
        (s.course_title||'').toLowerCase().includes(search.toLowerCase())||
        (s.assessment_title||'').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply sort
    if (sortOption === 'Newest') return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === 'Oldest') return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === 'Title A-Z') return dataCopy.sort((a,b) => (a.assessment_title||'').localeCompare(b.assessment_title||''));
    if (sortOption === 'Title Z-A') return dataCopy.sort((a,b) => (b.assessment_title||'').localeCompare(a.assessment_title||''));
    
    return dataCopy;
  }, [submissions, search, activeTab, sortOption]);

  return(
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Assignments & Submissions</h2>
          <p className="text-slate-500 text-sm mt-1">Review student submissions and publish new course assessments</p>
        </div>
        <button 
          onClick={()=>setShowCreateModal(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Create Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <FileText size={28} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white leading-tight">{totalSubmissions}</h3>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1">Total Submissions</p>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
            <Clock size={28} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white leading-tight">{toGrade}</h3>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1">To Grade</p>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <CheckCircle size={28} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white leading-tight">{graded}</h3>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1">Graded</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 w-full sm:w-auto">
            {['all','active','completed'].map(tab=>(
              <button 
                key={tab}
                onClick={()=>setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all flex-1 sm:flex-none ${activeTab===tab?'bg-blue-50 text-blue-950 shadow-sm':'text-slate-500 hover:text-slate-700'}`}
              >
                {tab==='active'?'pending':tab}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
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
                placeholder="Search submissions..." 
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
          <div className="p-6 bg-slate-50/50 space-y-4">
            {sortedSubmissions.map((submission)=>(
              <div key={submission.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${!submission.is_graded?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>
                      {!submission.is_graded?'pending':'graded'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{submission.course_title}</span>
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">{submission.assessment_title}</h4>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">{submission.student_name}</span> 
                      <span className="text-slate-400">({submission.student_email})</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock size={16} className="text-slate-400" /> 
                      <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Submitted:</span> 
                      <span className="font-medium text-slate-700">{new Date(submission.created_at).toLocaleDateString()}</span>
                    </p>
                    {submission.is_graded && (
                      <p className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-medium border border-emerald-100">
                        <FileText size={16} /> 
                        Score: {submission.grade}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="w-full md:w-auto flex-shrink-0">
                  <button 
                    onClick={()=>handleOpenGradeModal(submission)}
                    className="w-full md:w-auto bg-blue-950 text-white hover:bg-blue-900 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    {!submission.is_graded ? 'Grade Submission' : 'View / Edit Grade'}
                  </button>
                </div>
              </div>
            ))}
            {sortedSubmissions.length===0&&(
              <div className="py-12 text-center text-slate-500 font-medium">No submissions found.</div>
            )}
          </div>
        )}
      </div>

      {showGradeModal&&selectedSubmission&&(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Grade Assignment Submission</h3>
              <button onClick={()=>setShowGradeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Assessment</p>
                <p className="text-sm font-bold text-slate-800">{selectedSubmission.assessment_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">Course: {selectedSubmission.course_title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Student Details</p>
                <p className="text-sm font-bold text-slate-800">{selectedSubmission.student_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">Email: {selectedSubmission.student_email}</p>
              </div>
              <div className="space-y-4">
                {selectedSubmission.answers_text && (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1.5">Submitted Answers / Text</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-60 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-slate-700">
                      {selectedSubmission.answers_text}
                    </div>
                  </div>
                )}
                {selectedSubmission.submission_file && (
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-1.5">Attached File</p>
                    <a href={`http://localhost:5000/${selectedSubmission.submission_file}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-slate-50 text-blue-600 hover:text-blue-700 hover:bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition">
                      <FileText size={16} />
                      View / Download Attached File
                    </a>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Grade / Score</label>
                <input 
                  type="text" 
                  value={gradeInput}
                  onChange={(e)=>setGradeInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white" 
                  placeholder="e.g. A+, 95/100, Passed"
                  required
                />
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={()=>setShowGradeModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] rounded-xl font-bold transition-colors shadow-md">Submit Grade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal&&(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Create New Assignment</h3>
              <button onClick={()=>setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePublishAssignment} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Assignment Title</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e)=>setNewTitle(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none bg-white" 
                    placeholder="e.g. Midterm Project" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Course</label>
                  <select 
                    value={newCourseId}
                    onChange={(e)=>setNewCourseId(e.target.value)}
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
                <label className="text-sm font-medium text-slate-700">Instructions / Description</label>
                <textarea 
                  rows="4" 
                  value={newDesc}
                  onChange={(e)=>setNewDesc(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none resize-none bg-white" 
                  placeholder="Provide detailed instructions..." 
                  required
                ></textarea>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={()=>setShowCreateModal(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] rounded-xl font-bold transition-colors shadow-md">Publish Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorAssignments;