import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Play, Maximize2, Minimize2, ArrowLeft, Bookmark, RotateCcw, Send, ChevronLeft, ChevronRight, Award, Target, BookOpen, Code } from 'lucide-react';
import api from '../../../api';

function CourseExamTaker({ exam, onComplete, onCancel }) {
  const [flowState, setFlowState] = useState('loading_preview'); // loading_preview, overview, theory, coding, submit, result
  const [previewData, setPreviewData] = useState(null);
  const [examData, setExamData] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  
  // Grouped questions
  const [theoryQuestions, setTheoryQuestions] = useState([]);
  const [codingQuestions, setCodingQuestions] = useState([]);
  
  // Progress State
  const [currentTheoryIndex, setCurrentTheoryIndex] = useState(0);
  const [theoryAnswers, setTheoryAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  
  // Coding State
  const [activeCodingProblem, setActiveCodingProblem] = useState(null);
  const [codeDrafts, setCodeDrafts] = useState({});
  const [codingResults, setCodingResults] = useState({});
  const [selectedLanguages, setSelectedLanguages] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Submission & Timer
  const [timeLeft, setTimeLeft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      const res = await api.get(`/api/exams/${exam.id}/preview`);
      setPreviewData(res.data);
      setFlowState('overview');
    } catch (e) {
      alert("Failed to load exam preview.");
      onCancel();
    }
  };

  const handleStartExam = async () => {
    setFlowState('loading_preview');
    try {
      const res = await api.post(`/api/exams/${exam.id}/start`);
      if (res.status >= 200 && res.status < 300) {
        setAttemptId(res.data.id);
        
        const dataRes = await api.get(`/api/exams/attempts/${res.data.id}/data`);
        setExamData(dataRes.data);
        
        let theory = [];
        let coding = [];
        let globalQIndex = 1;

        dataRes.data.exam.sections?.forEach((section, sIdx) => {
          section.questions?.forEach((q) => {
            const enrichedQ = {
              ...q,
              qNum: globalQIndex++,
              sectionTitle: `Section ${sIdx + 1}: ${section.title}`
            };
            if (q.question_type === 'coding') {
              coding.push(enrichedQ);
              if (enrichedQ.coding_details?.starter_code) {
                 setCodeDrafts(prev => ({...prev, [enrichedQ.id]: enrichedQ.coding_details.starter_code}));
              }
            }
            else theory.push(enrichedQ);
          });
        });
        
        setTheoryQuestions(theory);
        setCodingQuestions(coding);
        
        setTimeLeft(exam.duration_minutes * 60);
        
        if (theory.length > 0) setFlowState('theory');
        else if (coding.length > 0) setFlowState('coding');
        else setFlowState('submit');

      } else {
        alert("Failed to start exam. You may have reached your attempt limit or already have an active attempt.");
        onCancel();
      }
    } catch (e) {
      alert(e.response?.data?.error || "Failed to start exam.");
      onCancel();
    }
  };

  useEffect(() => {
    let timer;
    if ((flowState === 'theory' || flowState === 'coding') && timeLeft !== null && timeLeft > 0 && !isSubmitting) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if ((flowState === 'theory' || flowState === 'coding') && timeLeft === 0 && !isSubmitting) {
      handleSubmitExam();
    }
    return () => clearInterval(timer);
  }, [flowState, timeLeft, isSubmitting]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTheoryChange = (qId, value) => {
     setTheoryAnswers(prev => ({ ...prev, [qId]: value }));
  };
  
  const handleMultipleChoiceChange = (qId, optId, checked) => {
    setTheoryAnswers(prev => {
      const current = prev[qId] ? prev[qId].split(',') : [];
      let updated;
      if (checked) {
        updated = [...current, optId.toString()];
      } else {
        updated = current.filter(id => id !== optId.toString());
      }
      return { ...prev, [qId]: updated.join(',') };
    });
  };

  const handleClearResponse = (qId) => {
    setTheoryAnswers(prev => {
      const newAns = { ...prev };
      delete newAns[qId];
      return newAns;
    });
  };

  const toggleMarkForReview = (qId) => {
    setMarkedForReview(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleCodeChange = (val) => {
    if (!activeCodingProblem) return;
    setCodeDrafts(prev => ({ ...prev, [activeCodingProblem.id]: val }));
  };

  const handleCodeExecute = async () => {
    if (!activeCodingProblem) return;
    const q = activeCodingProblem;
    const code = codeDrafts[q.id] || '';
    const lang = selectedLanguages[q.id] || q.coding_details?.language || 'python';
    
    setIsExecuting(true);
    try {
      let passedCount = 0;
      const results = [];
      const testCases = q.test_cases || [];
      const visibleTestCases = testCases.filter(tc => !tc.is_hidden);
      
      for (let tc of testCases) {
        if (tc.is_hidden) {
          results.push({ ...tc, passed: null });
          continue;
        }
        
        const res = await api.post('/api/exams/execute-code', {
          language: lang,
          code: code,
          stdin: tc.stdin || tc.input_data || ''
        });
        
        const actualOutput = res.data.stdout;
        const isPassed = actualOutput.trim() === tc.expected_output.trim();
        if (isPassed) passedCount++;
        
        results.push({
          ...tc,
          actual_output: actualOutput,
          error: res.data.stderr,
          passed: isPassed
        });
      }
      
      setCodingResults(prev => ({ ...prev, [q.id]: { results, passedCount, total: visibleTestCases.length } }));
      
    } catch (err) {
      alert('Failed to execute code');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    const previousState = flowState;
    setFlowState('loading_preview');
    try {
      const answersArray = [];
      Object.keys(theoryAnswers).forEach(qId => {
        answersArray.push({ question_id: parseInt(qId), answer_text: theoryAnswers[qId] });
      });
      Object.keys(codeDrafts).forEach(qId => {
         const q = codingQuestions.find(cq => cq.id === parseInt(qId));
         let code = codeDrafts[qId];
         let lang = selectedLanguages[qId] || q?.coding_details?.language || 'python';
         if (q?.coding_details?.language === 'all') {
           answersArray.push({ question_id: parseInt(qId), answer_text: JSON.stringify({ lang, code }) });
         } else {
           answersArray.push({ question_id: parseInt(qId), answer_text: code });
         }
      });
      
      const res = await api.post(`/api/exams/attempts/${attemptId}/submit`, { answers: answersArray });
      if (res.status >= 200 && res.status < 300) {
        setExamResult(res.data);
        setFlowState('result');
      }
    } catch (e) {
      alert("Failed to submit exam.");
      setFlowState(previousState);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => (
    <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-40">
      <div>
        <h2 className="font-bold text-slate-900">{exam.title}</h2>
      </div>
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
        <Clock size={18} />
        <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 bg-slate-50 z-50 overflow-y-auto w-full h-full">
      {flowState === 'loading_preview' && (
        <div className="p-12 flex justify-center h-full items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div></div>
      )}

      {flowState === 'overview' && (
        <div className="max-w-3xl mx-auto mt-10 pb-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-center p-12">
            <Target size={64} className="mx-auto text-blue-600 mb-6" />
            <h2 className="text-3xl font-black text-slate-900 mb-2">{exam.title}</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">{exam.description || "You are about to start your course exam. Please ensure you have enough time to complete it."}</p>
            
            <div className="flex justify-center flex-wrap gap-4 mb-10">
              {previewData?.mcqCount > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[120px]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">MCQs</p>
                  <p className="text-3xl font-black text-slate-800">{previewData.mcqCount}</p>
                </div>
              )}
              {previewData?.fillBlankCount > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[120px]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fill in the Blanks</p>
                  <p className="text-3xl font-black text-slate-800">{previewData.fillBlankCount}</p>
                </div>
              )}
              {previewData?.descriptiveCount > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[120px]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descriptive</p>
                  <p className="text-3xl font-black text-slate-800">{previewData.descriptiveCount}</p>
                </div>
              )}
              {previewData?.codingCount > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[120px]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Coding</p>
                  <p className="text-3xl font-black text-slate-800">{previewData.codingCount}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={onCancel}
                className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleStartExam}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
              >
                Start Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {flowState === 'theory' && theoryQuestions[currentTheoryIndex] && (() => {
        const q = theoryQuestions[currentTheoryIndex];
        const answeredCount = Object.keys(theoryAnswers).length;
        const progressPercent = Math.round((answeredCount / theoryQuestions.length) * 100);
        const currentAns = theoryAnswers[q.id] || '';
        return (
          <div className="flex flex-col h-full bg-slate-50">
            {renderHeader()}
            <div className="flex gap-6 mt-6 max-w-[1400px] mx-auto w-full px-6 flex-1 pb-6">
              
              {/* Left Sidebar - Question Navigator */}
              <div className="w-[300px] flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[calc(100vh-140px)] sticky top-[100px]">
                <div className="p-6 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-6">Objective Questions</h4>
                  
                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[11px] font-bold text-slate-600 mb-8">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Answered</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div> Current</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200"></div> Unanswered</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex items-center justify-center text-amber-500">★</div> Marked</div>
                  </div>

                  {/* Grid */}
                  <div className="flex flex-wrap gap-3 max-h-[40vh] overflow-y-auto pr-2">
                    {theoryQuestions.map((m, idx) => {
                      const isAnswered = !!theoryAnswers[m.id];
                      const isCurrent = idx === currentTheoryIndex;
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
                        <button key={m.id} className={btnClass} onClick={() => setCurrentTheoryIndex(idx)}>
                          {idx + 1}
                          {isMarked && <span className="absolute -top-1 -right-1 text-[10px] text-amber-500 drop-shadow-sm">★</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-auto p-6 bg-slate-50/50">
                  <div className="mb-4">
                    <div className="text-xs font-bold text-slate-500 mb-2">{answeredCount} of {theoryQuestions.length} answered</div>
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
                      <h3 className="font-bold text-blue-600">Question {currentTheoryIndex + 1} of {theoryQuestions.length}</h3>
                      <p className="text-sm font-semibold text-slate-500 mt-1">{q.sectionTitle}</p>
                    </div>
                    <button 
                      onClick={() => toggleMarkForReview(q.id)}
                      className={`text-sm font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${markedForReview[q.id] ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Bookmark size={16} className={markedForReview[q.id] ? 'fill-blue-600' : ''} /> Mark for Review
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-start gap-4 mb-8">
                    <p className="text-slate-800 text-lg font-medium leading-relaxed">{q.question_text}</p>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">{q.marks || 1} Marks</span>
                  </div>
                  
                  <div className="space-y-4">
                    {q.question_type === 'single_mcq' && q.options?.map(opt => (
                      <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${currentAns === opt.id.toString() ? 'border-blue-500 bg-blue-50/30' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                        <input 
                          type="radio" 
                          name={`q-${q.id}`} 
                          value={opt.id}
                          checked={currentAns === opt.id.toString()}
                          onChange={() => handleTheoryChange(q.id, opt.id.toString())}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className={`font-medium ${currentAns === opt.id.toString() ? 'text-blue-700' : 'text-slate-700'}`}>{opt.option_text}</span>
                      </label>
                    ))}
                    
                    {q.question_type === 'multiple_mcq' && q.options?.map(opt => {
                      const isChecked = currentAns.split(',').includes(opt.id.toString());
                      return (
                        <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-blue-500 bg-blue-50/30' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => handleMultipleChoiceChange(q.id, opt.id, e.target.checked)}
                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <span className={`font-medium ${isChecked ? 'text-blue-700' : 'text-slate-700'}`}>{opt.option_text}</span>
                        </label>
                      );
                    })}

                    {q.question_type === 'fill_blank' && (
                      <input 
                        type="text" 
                        value={currentAns}
                        onChange={(e) => handleTheoryChange(q.id, e.target.value)}
                        className="w-full p-5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-lg font-medium text-slate-800"
                        placeholder="Type your answer here..."
                      />
                    )}

                    {q.question_type === 'descriptive' && (
                      <textarea 
                        value={currentAns}
                        onChange={(e) => handleTheoryChange(q.id, e.target.value)}
                        className="w-full p-5 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[250px] text-base font-medium text-slate-800 resize-y"
                        placeholder="Write your detailed answer..."
                      />
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white">
                  <button 
                    onClick={() => setCurrentTheoryIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentTheoryIndex === 0}
                    className="px-6 py-2.5 rounded-xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:text-slate-400 disabled:bg-slate-100 flex items-center gap-2 transition-colors"
                  >
                    <ChevronLeft size={18} /> Previous
                  </button>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        if (currentTheoryIndex < theoryQuestions.length - 1) {
                          setCurrentTheoryIndex(prev => prev + 1);
                        } else {
                          if (codingQuestions.length > 0) setFlowState('coding');
                          else setFlowState('submit');
                        }
                      }}
                      className="px-8 py-2.5 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
                    >
                      {currentTheoryIndex === theoryQuestions.length - 1 ? (
                         codingQuestions.length > 0 ? "Next: Coding" : "Finish Section"
                      ) : "Next"} <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {flowState === 'coding' && (
        <div className={`flex flex-col h-full bg-slate-50 ${isFullscreen ? 'fixed inset-0 z-[100] bg-slate-50 m-0 overflow-hidden' : ''}`}>
          {!isFullscreen && renderHeader()}
          <div className={`max-w-[1400px] mx-auto w-full px-6 flex-1 pb-6 ${!isFullscreen ? 'mt-6 h-[calc(100vh-140px)]' : 'p-6 h-screen'}`}>
            
            {!activeCodingProblem ? (
              <div className="max-w-4xl mx-auto h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Coding Problems</h2>
                  {theoryQuestions.length > 0 && (
                    <button onClick={() => setFlowState('theory')} className="px-4 py-2 font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                      Back to Theory
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {codingQuestions.map((p, idx) => {
                    const hasDraft = !!codeDrafts[p.id];
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => setActiveCodingProblem(p)}
                        className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md cursor-pointer transition-all group flex justify-between items-center"
                      >
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors mb-3">
                            {idx + 1}. {p.question_text}
                          </h3>
                          <div className="flex gap-3">
                            <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg uppercase">Coding</span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg">{p.marks || 10} Marks</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {hasDraft && <span className="font-bold text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Code size={16}/> Draft Saved</span>}
                          <button className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-8 flex justify-end">
                   <button 
                     onClick={() => setFlowState('submit')}
                     className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition"
                   >
                     Proceed to Submit
                   </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-6 h-full">
                {/* Left Column: Problem Statement */}
                {!isFullscreen && (
                  <div className="w-[400px] flex-shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <button 
                        onClick={() => setActiveCodingProblem(null)}
                        className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
                      >
                        <ArrowLeft size={16} /> Back to Problems
                      </button>
                    </div>
                    <div className="p-8 flex-1 overflow-y-auto">
                      <div className="mb-6">
                        <h2 className="text-xl font-black text-slate-900 mb-3 leading-tight">{activeCodingProblem.question_text}</h2>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] uppercase tracking-wider font-bold rounded-md">CODING</span>
                          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[11px] uppercase tracking-wider font-bold rounded-md">{activeCodingProblem.marks || 10} Marks</span>
                        </div>
                      </div>

                      {activeCodingProblem.test_cases && activeCodingProblem.test_cases.filter(tc => !tc.is_hidden).length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-black text-slate-900 text-lg mb-4">Examples</h3>
                          {activeCodingProblem.test_cases.filter(tc => !tc.is_hidden).map((tc, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-xl border border-slate-100 p-5">
                              <p className="font-bold text-slate-800 mb-4 text-sm">Example {idx + 1}:</p>
                              <div className="space-y-3 font-mono text-sm">
                                <div>
                                  <span className="text-slate-500 font-bold select-none">Input:</span>
                                  <div className="text-slate-800 mt-1">{tc.stdin || tc.input_data || '-'}</div>
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
                      {activeCodingProblem.coding_details?.language === 'all' ? (
                        <select 
                          value={selectedLanguages[activeCodingProblem.id] || 'python'}
                          onChange={(e) => setSelectedLanguages(prev => ({ ...prev, [activeCodingProblem.id]: e.target.value }))}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none"
                        >
                          <option value="java">Java</option>
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="cpp">C++</option>
                        </select>
                      ) : (
                        <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">{activeCodingProblem.coding_details?.language || 'Python'}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setCodeDrafts(prev => ({ ...prev, [activeCodingProblem.id]: activeCodingProblem.coding_details?.starter_code || '' }))}
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
                    <div id={`line-numbers-${activeCodingProblem.id}`} className="absolute left-0 top-0 bottom-0 w-12 bg-[#181825] border-r border-[#313244] text-[#6c7086] font-mono text-sm py-4 px-2 text-right select-none opacity-80 z-0 overflow-hidden">
                      {(codeDrafts[activeCodingProblem.id] !== undefined ? codeDrafts[activeCodingProblem.id] : (activeCodingProblem.coding_details?.starter_code || '')).split('\n').map((_, i) => <div key={i}>{i+1}</div>)}
                    </div>
                    <textarea
                      value={codeDrafts[activeCodingProblem.id] !== undefined ? codeDrafts[activeCodingProblem.id] : (activeCodingProblem.coding_details?.starter_code || '')}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      onScroll={(e) => {
                        const lineNumbers = document.getElementById(`line-numbers-${activeCodingProblem.id}`);
                        if (lineNumbers) lineNumbers.scrollTop = e.target.scrollTop;
                      }}
                      className="absolute inset-0 w-full h-full bg-transparent text-[#cdd6f4] py-4 pl-16 pr-4 font-mono text-sm resize-none focus:outline-none focus:ring-0 z-10 leading-relaxed overflow-y-auto"
                      spellCheck="false"
                    />
                  </div>

                  {codingResults[activeCodingProblem.id] && (
                    <div className="h-48 bg-slate-50 border-t border-slate-200 p-4 overflow-y-auto">
                       <h5 className={`font-bold text-sm mb-3 flex items-center gap-2 ${codingResults[activeCodingProblem.id].passedCount === codingResults[activeCodingProblem.id].total ? 'text-green-600' : 'text-amber-600'}`}>
                         {codingResults[activeCodingProblem.id].passedCount === codingResults[activeCodingProblem.id].total ? <CheckCircle size={16}/> : <XCircle size={16}/>}
                         Visible Test Results: {codingResults[activeCodingProblem.id].passedCount} / {codingResults[activeCodingProblem.id].total} Passed
                       </h5>
                       <div className="space-y-2">
                         {codingResults[activeCodingProblem.id].results?.map((r, i) => (
                           <div key={i} className={`p-3 rounded-lg border text-xs font-mono ${r.passed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                             <div className="flex items-center gap-2 font-bold mb-1">
                               {r.passed ? <CheckCircle size={14} /> : <XCircle size={14} />}
                               Test Case {i + 1} {r.is_hidden && '(Hidden)'}
                             </div>
                             {!r.is_hidden && (
                               <div className="mt-2 space-y-1">
                                 <p><span className="font-bold text-slate-500 select-none">Input:</span> {r.stdin || r.input_data}</p>
                                 <p><span className="font-bold text-slate-500 select-none">Expected:</span> {r.expected_output}</p>
                                 <p><span className="font-bold text-slate-500 select-none">Output:</span> {r.actual_output}</p>
                                 {r.error && (
                                   <div className="mt-2 p-2 bg-red-100 text-red-900 rounded whitespace-pre-wrap font-mono text-[10px] leading-tight">
                                     <span className="font-bold block mb-1">Error:</span>
                                     {r.error}
                                   </div>
                                 )}
                               </div>
                             )}
                           </div>
                         ))}
                       </div>
                    </div>
                  )}

                  <div className="bg-white p-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      onClick={handleCodeExecute}
                      disabled={isExecuting}
                      className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Play size={16} />
                      {isExecuting ? 'Running...' : 'Run Code'}
                    </button>
                    {codingResults[activeCodingProblem.id] && codingResults[activeCodingProblem.id].total > 0 && codingResults[activeCodingProblem.id].passedCount === codingResults[activeCodingProblem.id].total && (
                      <button
                        onClick={() => alert('Code saved successfully! Your answer is stored and will be securely submitted when you complete the exam.')}
                        className="px-6 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <CheckCircle size={16} />
                        Submit Code
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {flowState === 'submit' && (
        <div className="flex flex-col h-full bg-slate-50">
          {renderHeader()}
          <div className="max-w-2xl mx-auto mt-10 w-full px-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-center p-12">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle size={40} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-6">Ready to Submit?</h2>
              
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8 max-w-sm mx-auto text-left space-y-4">
                 {theoryQuestions.length > 0 && (
                   <div className="flex justify-between items-center">
                     <span className="font-bold text-slate-600">Theory Answered</span>
                     <span className="font-black text-slate-900">{Object.keys(theoryAnswers).length} / {theoryQuestions.length}</span>
                   </div>
                 )}
                 {codingQuestions.length > 0 && (
                   <div className="flex justify-between items-center">
                     <span className="font-bold text-slate-600">Coding Drafts</span>
                     <span className="font-black text-slate-900">{Object.keys(codeDrafts).length} / {codingQuestions.length}</span>
                   </div>
                 )}
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => {
                    if (codingQuestions.length > 0) setFlowState('coding');
                    else if (theoryQuestions.length > 0) setFlowState('theory');
                    else setFlowState('overview');
                  }} 
                  className="px-6 py-3 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  Go Back
                </button>
                <button 
                  onClick={handleSubmitExam}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {flowState === 'result' && (
        <div className="max-w-2xl mx-auto text-center space-y-6 pt-12 px-6">
          <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className={`w-24 h-24 mx-auto text-white rounded-full flex items-center justify-center mb-4 ${examResult?.passed || examResult?.status === 'PASSED' ? 'bg-blue-950' : 'bg-amber-500'}`}>
              {examResult?.status === 'FAILED' ? <XCircle size={48} /> : <CheckCircle size={48} />}
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Exam Submitted</h2>
              {examResult?.status === 'PASSED' || examResult?.status === 'FAILED' ? (
                <div className="space-y-2 mt-4">
                  <p className="text-slate-500 font-medium">Your final score is:</p>
                  <div className="text-5xl font-black text-blue-950">
                    {(() => {
                      let totalMarks = 0;
                      if (examData?.exam?.sections) {
                        examData.exam.sections.forEach(s => {
                          if (s.questions) {
                            s.questions.forEach(q => {
                              totalMarks += parseFloat(q.marks || 0);
                            });
                          }
                        });
                      }
                      if (totalMarks === 0) totalMarks = 100; // fallback
                      return `${parseFloat(examResult.total_score || 0).toFixed(1)} / ${totalMarks}`;
                    })()}
                  </div>
                  <p className={`text-sm font-bold mt-2 ${examResult.status === 'PASSED' ? 'text-green-600' : 'text-rose-600'}`}>
                    {examResult.status === 'PASSED' ? 'Congratulations, you passed!' : 'Unfortunately, you did not pass.'}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 mt-2 bg-amber-50 p-4 rounded-xl text-amber-800 border border-amber-100">
                  Your exam has been submitted but requires manual review from your instructor. Please check back later for your final score.
                </p>
              )}
            </div>
            <div className="flex justify-center mt-8">
              <button onClick={onComplete} className="px-8 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors">Continue to Course</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseExamTaker;
