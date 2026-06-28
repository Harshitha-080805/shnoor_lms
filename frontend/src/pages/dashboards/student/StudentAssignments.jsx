import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Clock, CheckCircle, AlertCircle, Check } from 'lucide-react';
import api from '../../../api';

function StudentAssignments() {
  const location = useLocation();
  const searchTerm = location.state?.searchTerm || '';
  const [activeTab, setActiveTab] = useState('pending');
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answersText, setAnswersText] = useState({});
  const [submissionFiles, setSubmissionFiles] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sortOption, setSortOption] = useState("Newest");



  const loadData = async () => {
    try {
      const res = await api.get(`/api/courses/enrollments`);
      if ((res.status >= 200 && res.status < 300)) {
        const data = res.data;
        setEnrollments(data);
        const list = [];
        data.forEach(e => {
          e.course.assessments?.forEach(a => {
            const sub = e.assessment_submissions?.find(s => s.assessment_id === a.id);
            let status = 'pending';
            if (sub) {
              status = sub.is_graded ? 'graded' : 'submitted';
            }
            list.push({
              id: a.id,
              title: a.title,
              description: a.description,
              course: e.course.title,
              status,
              submittedAt: sub ? new Date(sub.created_at).toLocaleDateString() : null,
              score: sub?.grade || '--',
              maxMarks: '100',
              answersText: sub?.answers_text || '',
              submissionFile: sub?.submission_file || null
            });
          });
        });
        setAssignments(list);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedAssignments = React.useMemo(() => {
    let dataCopy = [...assignments];

    // Status filter
    dataCopy = dataCopy.filter(a => searchTerm ? true : (activeTab === 'submitted' ? (a.status === 'submitted' || a.status === 'graded') : a.status === activeTab));

    // Search filter
    if (searchTerm) {
      dataCopy = dataCopy.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.course.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
    if (sortOption === "Title A-Z") return dataCopy.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (sortOption === "Title Z-A") return dataCopy.sort((a,b) => (b.title||'').localeCompare(a.title||''));

    return dataCopy;
  }, [assignments, searchTerm, activeTab, sortOption]);

  const handleSubmitAssignment = async (id) => {
    const txt = answersText[id];
    const file = submissionFiles[id];

    if ((!txt || !txt.trim()) && !file) {
      alert("Please write your answer text or upload a file before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (txt) formData.append('answersText', txt);
      if (file) formData.append('submission_file', file);

      const res = await api.post(`/api/courses/assessments/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if ((res.status >= 200 && res.status < 300)) {
        alert("Assignment submitted successfully!");
        setAnswersText({ ...answersText, [id]: '' });
        setSubmissionFiles({ ...submissionFiles, [id]: null });
        loadData();
      }
    } catch (e) {
      alert("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const submittedCount = assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length;
  const gradedCount = assignments.filter(a => a.status === 'graded').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Assignments</h2>
        <p className="text-slate-500 text-sm mt-1">Submit your tasks and track your grades</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-blue-950 p-6 rounded-xl border border-blue-900 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white leading-tight">{pendingCount}</h3>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mt-0.5">Pending</p>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-xl border border-blue-900 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <Check size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white leading-tight">{submittedCount}</h3>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mt-0.5">Submitted</p>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-xl border border-blue-900 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white leading-tight">{gradedCount}</h3>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mt-0.5">Graded</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 w-full sm:w-auto">
            {['pending', 'submitted', 'graded'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all flex-1 sm:flex-none ${activeTab === tab ? 'bg-blue-50 text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>
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
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950 mx-auto"></div>
          </div>
        ) : (
          <div className="p-6 space-y-6 bg-slate-50/50">
            {sortedAssignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Card Header */}
                <div className="border-b border-slate-200 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                        ${assignment.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                          assignment.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 
                          'bg-emerald-100 text-emerald-700'}`}
                      >
                        {assignment.status}
                      </span>
                      <span className="text-xs font-medium text-slate-500">{assignment.course}</span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-800">{assignment.title}</h4>
                  </div>
                  <div className="flex flex-col sm:items-end mt-2 sm:mt-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Score / Status</p>
                      <div className="text-xl font-bold text-slate-800">
                        {assignment.status === 'graded' ? (
                          <span className="text-emerald-600">{assignment.score}</span>
                        ) : assignment.status === 'submitted' ? (
                          <span className="text-blue-600 text-sm uppercase">Pending</span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-6">
                  <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                    {assignment.description}
                  </div>
                  
                  {assignment.status === 'pending' ? (
                    <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-5">
                      <h5 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                        <FileText size={16} className="text-blue-500" />
                        Submit Your Work
                      </h5>
                      <div className="space-y-3">
                        <textarea
                          rows="4"
                          value={answersText[assignment.id] || ''}
                          onChange={(e) => setAnswersText({ ...answersText, [assignment.id]: e.target.value })}
                          placeholder="Type your response here..."
                          className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm bg-white shadow-sm transition-all"
                        ></textarea>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Or attach a file (PDF, DOCX)</label>
                        <input 
                          type="file" 
                          onChange={(e) => setSubmissionFiles({ ...submissionFiles, [assignment.id]: e.target.files[0] })}
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer transition-colors"
                        />
                      </div>
                      <div className="pt-2">
                         <button onClick={() => handleSubmitAssignment(assignment.id)} disabled={submitting} className="bg-blue-950 hover:bg-blue-900 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto">
                           {submitting ? "Submitting..." : "Submit Assignment"}
                         </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-4">
                      {assignment.answersText && (
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Submission Text</div>
                          <p className="text-sm text-slate-700 bg-white p-4 rounded-xl border border-slate-200 whitespace-pre-line shadow-sm">{assignment.answersText}</p>
                        </div>
                      )}
                      {assignment.submissionFile && (
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attached File</div>
                          <a href={`http://localhost:5000/${assignment.submissionFile}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm">
                            <FileText size={16} />
                            View / Download File
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ))}
            {sortedAssignments.length === 0 && (
              <div className="text-center py-12 text-slate-500 font-medium">No tasks found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentAssignments;