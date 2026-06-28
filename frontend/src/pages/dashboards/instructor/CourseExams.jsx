import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Search, Edit, BookOpen, HelpCircle, X, Settings, CheckCircle, Users, BarChart3 } from 'lucide-react';
import api from '../../../api';

function CourseExams() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [examTitle, setExamTitle] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [examDuration, setExamDuration] = useState(60);
  const [examPassPercentage, setExamPassPercentage] = useState(60);
  const [examAttemptLimit, setExamAttemptLimit] = useState(1);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [allowReview, setAllowReview] = useState(false);

  // Pending Reviews State
  const [activeTab, setActiveTab] = useState('listings');
  const [pendingReviews, setPendingReviews] = useState([]);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [gradeInput, setGradeInput] = useState('');

  // Attempts List & Detailed Review State
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [examAttempts, setExamAttempts] = useState([]);
  const [showDetailedReviewModal, setShowDetailedReviewModal] = useState(false);
  const [detailedReviewData, setDetailedReviewData] = useState(null);

  const fetchExamsAndCourses = async () => {
    try {
      const res = await api.get(`/api/courses/instructor/my-courses`);
      if (res.status >= 200 && res.status < 300) {
        setCourses(res.data);
        const extracted = [];
        for (const course of res.data) {
          try {
            const examsRes = await api.get(`/api/exams/courses/${course.id}`);
            if (examsRes.status >= 200 && examsRes.status < 300) {
              examsRes.data.forEach(exam => {
                extracted.push({
                  ...exam,
                  courseTitle: course.title,
                  courseId: course.id
                });
              });
            }
          } catch (e) {
            console.error('Error fetching exams for course', course.id, e);
          }
        }
        setExams(extracted);

        const revRes = await api.get('/api/exams/review/pending');
        if (revRes.status >= 200 && revRes.status < 300) {
          setPendingReviews(revRes.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsAndCourses();
  }, []);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!examTitle.trim() || !selectedCourseId) return;
    try {
      const res = await api.post(`/api/exams/courses/${selectedCourseId}`, {
        title: examTitle,
        description: examDescription,
        duration_minutes: examDuration,
        pass_percentage: examPassPercentage,
        attempt_limit: examAttemptLimit
      });
      if (res.status >= 200 && res.status < 300) {
        alert("Exam created successfully!");
        setShowCreateModal(false);
        setExamTitle('');
        setExamDescription('');
        setExamDuration(60);
        setExamPassPercentage(60);
        setExamAttemptLimit(1);
        setSelectedCourseId('');
        fetchExamsAndCourses();
        // In a real app we'd navigate to an exam builder, here we just refresh
      } else {
        alert("Failed to create exam");
      }
    } catch (e) {
      alert("Failed to create exam");
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/exams/${activeExam.id}/settings`, {
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        show_result_immediately: showResultImmediately,
        allow_review: allowReview
      });
      setShowSettingsModal(false);
      alert('Settings updated successfully');
      fetchExamsAndCourses();
    } catch (err) {
      alert('Failed to update settings');
    }
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!gradeInput || isNaN(gradeInput)) return alert("Please enter a valid numeric score");
    try {
      await api.post(`/api/exams/review/${selectedReview.id}`, { score: parseFloat(gradeInput) });
      alert("Grade submitted successfully!");
      setShowGradeModal(false);
      setGradeInput('');
      fetchExamsAndCourses();
    } catch (err) {
      alert("Failed to submit grade");
    }
  };

  const openGradeModal = (review) => {
    setSelectedReview(review);
    setGradeInput('');
    setShowGradeModal(true);
  };

  const openSettings = (exam) => {
    setActiveExam(exam);
    // Note: since settings might not be eagerly loaded, we would ideally fetch them,
    // but for now we'll just open the modal.
    setShowSettingsModal(true);
  };

  const openAttemptsModal = async (exam) => {
    try {
      const res = await api.get(`/api/exams/${exam.id}/attempts`);
      setExamAttempts(res.data);
      setActiveExam(exam);
      setShowAttemptsModal(true);
    } catch (e) {
      alert("Failed to load attempts");
    }
  };

  const openDetailedReview = async (attempt) => {
    try {
      const res = await api.get(`/api/exams/attempts/${attempt.id}/review`);
      setDetailedReviewData(res.data);
      setShowDetailedReviewModal(true);
    } catch (e) {
      alert("Failed to load detailed review");
    }
  };

  const totalExams = exams.length;
  const coursesWithExams = new Set(exams.map(e => e.courseId)).size;

  const sortedExams = React.useMemo(() => {
    if (!exams) return [];
    let dataCopy = [...exams];
    
    // First apply search filters
    if (search) {
      dataCopy = dataCopy.filter(item => 
        (item.title || item.courseTitle || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply sort
    if (sortOption === 'Newest') return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === 'Oldest') return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === 'Title A-Z') return dataCopy.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (sortOption === 'Title Z-A') return dataCopy.sort((a,b) => (b.title||'').localeCompare(a.title||''));
    
    return dataCopy;
  }, [exams, search, sortOption]);

  const sortedPendingReviews = React.useMemo(() => {
    if (!pendingReviews) return [];
    let dataCopy = [...pendingReviews];
    
    // First apply search filters
    if (search) {
      dataCopy = dataCopy.filter(item => 
        (item.exam_title || item.full_name || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Then apply sort
    if (sortOption === 'Newest') return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === 'Oldest') return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === 'Title A-Z') return dataCopy.sort((a,b) => (a.exam_title||'').localeCompare(b.exam_title||''));
    if (sortOption === 'Title Z-A') return dataCopy.sort((a,b) => (b.exam_title||'').localeCompare(a.exam_title||''));
    
    return dataCopy;
  }, [pendingReviews, search, sortOption]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-800">Performance & Evaluation</h2>
          <p className="text-surface-500 text-sm mt-1">Review student exam attempts and evaluate performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Total Exams</p>
            <h3 className="text-2xl font-bold text-white">{totalExams}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <HelpCircle size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Question Bank</p>
            <h3 className="text-2xl font-bold text-white">0</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Courses with Exams</p>
            <h3 className="text-2xl font-bold text-white">{coursesWithExams}</h3>
          </div>
        </div>
      </div>

      <div className="bg-base-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-surface-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-50">
          <div className="flex bg-base-white rounded-lg p-1 border border-surface-200 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('listings')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'listings' ? 'bg-brand-50 text-brand-950' : 'text-surface-500 hover:bg-surface-50'}`}
            >
              Exam Listings
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === 'reviews' ? 'bg-brand-50 text-brand-950' : 'text-surface-500 hover:bg-surface-50'}`}
            >
              Pending Reviews
              {pendingReviews.length > 0 && (
                <span className="bg-danger-500 text-base-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingReviews.length}</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-3 py-2 bg-base-white border border-surface-200 text-surface-700 text-sm rounded-xl focus:ring-brand-500 focus:border-brand-500 shadow-sm"
            >
              <option value="">Sort By...</option>
              <option value="Newest">Newest</option>
              <option value="Oldest">Oldest</option>
              <option value="Title A-Z">Title A-Z</option>
              <option value="Title Z-A">Title Z-A</option>
            </select>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
              <input
                type="text"
                placeholder="Search exams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-surface-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 transition-all bg-base-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-950"></div>
          </div>
        ) : activeTab === 'listings' ? (
          <div className="divide-y divide-slate-100">
            {sortedExams.map((exam) => (
              <div key={exam.id} className="p-6 hover:bg-surface-50 transition-colors group">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${exam.status === 'PUBLISHED' ? 'bg-success-100 text-success-800' : 'bg-surface-100 text-surface-800'}`}>
                        {exam.status}
                      </span>
                      <span className="text-sm font-medium text-surface-500 bg-surface-100 px-2.5 py-0.5 rounded-md">{exam.courseTitle}</span>
                    </div>
                    <h4 className="text-lg font-bold text-surface-800 mb-1">{exam.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-surface-500">
                      <span className="flex items-center gap-1.5">{exam.duration_minutes} Mins</span>
                      <span className="flex items-center gap-1.5">{exam.pass_percentage}% Pass</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openAttemptsModal(exam)}
                      className="bg-info-50 text-info-900 hover:bg-info-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Users size={16} />
                      View Attempts
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {sortedExams.length === 0 && (
              <div className="p-8 text-center text-surface-500">No exams found.</div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedPendingReviews.map((rev) => (
              <div key={rev.id} className="p-6 hover:bg-surface-50 transition-colors group">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-warning-100 text-warning-800">
                        Needs Grading
                      </span>
                      <span className="text-sm font-medium text-surface-500 bg-surface-100 px-2.5 py-0.5 rounded-md">{rev.exam_title}</span>
                    </div>
                    <h4 className="text-lg font-bold text-surface-800 mb-1">{rev.full_name}</h4>
                    <p className="text-sm text-surface-500 mt-2 line-clamp-2">Q: {rev.question_text}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openGradeModal(rev)}
                      className="bg-brand-50 text-brand-950 hover:bg-brand-100 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle size={16} />
                      Grade Answer
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingReviews.length === 0 && (
              <div className="p-8 text-center text-surface-500">No pending reviews found.</div>
            )}
          </div>
        )}
      </div>

      {showGradeModal && selectedReview && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-surface-50">
              <h3 className="text-xl font-bold text-surface-800 flex items-center gap-2">
                Grade Answer
              </h3>
              <button onClick={() => setShowGradeModal(false)} className="text-surface-400 hover:text-surface-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-surface-400 font-semibold uppercase">Question ({selectedReview.question_type})</p>
                <p className="text-sm font-bold text-surface-800">{selectedReview.question_text}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 font-semibold uppercase">Student Answer</p>
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 mt-1 max-h-60 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-surface-700">
                  {selectedReview.answer_text}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-surface-700">Assign Score (Marks)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  className="w-full p-2.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none bg-base-white"
                  placeholder="Enter numerical score"
                  required
                />
              </div>
              <div className="pt-4 border-t border-surface-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowGradeModal(false)} className="px-5 py-2.5 text-surface-600 hover:bg-surface-100 rounded-xl font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-warning-500 hover:bg-warning-400 text-brand-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] rounded-xl font-bold transition-colors shadow-md">Submit Grade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attempts List Modal */}
      {showAttemptsModal && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-surface-50 shrink-0">
              <h3 className="text-xl font-bold text-surface-800 flex items-center gap-2">
                <Users className="text-brand-950" /> Attempts: {activeExam?.title}
              </h3>
              <button onClick={() => setShowAttemptsModal(false)} className="text-surface-400 hover:text-surface-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {examAttempts.length === 0 ? (
                <div className="text-center py-12 text-surface-500">
                  No students have attempted this exam yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {examAttempts.map(attempt => (
                    <div key={attempt.id} className="border border-surface-200 rounded-xl p-4 flex items-center justify-between hover:border-brand-200 hover:shadow-sm transition-all bg-base-white">
                      <div>
                        <h4 className="font-bold text-surface-800">{attempt.full_name}</h4>
                        <div className="flex gap-4 mt-1 text-sm text-surface-500">
                          <span>{new Date(attempt.started_at || attempt.submitted_at || new Date()).toLocaleString()}</span>
                          <span className="font-medium px-2 rounded-md bg-surface-100">Status: {attempt.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-surface-400 uppercase font-semibold">Total Score</p>
                          <p className="font-black text-lg text-brand-950">{parseFloat(attempt.total_score || 0).toFixed(1)}</p>
                        </div>
                        <button 
                          onClick={() => openDetailedReview(attempt)}
                          className="bg-brand-50 text-brand-700 hover:bg-brand-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                        >
                          Review Answers
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Review Modal */}
      {showDetailedReviewModal && detailedReviewData && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 h-[90vh] flex flex-col">
            <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-surface-50 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-surface-800 flex items-center gap-3">
                  <BarChart3 className="text-brand-950" /> 
                  Detailed Attempt Review
                </h3>
                <p className="text-surface-500 text-sm mt-1">
                  Student: <span className="font-semibold text-surface-700">{detailedReviewData.attempt.full_name}</span> &bull; 
                  Exam: <span className="font-semibold text-surface-700">{detailedReviewData.attempt.exam_title}</span>
                </p>
              </div>
              <button onClick={() => setShowDetailedReviewModal(false)} className="text-surface-400 hover:text-surface-600 bg-base-white p-2 rounded-full border border-surface-200 shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-surface-50 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm">
                  <p className="text-sm font-semibold text-surface-500 uppercase">Final Status</p>
                  <p className={`text-2xl font-black mt-1 ${detailedReviewData.attempt.status === 'PASSED' ? 'text-success-600' : detailedReviewData.attempt.status === 'FAILED' ? 'text-danger-600' : 'text-warning-500'}`}>
                    {detailedReviewData.attempt.status}
                  </p>
                </div>
                <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm">
                  <p className="text-sm font-semibold text-surface-500 uppercase">Total Score</p>
                  <p className="text-2xl font-black mt-1 text-brand-950">{parseFloat(detailedReviewData.attempt.total_score || 0).toFixed(1)}</p>
                </div>
                <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm">
                  <p className="text-sm font-semibold text-surface-500 uppercase">Auto Score</p>
                  <p className="text-2xl font-black mt-1 text-surface-800">{parseFloat(detailedReviewData.attempt.auto_score || 0).toFixed(1)}</p>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-xl font-bold text-surface-800">Question Breakdown</h4>
                {detailedReviewData.sections.length === 0 ? (
                  <div className="bg-surface-50 border border-surface-200 rounded-2xl p-8 text-center">
                    <p className="text-surface-500 font-medium">No question data available for this attempt.</p>
                  </div>
                ) : (
                  detailedReviewData.sections.map((section, idx) => (
                    <div key={section.id} className="bg-base-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-surface-800 text-base-white flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-lg">Section {idx + 1}: {section.title}</h4>
                      {section.description && <p className="text-surface-300 text-sm mt-0.5">{section.description}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-surface-300 uppercase tracking-wider font-semibold">Section Score</span>
                      <p className="font-black text-xl text-warning-400">{parseFloat(section.student_score).toFixed(1)} / {section.total_marks}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {section.questions.map((q, qIdx) => (
                      <div key={q.id} className="p-6">
                        <div className="flex justify-between items-start gap-6">
                          <div className="flex-1">
                            <div className="flex gap-3 items-center mb-3">
                              <span className="bg-surface-100 text-surface-600 font-bold px-2.5 py-1 rounded-md text-xs">Q{qIdx + 1}</span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">{q.question_type.replace('_', ' ')}</span>
                            </div>
                            <p className="font-bold text-surface-800 mb-4">{q.question_text}</p>
                            
                            <div className="bg-surface-50 rounded-xl p-4 border border-surface-200 space-y-3">
                              <div>
                                <p className="text-xs font-bold uppercase text-surface-500 mb-1">Student's Answer</p>
                                <p className="text-sm text-surface-800 font-medium whitespace-pre-wrap">
                                  {q.student_answer ? q.student_answer.answer_text : <span className="text-surface-400 italic">No answer provided</span>}
                                </p>
                              </div>
                              {q.question_type !== 'descriptive' && q.question_type !== 'coding' && (
                                <div className="pt-3 border-t border-surface-200">
                                  <p className="text-xs font-bold uppercase text-success-600 mb-1">Correct Answer(s)</p>
                                  <div className="flex flex-wrap gap-2">
                                    {q.options.filter(o => o.is_correct).map(o => (
                                      <span key={o.id} className="bg-success-100 text-success-800 px-3 py-1 rounded-md text-sm font-medium border border-success-200">
                                        {o.option_text}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-center bg-surface-50 p-4 rounded-xl border border-surface-200 min-w-[100px]">
                            <p className="text-xs font-bold uppercase text-surface-500">Marks</p>
                            <p className={`text-2xl font-black mt-1 ${q.student_answer?.is_correct ? 'text-success-600' : 'text-danger-500'}`}>
                              {q.student_answer ? parseFloat(q.student_answer.score).toFixed(1) : '0.0'}
                            </p>
                            <p className="text-xs text-surface-400 font-medium mt-1">out of {q.marks}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {section.questions.length === 0 && (
                      <div className="p-6 text-surface-500 text-center">No questions in this section.</div>
                    )}
                  </div>
                </div>
              )))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-surface-100 flex justify-between items-center bg-surface-50">
              <h3 className="text-xl font-bold text-surface-800 flex items-center gap-2">
                <GraduationCap className="text-brand-950" /> Create New Exam
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-surface-400 hover:text-surface-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateExam} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-surface-700">Exam Title</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full p-2.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none bg-base-white"
                  placeholder="e.g. Final Course Examination"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-surface-700">Description</label>
                <textarea
                  value={examDescription}
                  onChange={(e) => setExamDescription(e.target.value)}
                  className="w-full p-2.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none bg-base-white min-h-[80px]"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-surface-700">Target Course</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full p-2.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none bg-base-white"
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-surface-700">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={examDuration}
                    onChange={(e) => setExamDuration(e.target.value)}
                    className="w-full p-2.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none bg-base-white"
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-surface-700">Pass Percentage (%)</label>
                  <input
                    type="number"
                    value={examPassPercentage}
                    onChange={(e) => setExamPassPercentage(e.target.value)}
                    className="w-full p-2.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none bg-base-white"
                    min="1"
                    max="100"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-surface-700">Attempt Limit</label>
                  <input
                    type="number"
                    value={examAttemptLimit}
                    onChange={(e) => setExamAttemptLimit(e.target.value)}
                    className="w-full p-2.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-brand-100 focus:border-brand-400 outline-none bg-base-white"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-surface-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-surface-600 hover:bg-surface-100 rounded-xl font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-warning-500 hover:bg-warning-400 text-brand-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] rounded-xl font-bold transition-colors shadow-md">Create Exam</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdateSettings} className="bg-base-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-surface-100">
              <h3 className="text-lg font-bold text-surface-800 flex items-center gap-2">
                <Settings className="text-brand-950" size={20} /> Exam Settings
              </h3>
              <button type="button" onClick={() => setShowSettingsModal(false)} className="text-surface-400 hover:text-surface-600"><X size={20}/></button>
            </div>
            
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
                <span className="text-sm font-medium text-surface-700">Shuffle Questions</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
                <span className="text-sm font-medium text-surface-700">Shuffle Options</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={showResultImmediately} onChange={(e) => setShowResultImmediately(e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
                <span className="text-sm font-medium text-surface-700">Show Result Immediately</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={allowReview} onChange={(e) => setAllowReview(e.target.checked)} className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500" />
                <span className="text-sm font-medium text-surface-700">Allow Student to Review Answers</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 mt-6">
              <button type="button" onClick={() => setShowSettingsModal(false)} className="px-4 py-2.5 text-surface-600 text-sm font-semibold hover:bg-surface-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-brand-950 text-base-white font-bold text-sm rounded-xl shadow-md hover:bg-brand-900 transition-colors">Save Settings</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default CourseExams;
