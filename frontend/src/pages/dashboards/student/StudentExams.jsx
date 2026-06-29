import React, { useState, useEffect } from 'react';


import { Clock, CheckCircle, AlertTriangle, GraduationCap, X, BarChart3, PlayCircle } from 'lucide-react';
import api from '../../../api';
import CourseExamTaker from './CourseExamTaker';

function StudentExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("");
  const [activeExamToTake, setActiveExamToTake] = useState(null);

  const sortedExams = React.useMemo(() => {
    const dataCopy = [...exams];
    if (sortOption === 'Upcoming') return dataCopy.sort((a,b) => (b.attempts ? 0 : 1) - (a.attempts ? 0 : 1));
    if (sortOption === 'Passed') return dataCopy.sort((a,b) => (b.attempts?.[0]?.passed ? 1 : 0) - (a.attempts?.[0]?.passed ? 1 : 0));
    if (sortOption === 'Failed') return dataCopy.sort((a,b) => (!b.attempts?.[0]?.passed && b.attempts ? 1 : 0) - (!a.attempts?.[0]?.passed && a.attempts ? 1 : 0));
    if (sortOption === 'Highest Score') return dataCopy.sort((a,b) => (b.attempts?.[0]?.score_percentage || 0) - (a.attempts?.[0]?.score_percentage || 0));
    if (sortOption === 'Lowest Score') return dataCopy.sort((a,b) => {
      const scoreA = a.attempts ? (a.attempts[0]?.score_percentage || 0) : 101;
      const scoreB = b.attempts ? (b.attempts[0]?.score_percentage || 0) : 101;
      return scoreA - scoreB;
    });
    return dataCopy.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }, [exams, sortOption]);

  // Review State
  const [showDetailedReviewModal, setShowDetailedReviewModal] = useState(false);
  const [detailedReviewData, setDetailedReviewData] = useState(null);

  const loadData = async () => {
    try {
      const res = await api.get(`/api/exams/student/available`);
      if (res.status >= 200 && res.status < 300) {
        setExams(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDetailedReview = async (attemptId) => {
    try {
      const res = await api.get(`/api/exams/attempts/${attemptId}/review`);
      setDetailedReviewData(res.data);
      setShowDetailedReviewModal(true);
    } catch (e) {
      alert("Failed to load detailed review");
    }
  };

  const totalExams = exams.length;
  const passedExams = exams.filter(e => e.attempts?.latest_status === 'PASSED').length;
  const pendingExams = totalExams - passedExams;

  if (activeExamToTake) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto">
        <CourseExamTaker 
          exam={activeExamToTake}
          onComplete={() => { setActiveExamToTake(null); loadData(); }}
          onCancel={() => { setActiveExamToTake(null); loadData(); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Performance & Evaluation</h2>
        <p className="text-slate-500 text-sm mt-1">Review your final course evaluations here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <GraduationCap size={28} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white leading-tight">{totalExams}</h3>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1">Available Exams</p>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={28} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white leading-tight">{passedExams}</h3>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1">Passed</p>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white leading-tight">{pendingExams}</h3>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1">Pending</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-slate-900">Your Evaluations</h3>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-4 py-2 min-w-[150px]"
          >
            <option value="">Sort By...</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
            <option value="Highest Score">Highest Score</option>
            <option value="Lowest Score">Lowest Score</option>
          </select>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950 mx-auto"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedExams.map((exam) => (
              <div key={exam.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-bold text-slate-800">{exam.title}</h4>
                    {exam.is_unlocked ? (
                       <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Unlocked</span>
                    ) : (
                       <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Locked</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{exam.description || 'Final Course Examination'}</p>
                  {!exam.is_unlocked && (
                     <p className="text-xs text-rose-500 mt-2 font-medium">{exam.lock_reason}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={14} /> {exam.duration_minutes} Mins</span>
                    <span className="flex items-center gap-1"><AlertTriangle size={14} /> {exam.pass_percentage}% Pass Req</span>
                  </div>
                </div>
                
                <div className="w-full md:w-auto flex items-center justify-end gap-4">
                  {!exam.attempts ? (
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Not Started</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {exam.attempts && (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Status</p>
                            <p className={`text-sm font-black ${exam.attempts.latest_status === 'PASSED' ? 'text-green-600' : exam.attempts.latest_status === 'FAILED' ? 'text-rose-600' : 'text-amber-500'}`}>
                              {exam.attempts.latest_status || 'COMPLETED'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Best Score</p>
                            <p className="text-xl font-black text-blue-950">{Math.round(exam.attempts.best_score || 0)}</p>
                          </div>
                          {exam.attempts.latest_attempt_id && (
                            <button 
                              onClick={() => openDetailedReview(exam.attempts.latest_attempt_id)}
                              className="bg-purple-50 text-purple-700 hover:bg-purple-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                            >
                              <BarChart3 size={16} /> Results
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {exam.is_unlocked && (!exam.attempts || (exam.attempts.latest_status !== 'PASSED' && exam.attempts.attempt_count < exam.attempt_limit)) && (
                    <button
                      onClick={() => setActiveExamToTake(exam)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 ml-4 shadow-sm"
                    >
                      <PlayCircle size={18} /> Take Exam
                    </button>
                  )}
                </div>
              </div>
            ))}
            {exams.length === 0 && (
              <div className="p-12 text-center text-slate-500">No exams available.</div>
            )}
          </div>
        )}
      </div>

      {/* Detailed Review Modal */}
      {showDetailedReviewModal && detailedReviewData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <BarChart3 className="text-blue-950" /> 
                  Detailed Attempt Review
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  Exam: <span className="font-semibold text-slate-700">{detailedReviewData.attempt.exam_title}</span>
                </p>
              </div>
              <button onClick={() => setShowDetailedReviewModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-200 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 uppercase">Final Status</p>
                  <p className={`text-2xl font-black mt-1 ${detailedReviewData.attempt.status === 'PASSED' ? 'text-green-600' : detailedReviewData.attempt.status === 'FAILED' ? 'text-rose-600' : 'text-amber-500'}`}>
                    {detailedReviewData.attempt.status}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 uppercase">Total Score</p>
                  <p className="text-2xl font-black mt-1 text-blue-950">{Math.round(detailedReviewData.attempt.total_score || 0)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-sm font-semibold text-slate-500 uppercase">Auto Score</p>
                  <p className="text-2xl font-black mt-1 text-slate-800">{Math.round(detailedReviewData.attempt.auto_score || 0)}</p>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xl font-bold text-slate-800">Question Breakdown</h4>
                {detailedReviewData.sections.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                    <p className="text-slate-500 font-medium">No question data available for this attempt.</p>
                  </div>
                ) : (
                  detailedReviewData.sections.map((section, sIdx) => (
                    <div key={section.id} className="space-y-6">
                    {detailedReviewData.sections.length > 1 && (
                      <h5 className="text-lg font-bold text-slate-700 bg-slate-200 px-4 py-2 rounded-xl">{section.title}</h5>
                    )}
                    {section.questions.map((q, qIdx) => (
                      <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
                          <div className="bg-slate-100 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-slate-600 shrink-0">
                            {qIdx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-800 text-lg mb-2">{q.question_text}</p>
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                              <span className="bg-slate-100 px-3 py-1 rounded-lg uppercase tracking-wider">{q.question_type.replace('_', ' ')}</span>
                              <span className="bg-slate-100 px-3 py-1 rounded-lg">{q.marks} Marks Max</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score</p>
                            <p className={`text-xl font-black ${parseFloat(q.student_answer?.score || 0) > 0 ? 'text-green-600' : 'text-rose-600'}`}>
                              {Math.round(q.student_answer?.score || 0)} <span className="text-sm text-slate-400 font-bold">/ {q.marks}</span>
                            </p>
                          </div>
                        </div>
                        <div className="p-6 bg-slate-50 space-y-4">
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Answer</p>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 font-medium whitespace-pre-wrap min-h-[60px]">
                              {q.student_answer?.answer_text || <span className="text-slate-400 italic">No answer provided</span>}
                            </div>
                          </div>
                          {q.student_answer?.feedback && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Instructor Feedback</p>
                              <p className="text-blue-900 text-sm font-medium">{q.student_answer.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end shrink-0">
              <button 
                onClick={() => setShowDetailedReviewModal(false)}
                className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-3 rounded-xl font-bold transition-colors shadow-md"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentExams;
