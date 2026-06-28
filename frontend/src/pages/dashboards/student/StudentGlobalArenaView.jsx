import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api';
import { Target, CheckCircle, XCircle, Play, Maximize2, Minimize2, ArrowLeft, CheckSquare, Code, ChevronRight, ChevronLeft, Award, Bookmark, RotateCcw, Send, Clock } from 'lucide-react';

function StudentGlobalArenaView() {
  const { arenaId } = useParams();
  const navigate = useNavigate();
  const [arena, setArena] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Flow State
  const [flowState, setFlowState] = useState('overview'); // overview, mcq, coding, submit, results, leaderboard, solutions

  // Data prepped for UI
  const [allMcqs, setAllMcqs] = useState([]); // Flattened array of all MCQs { quizId, mcq }
  
  // Progress State
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState({}); // key: mcqId, value: selectedOption
  const [markedForReview, setMarkedForReview] = useState({}); // key: mcqId, value: boolean
  const [activeProblem, setActiveProblem] = useState(null);
  const [codeDrafts, setCodeDrafts] = useState({}); // key: problemId, value: code string
  const [codingResults, setCodingResults] = useState({}); // key: problemId, value: result object from run/submit
  const [startTime, setStartTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [selectedLanguages, setSelectedLanguages] = useState({}); // key: problemId, value: string

  // Backend Results (after submission)
  const [submissionResult, setSubmissionResult] = useState(null); 
  const [leaderboard, setLeaderboard] = useState([]);

  // Editor states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadArena();
  }, [arenaId]);

  async function loadArena() {
    setLoading(true);
    try {
      const res = await api.get(`/api/practice-arenas/${arenaId}`);
      if (res.data) {
        setArena(res.data);
        
        let flattened = [];
        if (res.data.quizzes) {
          res.data.quizzes.forEach(q => {
            q.mcqs.forEach(m => {
              flattened.push({ quizId: q.id, quizTitle: q.title, ...m });
            });
          });
        }
        setAllMcqs(flattened);

        setFlowState('overview');
        setCurrentMcqIndex(0);
        setMcqAnswers({});
        setMarkedForReview({});
        setCodeDrafts({});
        setCodingResults({});
        setActiveProblem(null);
        setSubmissionResult(null);
        setStartTime(null);

        if (res.data.coding) {
          let drafts = {};
          res.data.coding.forEach(c => {
            drafts[c.id] = c.starter_code || '';
          });
          setCodeDrafts(drafts);
        }

        try {
          const lbRes = await api.get(`/api/practice-arenas/${arenaId}/leaderboard`);
          setLeaderboard(lbRes.data);
        } catch(e) {}
      }
    } catch (e) {
      console.error(e);
      if (e.response?.status === 403) {
        alert("You do not have access to this arena.");
        navigate('/student-dashboard/practice-arena');
      }
    } finally {
      setLoading(false);
    }
  }

  const handleStartPractice = () => {
    setStartTime(Date.now());
    if (arena?.time_limit_minutes > 0) {
      setTimeRemaining(arena.time_limit_minutes * 60);
    } else {
      setTimeRemaining(null);
    }
    if (allMcqs.length > 0) {
      setFlowState('mcq');
    } else if (arena.coding?.length > 0) {
      setFlowState('coding');
    } else {
      setFlowState('submit');
    }
  };

  useEffect(() => {
    let interval = null;
    if ((flowState === 'mcq' || flowState === 'coding') && timeRemaining !== null && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmitPractice();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [flowState, timeRemaining]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMcqSelect = (mcqId, option) => {
    setMcqAnswers(prev => ({ ...prev, [mcqId]: option }));
  };

  const handleNextMcq = () => {
    if (currentMcqIndex < allMcqs.length - 1) {
      setCurrentMcqIndex(prev => prev + 1);
    } else {
      if (arena.coding && arena.coding.length > 0) {
        setFlowState('coding');
      } else {
        setFlowState('submit');
      }
    }
  };

  const handleCodeChange = (val) => {
    if (!activeProblem) return;
    setCodeDrafts(prev => ({ ...prev, [activeProblem.id]: val }));
  };

  const handleCodeExecute = async (isSubmit = false) => {
    if (!activeProblem) return;
    const code = codeDrafts[activeProblem.id] || '';
    if (!code.trim()) return;

    setExecuting(true);
    setIsSubmitting(isSubmit);
    
    try {
      const res = await api.post(`/api/practice-arenas/${arenaId}/submit-code`, {
        coding_question_id: activeProblem.id,
        code,
        language: selectedLanguages[activeProblem.id] || activeProblem.language || 'Python',
        isSubmit
      });
      
      setCodingResults(prev => ({ ...prev, [activeProblem.id]: {
        passedCount: res.data.passedCount,
        totalCount: res.data.totalCount,
        score: res.data.score,
        maxMarks: res.data.maxMarks,
        results: res.data.results,
        isSubmitted: isSubmit || prev[activeProblem.id]?.isSubmitted
      }}));

    } catch (e) {
      alert(e.response?.data?.error || "Error executing code");
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitPractice = async () => {
    setLoading(true);
    try {
      let quizAnswers = {};
      let quizScores = {};
      
      allMcqs.forEach(m => {
        if (!quizAnswers[m.quizId]) {
          quizAnswers[m.quizId] = {};
          quizScores[m.quizId] = 0;
        }
        if (mcqAnswers[m.id]) {
          quizAnswers[m.quizId][m.id] = mcqAnswers[m.id];
          if (mcqAnswers[m.id] === m.correct_answer) {
            quizScores[m.quizId] += (m.marks || 1);
          }
        }
      });

      const promises = Object.keys(quizAnswers).map(qId => 
        api.post(`/api/practice-arenas/${arenaId}/submit-mcq`, {
          quizId: qId,
          mcqAnswers: quizAnswers[qId],
          score: quizScores[qId],
          status: 'COMPLETED'
        })
      );
      await Promise.all(promises);
      
      let totalMcqScore = 0;
      let maxMcqScore = 0;
      let correctMcqs = 0;
      let wrongMcqs = 0;
      let unattemptedMcqs = 0;

      allMcqs.forEach(m => {
        maxMcqScore += (m.marks || 1);
        if (mcqAnswers[m.id]) {
          if (mcqAnswers[m.id] === m.correct_answer) {
            totalMcqScore += (m.marks || 1);
            correctMcqs++;
          } else {
            wrongMcqs++;
          }
        } else {
          unattemptedMcqs++;
        }
      });

      let totalCodingScore = 0;
      let maxCodingScore = 0;
      let codingPassed = 0;
      let codingAttempted = 0;

      arena.coding?.forEach(c => {
        maxCodingScore += (c.marks || 10);
        const res = codingResults[c.id];
        if (res && res.isSubmitted) {
          codingAttempted++;
          totalCodingScore += (res.score || 0);
          if (res.passedCount === res.totalCount && res.totalCount > 0) {
            codingPassed++;
          }
        }
      });

      const totalScore = totalMcqScore + totalCodingScore;
      const maxTotalScore = maxMcqScore + maxCodingScore;
      const percentage = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;
      const timeTakenSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      await api.post(`/api/practice-arenas/${arenaId}/finish-attempt`, {
        total_score: totalScore,
        time_taken_seconds: timeTakenSeconds
      });

      setSubmissionResult({
        totalMcqScore, maxMcqScore, correctMcqs, wrongMcqs, unattemptedMcqs,
        totalCodingScore, maxCodingScore, codingPassed, codingAttempted, totalCodingQuestions: arena.coding?.length || 0,
        totalScore, maxTotalScore, percentage, timeTakenSeconds
      });

      const lbRes = await api.get(`/api/practice-arenas/${arenaId}/leaderboard`);
      setLeaderboard(lbRes.data);

      setFlowState('results');

    } catch (e) {
      console.error(e);
      alert('Failed to submit practice: ' + (e.response?.data?.error || e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    loadArena();
  };

  const renderOverview = () => (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-center p-12">
        <Target size={64} className="mx-auto text-blue-600 mb-6" />
        <h2 className="text-3xl font-black text-slate-900 mb-2">{arena.title}</h2>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">{arena.description}</p>
        
        <div className="flex justify-center gap-8 mb-10">
          {arena.is_mcq_enabled && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[150px]">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">MCQ Questions</p>
              <p className="text-3xl font-black text-slate-800">{allMcqs.length}</p>
            </div>
          )}
          {arena.is_coding_enabled && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[150px]">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Coding Problems</p>
              <p className="text-3xl font-black text-slate-800">{arena.coding?.length || 0}</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleStartPractice}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
        >
          Start Practice
        </button>
      </div>
    </div>
  );

  const toggleMarkForReview = (mcqId) => {
    setMarkedForReview(prev => ({ ...prev, [mcqId]: !prev[mcqId] }));
  };

  const handleClearResponse = (mcqId) => {
    setMcqAnswers(prev => {
      const newAns = { ...prev };
      delete newAns[mcqId];
      return newAns;
    });
  };

  const renderMcq = () => {
    const q = allMcqs[currentMcqIndex];
    if (!q) return null;

    const answeredCount = Object.keys(mcqAnswers).length;
    const progressPercent = Math.round((answeredCount / allMcqs.length) * 100);

    return (
      <div className="flex gap-6 mt-6 max-w-[1400px] mx-auto w-full px-6">
        {/* Left Sidebar - Question Navigator */}
        <div className="w-[300px] flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[calc(100vh-140px)] sticky top-[100px]">
          <div className="p-6 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 mb-6">Question Navigator</h4>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[11px] font-bold text-slate-600 mb-8">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Answered</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div> Current</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200"></div> Unanswered</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex items-center justify-center text-amber-500">★</div> Marked</div>
            </div>

            {/* Grid */}
            <div className="flex flex-wrap gap-3">
              {allMcqs.map((m, idx) => {
                const isAnswered = !!mcqAnswers[m.id];
                const isCurrent = idx === currentMcqIndex;
                const isMarked = markedForReview[m.id];
                
                let btnClass = "w-11 h-11 rounded-lg font-bold text-sm flex items-center justify-center border-2 transition-all relative ";
                
                if (isCurrent) {
                  btnClass += "border-blue-600 bg-white text-blue-600 shadow-sm";
                } else if (isAnswered) {
                  btnClass += "border-green-100 bg-green-50 text-green-700";
                } else {
                  btnClass += "border-slate-100 bg-white text-slate-500 hover:border-slate-200";
                }

                return (
                  <button key={m.id} className={btnClass} onClick={() => setCurrentMcqIndex(idx)}>
                    {idx + 1}
                    {isMarked && <span className="absolute -top-1 -right-1 text-[10px] text-amber-500 drop-shadow-sm">★</span>}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="mt-auto p-6 bg-slate-50/50">
            <div className="mb-4">
              <div className="text-xs font-bold text-slate-500 mb-2">{answeredCount} of {allMcqs.length} answered</div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{width: `${progressPercent}%`}}></div>
              </div>
            </div>
            <button 
              onClick={() => handleClearResponse(q.id)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <XCircle size={16} /> Clear Response
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[calc(100vh-140px)] sticky top-[100px]">
          <div className="p-8 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-bold text-blue-600">Question {currentMcqIndex + 1} of {allMcqs.length}</h3>
                {q.quizTitle && <p className="text-sm font-semibold text-slate-500 mt-1">Topic: {q.quizTitle}</p>}
              </div>
              <button 
                onClick={() => toggleMarkForReview(q.id)}
                className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${markedForReview[q.id] ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Bookmark size={16} className={markedForReview[q.id] ? 'fill-blue-600' : ''} /> Mark for Review
              </button>
            </div>
            
            <div className="flex justify-between items-start gap-4 mb-8">
              <p className="text-slate-800 text-lg font-medium leading-relaxed">{q.question}</p>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">{q.marks || 1} Marks</span>
            </div>
            
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map(k => {
                const val = q[`option_${k.toLowerCase()}`];
                if (!val) return null;
                const isSel = mcqAnswers[q.id] === k;
                return (
                  <label key={k} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSel ? 'border-blue-500 bg-blue-50/30' : 'border-slate-100 hover:border-slate-200'}`}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={isSel}
                      onChange={() => handleMcqSelect(q.id, k)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div className="flex items-center gap-3 w-full">
                      <span className={`font-black ${isSel ? 'text-blue-600' : 'text-slate-400'}`}>{k}.</span>
                      <span className={`font-medium ${isSel ? 'text-blue-700' : 'text-slate-600'}`}>{val}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white">
            <button 
              onClick={() => setCurrentMcqIndex(prev => Math.max(0, prev - 1))}
              disabled={currentMcqIndex === 0}
              className="px-6 py-2.5 rounded-xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:text-slate-400 disabled:bg-slate-100 flex items-center gap-2 transition-colors"
            >
              <ChevronLeft size={18} /> Previous
            </button>
            
            <div className="flex gap-3">

              <button 
                onClick={handleNextMcq}
                className="px-8 py-2.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
              >
                {currentMcqIndex === allMcqs.length - 1 ? (
                   arena.coding && arena.coding.length > 0 ? "Next: Coding" : "Finish MCQs"
                ) : "Next"} <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCoding = () => (
    <div className={`mt-6 max-w-[1400px] mx-auto w-full px-6 ${isFullscreen ? 'fixed inset-0 z-[100] bg-slate-50 p-6 m-0 h-screen overflow-hidden' : 'h-[calc(100vh-140px)]'}`}>
      
      {!activeProblem ? (
        <div className="max-w-4xl mx-auto h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-800">Coding Problems</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {arena.coding?.map((p, idx) => {
              const isSub = codingResults[p.id]?.isSubmitted;
              const passedAll = isSub && codingResults[p.id].passedCount === codingResults[p.id].totalCount;
              
              return (
                <div 
                  key={p.id} 
                  onClick={() => setActiveProblem(p)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md cursor-pointer transition-all group flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors mb-3">
                      {idx + 1}. {p.title}
                    </h3>
                    <div className="flex gap-3">
                      <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">{p.difficulty || 'Easy'}</span>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">{p.marks || 10} Marks</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {isSub && passedAll && <span className="font-bold text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><CheckCircle size={16}/> Solved</span>}
                    {isSub && !passedAll && <span className="font-bold text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><XCircle size={16}/> Attempted</span>}
                    <button className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex gap-6 h-full">
          {/* Left Column: Problem Statement */}
          {!isFullscreen && (
            <div className="w-[400px] flex-shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <button 
                  onClick={() => setActiveProblem(null)}
                  className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Problems
                </button>
              </div>
              <div className="p-8 flex-1 overflow-y-auto">
                <div className="mb-6">
                  <h2 className="text-xl font-black text-slate-900 mb-3 leading-tight">{activeProblem.title}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] uppercase tracking-wider font-bold rounded-md">{activeProblem.difficulty || 'Easy'}</span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[11px] uppercase tracking-wider font-bold rounded-md">{activeProblem.marks || 10} Marks</span>
                  </div>
                </div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-line mb-8 font-medium">
                  {activeProblem.problem_statement}
                </div>

                {activeProblem.test_cases && activeProblem.test_cases.filter(tc => !tc.is_hidden).length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-black text-slate-900 text-lg mb-4">Examples</h3>
                    {activeProblem.test_cases.filter(tc => !tc.is_hidden).map((tc, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl border border-slate-100 p-5">
                        <p className="font-bold text-slate-800 mb-4 text-sm">Example {idx + 1}:</p>
                        <div className="space-y-3 font-mono text-sm">
                          <div>
                            <span className="text-slate-500 font-bold select-none">Input:</span>
                            <div className="text-slate-800 mt-1">{tc.input_data || '-'}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold select-none">Output:</span>
                            <div className="text-green-600 mt-1 font-bold">{tc.expected_output}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Column: Code Editor */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-500">Language</span>
                <select 
                  value={selectedLanguages[activeProblem.id] || activeProblem.language || 'Python'}
                  onChange={(e) => setSelectedLanguages(prev => ({ ...prev, [activeProblem.id]: e.target.value }))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em', paddingRight: '2rem' }}
                >
                  <option value="Java">Java</option>
                  <option value="Python">Python</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="C">C</option>
                  <option value="C++">C++</option>
                  <option value="PHP">PHP</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCodeDrafts(prev => ({ ...prev, [activeProblem.id]: activeProblem.starter_code || '' }))}
                  className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={16} /> Reset Code
                </button>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="text-slate-400 hover:text-slate-800 transition-colors">
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-[#1e1e2e] overflow-hidden">
              {/* Optional: Add line numbers visually */}
              <div id={`line-numbers-${activeProblem.id}`} className="absolute left-0 top-0 bottom-0 w-12 bg-[#181825] border-r border-[#313244] text-[#6c7086] font-mono text-sm py-4 px-2 text-right select-none opacity-80 z-0 overflow-hidden">
                {codeDrafts[activeProblem.id]?.split('\n').map((_, i) => <div key={i}>{i+1}</div>) || <div>1</div>}
              </div>
              <textarea
                value={codeDrafts[activeProblem.id] || ''}
                onChange={(e) => handleCodeChange(e.target.value)}
                onScroll={(e) => {
                  const lineNumbers = document.getElementById(`line-numbers-${activeProblem.id}`);
                  if (lineNumbers) lineNumbers.scrollTop = e.target.scrollTop;
                }}
                className="absolute inset-0 w-full h-full bg-transparent text-[#cdd6f4] py-4 pl-16 pr-4 font-mono text-sm resize-none focus:outline-none focus:ring-0 z-10 leading-relaxed"
                spellCheck="false"
              />
            </div>

            {codingResults[activeProblem.id] && (
              <div className="h-48 bg-slate-50 border-t border-slate-200 p-4 overflow-y-auto">
                 <h5 className={`font-bold text-sm mb-3 flex items-center gap-2 ${codingResults[activeProblem.id].passedCount === codingResults[activeProblem.id].totalCount ? 'text-green-600' : 'text-amber-600'}`}>
                   {codingResults[activeProblem.id].passedCount === codingResults[activeProblem.id].totalCount ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                   Test Results: {codingResults[activeProblem.id].passedCount} / {codingResults[activeProblem.id].totalCount} Passed
                   {codingResults[activeProblem.id].isSubmitted && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase tracking-wider">Submitted</span>}
                 </h5>
                 <div className="space-y-2">
                   {codingResults[activeProblem.id].results?.map((r, i) => (
                     <div key={i} className={`p-3 rounded-lg border text-xs font-mono ${r.passed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                       <div className="flex items-center gap-2 font-bold mb-1">
                         {r.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                         Test Case {i + 1} {r.is_hidden && '(Hidden)'}
                       </div>
                       {!r.is_hidden && (
                         <div className="mt-2 space-y-1">
                           <p><span className="font-bold text-slate-500 select-none">Input:</span> {r.input_data}</p>
                           <p><span className="font-bold text-slate-500 select-none">Expected:</span> {r.expected}</p>
                           <p><span className="font-bold text-slate-500 select-none">Output:</span> {r.output}</p>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
              </div>
            )}

            <div className="bg-white p-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => handleCodeExecute(false)}
                disabled={executing}
                className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Play size={16} />
                {executing && !isSubmitting ? 'Running...' : 'Run Code'}
              </button>
              <button
                onClick={() => handleCodeExecute(true)}
                disabled={executing}
                className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Send size={16} />
                {executing && isSubmitting ? 'Submitting...' : 'Submit Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSubmit = () => (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-center p-12">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
           <CheckCircle size={40} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-6">Ready to Submit?</h2>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8 max-w-sm mx-auto text-left space-y-4">
           {allMcqs.length > 0 && (
             <div className="flex justify-between items-center">
               <span className="font-bold text-slate-600">MCQs Answered</span>
               <span className="font-black text-slate-900">{Object.keys(mcqAnswers).length} / {allMcqs.length}</span>
             </div>
           )}
           {arena.coding && arena.coding.length > 0 && (
             <div className="flex justify-between items-center">
               <span className="font-bold text-slate-600">Coding Problems Submitted</span>
               <span className="font-black text-slate-900">{Object.values(codingResults).filter(r => r.isSubmitted).length} / {arena.coding.length}</span>
             </div>
           )}
        </div>

        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => {
              if (arena.coding && arena.coding.length > 0) setFlowState('coding');
              else if (allMcqs.length > 0) setFlowState('mcq');
              else setFlowState('overview');
            }} 
            className="px-6 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
          >
            Go Back
          </button>
          <button 
            onClick={handleSubmitPractice}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all"
          >
            Submit Practice
          </button>
        </div>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!submissionResult) return null;
    const sr = submissionResult;

    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-6">
        <div className="flex justify-end">
           <button onClick={() => navigate('/student-dashboard/practice-arena')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
             <ArrowLeft size={16}/> Back to Arenas
           </button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
           <Award size={64} className="mx-auto text-amber-500 mb-4" />
           <h2 className="text-3xl font-black text-slate-900 mb-2">Practice Results</h2>
           <div className="text-5xl font-black text-blue-600 my-6">{sr.percentage}%</div>
           
           <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mb-8">
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <p className="text-sm font-bold text-slate-500 uppercase">MCQ Score</p>
               <p className="text-xl font-black text-slate-800">{sr.totalMcqScore} / {sr.maxMcqScore}</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <p className="text-sm font-bold text-slate-500 uppercase">Coding Score</p>
               <p className="text-xl font-black text-slate-800">{sr.totalCodingScore} / {sr.maxCodingScore}</p>
             </div>
           </div>

           <div className="flex flex-wrap justify-center gap-4">
             <button onClick={() => setFlowState('solutions')} className="px-6 py-2.5 font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100">
               View Solutions
             </button>
             <button onClick={() => setFlowState('leaderboard')} className="px-6 py-2.5 font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200">
               Leaderboard
             </button>
             <button onClick={handleRetake} className="px-6 py-2.5 font-black text-white bg-blue-600 rounded-xl shadow hover:bg-blue-700">
               Retake Practice
             </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {allMcqs.length > 0 && (
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">MCQ Breakdown</h3>
               <div className="space-y-3">
                 <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Correct Answers:</span> <span className="font-bold text-green-600">{sr.correctMcqs}</span></div>
                 <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Wrong Answers:</span> <span className="font-bold text-red-600">{sr.wrongMcqs}</span></div>
                 <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Unattempted:</span> <span className="font-bold text-slate-400">{sr.unattemptedMcqs}</span></div>
               </div>
             </div>
           )}
           {arena.coding && arena.coding.length > 0 && (
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <h3 className="font-bold text-lg text-slate-800 mb-4 border-b border-slate-100 pb-2">Coding Breakdown</h3>
               <div className="space-y-3">
                 <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Fully Passed:</span> <span className="font-bold text-green-600">{sr.codingPassed}</span></div>
                 <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Attempted:</span> <span className="font-bold text-amber-600">{sr.codingAttempted}</span></div>
                 <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Total Problems:</span> <span className="font-bold text-slate-800">{sr.totalCodingQuestions}</span></div>
               </div>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderSolutions = () => (
    <div className="max-w-4xl mx-auto mt-8 space-y-8 pb-12">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <h3 className="font-bold text-xl text-slate-800">Solutions</h3>
         <button onClick={() => setFlowState('results')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
           <ArrowLeft size={16}/> Back to Results
         </button>
      </div>

      {allMcqs.length > 0 && (
        <div className="space-y-6">
          <h4 className="font-black text-xl text-slate-800">MCQ Solutions</h4>
          {allMcqs.map((m, idx) => {
             const userAns = mcqAnswers[m.id];
             const isCorrect = userAns === m.correct_answer;
             return (
               <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <h5 className="font-bold text-slate-800 mb-4">Question {idx + 1}: {m.question}</h5>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <p className="text-xs font-bold text-slate-500 uppercase mb-1">Your Answer</p>
                     <p className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                       {userAns ? `Option ${userAns}` : 'Unattempted'}
                     </p>
                   </div>
                   <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                     <p className="text-xs font-bold text-green-700 uppercase mb-1">Correct Answer</p>
                     <p className="font-bold text-green-800">Option {m.correct_answer}</p>
                   </div>
                 </div>
                 {m.explanation && (
                   <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-900 border border-blue-100">
                     <span className="font-bold block mb-1">Explanation:</span>
                     {m.explanation}
                   </div>
                 )}
               </div>
             );
          })}
        </div>
      )}

      {arena.coding && arena.coding.length > 0 && (
        <div className="space-y-6">
          <h4 className="font-black text-xl text-slate-800">Coding Problem Solutions</h4>
          {arena.coding.map((p, idx) => {
             const res = codingResults[p.id];
             const isPassed = res?.passedCount === res?.totalCount && res?.totalCount > 0;
             return (
               <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-center">
                   <h5 className="font-bold text-slate-800">Problem {idx + 1}: {p.title}</h5>
                   {isPassed ? <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Passed</span> : <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">Not Passed</span>}
                 </div>
                 <div className="p-5">
                   <p className="text-sm font-bold text-slate-600 mb-2">Your Submitted Code:</p>
                   <pre className="bg-[#1e1e1e] text-slate-300 p-4 rounded-xl text-sm font-mono overflow-x-auto">
                     {codeDrafts[p.id] || "No code submitted"}
                   </pre>
                 </div>
               </div>
             );
          })}
        </div>
      )}
    </div>
  );

  const renderLeaderboard = () => (
    <div className="max-w-4xl mx-auto mt-8 space-y-6 pb-12">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><Target className="text-blue-600"/> Arena Leaderboard</h3>
         <button onClick={() => setFlowState('results')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
           <ArrowLeft size={16}/> Back to Results
         </button>
      </div>

      {leaderboard.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-medium">No one has completed this arena yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4 pl-6">Rank</th>
                <th className="p-4">Student</th>
                <th className="p-4">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.map((user, idx) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-slate-700">#{idx + 1}</td>
                  <td className="p-4 flex items-center gap-3">
                    <img src={user.profile_pic || `https://ui-avatars.com/api/?name=${user.full_name}&background=e2e8f0`} className="w-8 h-8 rounded-full border border-slate-200" />
                    <span className="text-sm font-bold text-slate-900">{user.full_name}</span>
                  </td>
                  <td className="p-4 text-sm font-black text-amber-500">
                    {user.total_score} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading && !arena) {
    return (
      <div className="flex-1 flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
      </div>
    );
  }

  if (!arena) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 h-64 text-center">
        <Target size={48} className="text-slate-300 mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Arena Not Found</h3>
      </div>
    );
  }

  const isExamMode = flowState === 'mcq' || flowState === 'coding' || flowState === 'submit';

  return (
    <div className={isExamMode ? "fixed inset-0 z-[100] bg-slate-50 overflow-y-auto p-6 lg:p-10" : "min-h-screen"}>
      {flowState === 'overview' && (
         <div className="mb-4">
           <button onClick={() => navigate('/student-dashboard/practice-arena')} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
             <ArrowLeft size={16} /> Back to Arenas
           </button>
         </div>
      )}

      {(flowState === 'mcq' || flowState === 'coding') && (
        <div className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50 flex justify-between items-center px-8 h-16">
          <div className="flex gap-8 h-full">
            {allMcqs.length > 0 && (
              <div
                className={`flex items-center gap-2 h-full px-2 font-bold text-sm transition-all border-b-2 cursor-pointer ${flowState === 'mcq' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                onClick={() => setFlowState('mcq')}
              >
                <CheckSquare size={18} className={flowState === 'mcq' ? 'text-blue-600' : 'text-slate-400'} /> MCQ Section
              </div>
            )}
            {arena.coding && arena.coding.length > 0 && (
              <div
                className={`flex items-center gap-2 h-full px-2 font-bold text-sm transition-all border-b-2 cursor-pointer ${flowState === 'coding' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                onClick={() => setFlowState('coding')}
              >
                <Code size={18} className={flowState === 'coding' ? 'text-blue-600' : 'text-slate-400'} /> Coding Section
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 font-bold text-lg ${timeRemaining < 60 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                <Clock size={20} /> {formatTimer(timeRemaining)}
              </div>
            )}
            <button 
              onClick={() => setFlowState('submit')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-lg transition-all shadow-sm flex items-center gap-2"
            >
              Review & Submit
            </button>
          </div>
        </div>
      )}
      
      {flowState === 'overview' && renderOverview()}
      {flowState === 'mcq' && renderMcq()}
      {flowState === 'coding' && renderCoding()}
      {flowState === 'submit' && renderSubmit()}
      {flowState === 'results' && renderResults()}
      {flowState === 'solutions' && renderSolutions()}
      {flowState === 'leaderboard' && renderLeaderboard()}
      
      {loading && flowState === 'submit' && (
         <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
           <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center border border-slate-200">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p className="font-bold text-slate-800">Evaluating your practice...</p>
           </div>
         </div>
      )}
    </div>
  );
}

export default StudentGlobalArenaView;
