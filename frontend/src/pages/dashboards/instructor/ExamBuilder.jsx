import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Settings, Trash2, CheckCircle, X, ChevronRight, Save } from 'lucide-react';
import api from '../../../api';
function ExamBuilder() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');
  const [showQuesModal, setShowQuesModal] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);
  
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState('single_mcq');
  const [qMarks, setQMarks] = useState(1);
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState('');
  const fetchExam = async () => {
    try {
      const res = await api.get(`/api/exams/${examId}/builder`);
      setExam(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load exam data');
      navigate('/instructor-dashboard/exams');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchExam();
  }, [examId]);
  const handleAddSection = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/exams/${examId}/sections`, { title: sectionTitle, description: sectionDesc });
      setShowSectionModal(false);
      setSectionTitle('');
      setSectionDesc('');
      fetchExam();
    } catch (err) {
      alert('Failed to add section');
    }
  };
  const handleAddQuestion = async (e) => {
    e.preventDefault();
    let options = [];
    
    if (qType === 'single_mcq' || qType === 'multiple_mcq') {
      if (!correct) return alert('Select the correct answer');
      options = [
        { option_text: optA, is_correct: correct.includes('A') },
        { option_text: optB, is_correct: correct.includes('B') }
      ];
      if (optC) options.push({ option_text: optC, is_correct: correct.includes('C') });
      if (optD) options.push({ option_text: optD, is_correct: correct.includes('D') });
    } else if (qType === 'fill_blank') {
      if (!correct) return alert('Enter the correct answer for the blank');
      options = [
        { option_text: correct, is_correct: true }
      ];
    }
    // descriptive and coding have no options
    try {
      await api.post(`/api/exams/sections/${activeSectionId}/questions`, {
        question_text: qText,
        question_type: qType,
        marks: parseInt(qMarks),
        options
      });
      setShowQuesModal(false);
      setQText('');
      setOptA(''); setOptB(''); setOptC(''); setOptD('');
      setCorrect('');
      setQMarks(1);
      fetchExam();
    } catch (err) {
      alert('Failed to add question');
    }
  };
  const deleteQuestion = async (qId) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.delete(`/api/exams/questions/${qId}`);
      fetchExam();
    } catch (err) {
      alert("Failed to delete question");
    }
  };
  const handlePublish = async () => {
    if (!window.confirm("Are you sure you want to publish this exam? Enrolled students will be able to attempt it.")) return;
    try {
      await api.post(`/api/exams/${examId}/publish`);
      fetchExam();
      alert("Exam published successfully!");
    } catch (err) {
      alert("Failed to publish exam");
    }
  };
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!exam) return <div className="p-8 text-center text-red-500">Exam not found</div>;
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/instructor-dashboard/exams')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-800">{exam.title}</h1>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${exam.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                {exam.status}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Build and manage your exam structure</p>
          </div>
        </div>
        {exam.status !== 'PUBLISHED' && (
          <button 
            onClick={handlePublish}
            className="bg-blue-950 text-white hover:bg-blue-900 px-5 py-2.5 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2"
          >
            <CheckCircle size={18} />
            Publish Exam
          </button>
        )}
      </div>
      {/* Builder Layout */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Exam Sections</h2>
          <button onClick={() => setShowSectionModal(true)} className="bg-yellow-500 hover:bg-yellow-400 text-blue-950 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2">
            <Plus size={16} /> Add Section
          </button>
        </div>
        {exam.sections?.map((section, sIdx) => (
          <div key={section.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Section {sIdx + 1}: {section.title}</h3>
                {section.description && <p className="text-xs text-slate-500 mt-1">{section.description}</p>}
              </div>
              <button onClick={() => { setActiveSectionId(section.id); setShowQuesModal(true); }} className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg">
                <Plus size={16} /> Add Question
              </button>
            </div>
            <div className="p-4 space-y-4">
              {section.questions?.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  No questions added to this section yet.
                </div>
              ) : (
                section.questions?.map((q, qIdx) => (
                  <div key={q.id} className="p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow group relative bg-white">
                    <button onClick={() => deleteQuestion(q.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-start gap-3">
                      <span className="font-black text-slate-300">Q{qIdx + 1}.</span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{q.question_text}</p>
                        <div className="mt-2 text-xs font-semibold text-slate-500 mb-3 flex gap-4">
                          <span className="bg-slate-100 px-2 py-1 rounded-md">{q.marks} Marks</span>
                          <span className="bg-slate-100 px-2 py-1 rounded-md">
                            {q.question_type === 'single_mcq' ? 'Single Choice' : 
                             q.question_type === 'multiple_mcq' ? 'Multiple Choice' :
                             q.question_type === 'fill_blank' ? 'Fill in the Blank' :
                             q.question_type === 'coding' ? 'Coding' : 'Descriptive'}
                          </span>
                        </div>
                        
                        {(q.question_type === 'single_mcq' || q.question_type === 'multiple_mcq') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                            {q.options?.map((opt, oIdx) => (
                              <div key={opt.id} className={`p-2.5 rounded-lg text-sm border flex items-center gap-2 ${opt.is_correct ? 'bg-green-50 border-green-200 text-green-800 font-medium' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${opt.is_correct ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-500'}`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                {opt.option_text}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {q.question_type === 'fill_blank' && q.options?.length > 0 && (
                          <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium flex items-center gap-2">
                            <span className="font-bold">Correct Answer:</span> {q.options[0].option_text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
        {exam.sections?.length === 0 && (
          <div className="text-center p-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Plus size={24} />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Create your first section</h3>
            <p className="text-sm text-slate-500 mb-4">Exams are divided into sections (e.g. Multiple Choice, Coding).</p>
            <button onClick={() => setShowSectionModal(true)} className="bg-yellow-500 hover:bg-yellow-400 text-blue-950 px-5 py-2.5 rounded-xl font-bold shadow-md transition-colors mx-auto inline-flex">
              Add Section
            </button>
          </div>
        )}
      </div>
      {/* Modals */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddSection} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Add Section</h3>
              <button type="button" onClick={() => setShowSectionModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Section Title</label>
              <input type="text" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} required placeholder="e.g. Section A" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm font-medium bg-slate-50 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Description (Optional)</label>
              <textarea value={sectionDesc} onChange={(e) => setSectionDesc(e.target.value)} placeholder="Instructions for this section" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:ring-2 focus:ring-blue-100 focus:border-blue-300"></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowSectionModal(false)} className="px-4 py-2 text-slate-600 text-sm font-semibold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-yellow-500 text-blue-950 font-black text-sm rounded-xl shadow-md hover:bg-yellow-400 transition-colors">Add Section</button>
            </div>
          </form>
        </div>
      )}
      {showQuesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddQuestion} className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Add MCQ Question</h3>
              <button type="button" onClick={() => setShowQuesModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-500">Question Text</label>
                <input type="text" value={qText} onChange={(e) => setQText(e.target.value)} required placeholder="What is the capital of..." className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"/>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Marks</label>
                <input type="number" min="1" value={qMarks} onChange={(e) => setQMarks(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"/>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Question Type</label>
              <select value={qType} onChange={(e) => {setQType(e.target.value); setCorrect('');}} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
                <option value="single_mcq">Single Choice (One correct answer)</option>
                <option value="multiple_mcq">Multiple Choice (Multiple correct answers)</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="coding">Coding Task</option>
                <option value="descriptive">Descriptive (Essay)</option>
              </select>
            </div>
            {(qType === "single_mcq" || qType === "multiple_mcq") && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Options</label>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={optA} onChange={(e) => setOptA(e.target.value)} required placeholder="Option A" className="p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"/>
                  <input type="text" value={optB} onChange={(e) => setOptB(e.target.value)} required placeholder="Option B" className="p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"/>
                  <input type="text" value={optC} onChange={(e) => setOptC(e.target.value)} placeholder="Option C" className="p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"/>
                  <input type="text" value={optD} onChange={(e) => setOptD(e.target.value)} placeholder="Option D" className="p-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"/>
                </div>
              </div>
            )}
            {qType === "single_mcq" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Correct Answer</label>
                <select value={correct} onChange={(e) => setCorrect(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
                  <option value="">Select Correct Option</option>
                  {optA && <option value="A">Option A</option>}
                  {optB && <option value="B">Option B</option>}
                  {optC && <option value="C">Option C</option>}
                  {optD && <option value="D">Option D</option>}
                </select>
              </div>
            )}
            
            {qType === "multiple_mcq" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Correct Answers (Check all that apply)</label>
                <div className="flex gap-4 p-3 border border-slate-200 rounded-xl bg-slate-50">
                  {['A','B','C','D'].map(k => {
                    if (k==='C' && !optC) return null;
                    if (k==='D' && !optD) return null;
                    const selected = correct.split(',').map(s=>s.trim()).includes(k);
                    return(
                      <label key={k} className="flex items-center gap-2 font-bold cursor-pointer text-sm text-slate-700">
                        <input type="checkbox" checked={selected} onChange={() => {
                          const parts = correct ? correct.split(',').map(s=>s.trim()).filter(Boolean) : [];
                          const newParts = parts.includes(k) ? parts.filter(o=>o!==k) : [...parts, k];
                          setCorrect(newParts.sort().join(','));
                        }} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                        Option {k}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {qType === "fill_blank" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Correct Answer</label>
                <input type="text" value={correct} onChange={(e) => setCorrect(e.target.value)} required placeholder="Exact expected text" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none text-sm bg-slate-50 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"/>
                <p className="text-[10px] text-slate-400 mt-1">Students must type exactly this answer to receive marks.</p>
              </div>
            )}
            {(qType === "coding" || qType === "descriptive") && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                <p className="font-semibold">Manual Grading Required</p>
                <p className="text-xs mt-1">These questions do not have auto-graded correct options. You will review them manually in the Review Queue.</p>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <button type="button" onClick={() => setShowQuesModal(false)} className="px-4 py-2.5 text-slate-600 text-sm font-semibold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-yellow-500 text-blue-950 font-black text-sm rounded-xl shadow-md hover:bg-yellow-400 transition-colors">Add Question</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
export default ExamBuilder;
