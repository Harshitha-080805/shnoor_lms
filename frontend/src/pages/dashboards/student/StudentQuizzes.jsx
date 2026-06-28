import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PlayCircle, Clock, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../../../api';

function StudentQuizzes() {
  const location = useLocation();
  const searchTerm = location.state?.searchTerm || '';
  const [activeView, setActiveView] = useState('list');
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("Title A-Z");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);



  const loadData = async () => {
    try {
      const res = await api.get(`/api/courses/enrollments`);
      if ((res.status >= 200 && res.status < 300)) {
        const data = res.data;
        setEnrollments(data);
        const list = [];
        data.forEach(e => {
          e.course.modules?.forEach(m => {
            m.quizzes?.forEach(q => {
              const attempts = e.quiz_attempts?.filter(a => a.quiz === q.id) || [];
              const passed = attempts.some(a => a.passed);
              const score = attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0;
              const totalQuestions = q.questions?.length || 0;
              list.push({
                id: q.id,
                title: q.title,
                course: e.course.title,
                questions: totalQuestions,
                status: passed ? 'completed' : 'pending',
                passed,
                score: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
                scoreRaw: score,
                rawQuiz: q
              });
            });
          });
        });
        setQuizzes(list);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sortedQuizzes = React.useMemo(() => {
    let dataCopy = [...quizzes];

    if (searchTerm) {
      dataCopy = dataCopy.filter(q => 
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        q.course.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortOption === "Title A-Z") return dataCopy.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (sortOption === "Title Z-A") return dataCopy.sort((a,b) => (b.title||'').localeCompare(a.title||''));
    if (sortOption === "Highest Score") return dataCopy.sort((a,b) => (b.scoreRaw || 0) - (a.scoreRaw || 0));
    if (sortOption === "Lowest Score") return dataCopy.sort((a,b) => (a.scoreRaw || 0) - (b.scoreRaw || 0));

    return dataCopy;
  }, [quizzes, searchTerm, sortOption]);

  const handleStartQuiz = (quiz) => {
    setCurrentQuiz(quiz.rawQuiz);
    setQuizAnswers({});
    setQuizResult(null);
    setActiveView('attempt');
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/api/courses/quizzes/${currentQuiz.id}/submit`, { answers: quizAnswers });
      if ((res.status >= 200 && res.status < 300)) {
        const data = res.data;
        setQuizResult(data);
        setActiveView('result');
        loadData();
      }
    } catch (e) {} finally {
      setSubmitting(false);
    }
  };

  if (activeView === 'attempt') {
    const questions = currentQuiz.questions || [];
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-24 z-10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{currentQuiz.title}</h2>
            <p className="text-sm text-slate-500">{questions.length} Questions</p>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-800">{idx + 1}. {q.text}</h3>
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map(optKey => {
                  const optText = q[`option_${optKey.toLowerCase()}`];
                  if (!optText) return null;
                  const isMult = q.question_type === 'multiple';
                  const isChecked = isMult ? (quizAnswers[q.id] || []).includes(optKey) : quizAnswers[q.id] === optKey;
                  return (
                    <label key={optKey} className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${isChecked ? 'bg-blue-50 border-blue-400 text-blue-900' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input
                        type={isMult ? "checkbox" : "radio"}
                        name={`q-${q.id}`}
                        checked={isChecked}
                        onChange={() => {
                          if (isMult) {
                            const curr = quizAnswers[q.id] || [];
                            setQuizAnswers({ ...quizAnswers, [q.id]: curr.includes(optKey) ? curr.filter(o => o !== optKey) : [...curr, optKey] });
                          } else {
                            setQuizAnswers({ ...quizAnswers, [q.id]: optKey });
                          }
                        }}
                        className="w-5 h-5 text-blue-950 focus:ring-blue-500"
                      />
                      <span className="text-slate-700 font-medium">{optKey}. {optText}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => setActiveView('list')} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={handleSubmitQuiz} disabled={submitting} className="px-8 py-3 rounded-xl bg-yellow-500 text-blue-950 font-black font-bold hover:bg-blue-700 shadow-md disabled:opacity-50 transition-colors">
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
        </div>
      </div>
    );
  }

  if (activeView === 'result') {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className={`w-24 h-24 mx-auto text-white rounded-full flex items-center justify-center mb-4 ${quizResult?.passed ? 'bg-blue-950' : 'bg-rose-500'}`}>
            <CheckCircle size={48} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">{quizResult?.passed ? "Quiz Passed!" : "Quiz Failed"}</h2>
            <p className="text-slate-500">You scored {quizResult?.score} / {quizResult?.total} questions correctly.</p>
          </div>
          <div className="py-6 border-y border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Score</p>
              <p className={`text-4xl font-black ${quizResult?.passed ? 'text-emerald-500' : 'text-rose-500'}`}>{quizResult?.passed ? 'PASSED' : 'FAILED'}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
              <p className="text-4xl font-black text-blue-950">{quizResult?.score}/{quizResult?.total}</p>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setActiveView('list')} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors">Back to Quizzes</button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuizzes = quizzes.length;
  const passedQuizzes = quizzes.filter(q => q.passed).length;
  const pendingQuizzes = totalQuizzes - passedQuizzes;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">My Quizzes</h2>
        <p className="text-slate-500 text-sm mt-1">Test your knowledge and track your scores</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Quizzes Widget */}
        <div className="bg-blue-950 p-6 rounded-xl border border-blue-900 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
            <PlayCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white leading-tight">{totalQuizzes}</h3>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mt-0.5">Total Quizzes</p>
          </div>
        </div>
        
        {/* Passed Widget */}
        <div className="bg-blue-950 p-6 rounded-xl border border-blue-900 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white leading-tight">{passedQuizzes}</h3>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mt-0.5">Passed</p>
          </div>
        </div>
        
        {/* Pending Widget */}
        <div className="bg-blue-950 p-6 rounded-xl border border-blue-900 shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white leading-tight">{pendingQuizzes}</h3>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mt-0.5">Pending</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800">Your Quizzes</h3>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-3 py-2 shadow-sm"
          >
            <option value="Title A-Z">Sort by: Title A-Z</option>
            <option value="Title Z-A">Sort by: Title Z-A</option>
            <option value="Highest Score">Highest Score</option>
            <option value="Lowest Score">Lowest Score</option>
          </select>
        </div>
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950 mx-auto"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {sortedQuizzes.map((quiz) => (
              <div key={quiz.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h4 className="font-bold text-slate-800 text-base">{quiz.title}</h4>
                    {quiz.status === 'completed' && quiz.passed && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                        Passed
                      </span>
                    )}
                    {quiz.status === 'completed' && !quiz.passed && (
                      <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                        Failed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-1">{quiz.course}</p>
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    {quiz.questions} Questions
                  </p>
                </div>
                
                <div className="w-full md:w-auto mt-4 md:mt-0">
                  {quiz.status === 'pending' || !quiz.passed ? (
                    <button 
                      onClick={() => handleStartQuiz(quiz)}
                      className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <PlayCircle size={16} /> {quiz.status === 'completed' ? 'Retake Quiz' : 'Start Quiz'}
                    </button>
                  ) : (
                    <div className="flex flex-col md:items-end">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Best Score</p>
                      <p className="text-xl font-bold text-slate-800">{quiz.scoreRaw}/{quiz.questions}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sortedQuizzes.length === 0 && (
              <div className="p-12 text-center text-slate-500">No quizzes available.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentQuizzes;