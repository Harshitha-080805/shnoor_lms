import React, { useState, useEffect } from 'react';
import { Target, Plus, X, Save, Code, CheckSquare, Settings, Edit, Trash, Eye, EyeOff, Search } from 'lucide-react';
import api from '../../../api';

function InstructorGlobalArenas() {
  const [arenas, setArenas] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('Newest');

  // View states
  const [activeArenaId, setActiveArenaId] = useState(null);
  
  // Create Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVis, setNewVis] = useState('GLOBAL');
  const [newCourseId, setNewCourseId] = useState('');
  const [newTimeLimit, setNewTimeLimit] = useState(60);
  const [newDifficulty, setNewDifficulty] = useState('Medium');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [arenasRes, coursesRes] = await Promise.all([
        api.get('/api/practice-arenas'),
        api.get('/api/courses/instructor/my-courses')
      ]);
      setArenas(arenasRes.data);
      setCourses(coursesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/practice-arenas', {
        title: newTitle,
        description: newDesc,
        visibility: newVis,
        target_course_id: newCourseId || null,
        time_limit_minutes: newTimeLimit,
        difficulty: newDifficulty
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewVis('GLOBAL');
      setNewCourseId('');
      setNewTimeLimit(60);
      setNewDifficulty('Medium');
      loadData();
    } catch (e) {
      alert('Failed to create Practice Arena');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this arena?")) return;
    try {
      await api.delete(`/api/practice-arenas/${id}`);
      if (activeArenaId === id) setActiveArenaId(null);
      loadData();
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const sortedArenas = React.useMemo(() => {
    if (!arenas) return [];
    let dataCopy = [...arenas];
    
    if (search) {
      dataCopy = dataCopy.filter(a => 
        (a.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (sortOption === 'Newest') return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === 'Oldest') return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === 'Title A-Z') return dataCopy.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (sortOption === 'Title Z-A') return dataCopy.sort((a,b) => (b.title||'').localeCompare(a.title||''));
    
    return dataCopy;
  }, [arenas, search, sortOption]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
      </div>
    );
  }

  if (activeArenaId) {
    return (
      <ArenaEditor 
        arenaId={activeArenaId} 
        onBack={() => { setActiveArenaId(null); loadData(); }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Target className="text-blue-500" /> Practice Arenas</h2>
          <p className="text-sm text-slate-500 mt-1">Manage global and course-specific practice exercises.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow flex items-center gap-2"
        >
          <Plus size={18} /> Create Arena
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full sm:w-auto"
        >
          <option value="Newest">Sort by: Newest</option>
          <option value="Oldest">Sort by: Oldest</option>
          <option value="Title A-Z">Title A-Z</option>
          <option value="Title Z-A">Title Z-A</option>
        </select>
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
          <input type="text" placeholder="Search arenas..." value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedArenas.map(arena => (
          <div key={arena.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{arena.title}</h3>
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${arena.visibility === 'GLOBAL' || arena.visibility === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {arena.visibility}
                </span>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4">{arena.description || 'No description provided.'}</p>
              
              <div className="flex gap-4 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1"><CheckSquare size={14} className="text-blue-500"/> {arena.mcq_count || 0} MCQs</span>
                <span className="flex items-center gap-1"><Code size={14} className="text-amber-500"/> {arena.coding_count || 0} Coding</span>
              </div>
              
              {arena.target_course_id && (
                <div className="mt-3 text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded inline-block font-semibold">
                  Restricted to: {arena.target_course_title || 'Specific Course'}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50 p-3 flex justify-between gap-2">
              <button 
                onClick={() => handleDelete(arena.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete Arena"
              >
                <Trash size={18} />
              </button>
              <button 
                onClick={() => setActiveArenaId(arena.id)}
                className="flex-1 bg-slate-900 text-white font-bold py-2 rounded-lg text-xs hover:bg-slate-800 transition shadow flex items-center justify-center gap-2"
              >
                <Edit size={14} /> Edit Content
              </button>
            </div>
          </div>
        ))}
        {sortedArenas.length === 0 && (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500">
            No practice arenas found.
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-sm">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Create Practice Arena</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Title</label>
              <input type="text" value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} required placeholder="e.g., Python Basics Practice" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"/>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
              <textarea value={newDesc} onChange={(e)=>setNewDesc(e.target.value)} placeholder="Short description..." rows="2" className="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"/>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Visibility</label>
              <select value={newVis} onChange={(e)=>setNewVis(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50">
                <option value="GLOBAL">Public (Visible to all students)</option>
                <option value="COURSE_SPECIFIC">Course Restricted (Only students in a specific course)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Time Limit (mins)</label>
                <input type="number" min="5" value={newTimeLimit} onChange={(e)=>setNewTimeLimit(parseInt(e.target.value))} required className="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Difficulty</label>
                <select value={newDifficulty} onChange={(e)=>setNewDifficulty(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50">
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {newVis === 'COURSE_SPECIFIC' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Course</label>
                <select value={newCourseId} onChange={(e)=>setNewCourseId(e.target.value)} required className="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50">
                  <option value="">Select a course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-500 text-xs font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ArenaEditor({ arenaId, onBack }) {
  const [arena, setArena] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isMcqEnabled, setIsMcqEnabled] = useState(false);
  const [isCodingEnabled, setIsCodingEnabled] = useState(false);
  const [quizzes, setQuizzes] = useState([{ title: 'General Quiz', mcqs: [] }]);
  const [coding, setCoding] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const [showMcqModalForQuiz, setShowMcqModalForQuiz] = useState(null);
  const [showCodingModal, setShowCodingModal] = useState(false);

  useEffect(() => {
    loadArena();
  }, [arenaId]);

  async function loadArena() {
    try {
      const res = await api.get(`/api/practice-arenas/${arenaId}`);
      if (res.data) {
        setArena(res.data);
        setIsMcqEnabled(res.data.is_mcq_enabled);
        setIsCodingEnabled(res.data.is_coding_enabled);
        if (res.data.quizzes && res.data.quizzes.length > 0) {
          setQuizzes(res.data.quizzes);
        } else {
          setQuizzes([{ title: 'General Quiz', mcqs: res.data.mcqs || [] }]);
        }
        setCoding(res.data.coding || []);

        try {
          const lbRes = await api.get(`/api/practice-arenas/${arenaId}/leaderboard`);
          setLeaderboard(lbRes.data);
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/api/practice-arenas/${arenaId}`, {
        title: arena.title,
        description: arena.description,
        visibility: arena.visibility,
        target_course_id: arena.target_course_id,
        time_limit_minutes: arena.time_limit_minutes,
        difficulty: arena.difficulty,
        is_mcq_enabled: isMcqEnabled,
        is_coding_enabled: isCodingEnabled,
        quizzes,
        coding
      });
      alert('Practice Arena saved successfully!');
      loadArena();
    } catch (e) {
      alert('Failed to save Practice Arena');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <button onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 block">← Back to Arenas</button>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">Editing: {arena?.title}</h2>
        </div>
        <button 
          onClick={handleSave}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow flex items-center gap-2"
        >
          <Save size={18} /> Save Changes
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isMcqEnabled} 
              onChange={(e) => setIsMcqEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            Enable MCQ Practice
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isCodingEnabled} 
              onChange={(e) => setIsCodingEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            Enable Coding Practice
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MCQ SECTION */}
          <div className={`p-5 border-2 rounded-2xl transition-all ${isMcqEnabled ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 opacity-50 pointer-events-none'}`}>
            <div className="flex justify-between items-center mb-4">
              <h6 className="font-bold text-blue-900 flex items-center gap-2"><CheckSquare size={18}/> Quizzes ({quizzes.length})</h6>
              <button 
                onClick={() => setQuizzes([...quizzes, { title: 'New Quiz', mcqs: [] }])}
                className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-blue-700"
              >
                + Add Quiz Topic
              </button>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {quizzes.map((quiz, qIdx) => (
                <div key={qIdx} className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                    <input
                      type="text"
                      value={quiz.title}
                      onChange={(e) => {
                        const newQ = [...quizzes];
                        newQ[qIdx].title = e.target.value;
                        setQuizzes(newQ);
                      }}
                      className="font-bold text-blue-900 bg-white border border-blue-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm w-1/2 shadow-sm transition-all"
                      placeholder="Enter Quiz Topic (e.g. Loops)"
                    />
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowMcqModalForQuiz(qIdx)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white px-2 py-1 rounded shadow-sm border border-blue-200"
                      >
                        + Add MCQ
                      </button>
                      <button onClick={() => setQuizzes(quizzes.filter((_, i) => i !== qIdx))} className="text-red-400 hover:text-red-600 p-1">
                        <X size={16}/>
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 bg-slate-50/50">
                    {quiz.mcqs.map((m, mIdx) => (
                      <div key={mIdx} className="text-sm bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <span className="font-bold text-slate-800">{mIdx+1}. {m.question}</span>
                          <div className="mt-1 text-xs text-slate-500">Correct: Option {m.correct_answer}</div>
                        </div>
                        <button 
                          onClick={() => {
                            const newQ = [...quizzes];
                            newQ[qIdx].mcqs = newQ[qIdx].mcqs.filter((_, i) => i !== mIdx);
                            setQuizzes(newQ);
                          }} 
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <X size={14}/>
                        </button>
                      </div>
                    ))}
                    {quiz.mcqs.length === 0 && <p className="text-xs text-slate-400 text-center py-2 italic">No MCQs added to this quiz.</p>}
                  </div>
                </div>
              ))}
              {quizzes.length === 0 && <p className="text-sm text-slate-400 text-center py-4 border-2 border-dashed border-blue-100 rounded-xl">No Quiz Topics added.</p>}
            </div>
          </div>

          {/* CODING SECTION */}
          <div className={`p-5 border-2 rounded-2xl transition-all ${isCodingEnabled ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 opacity-50 pointer-events-none'}`}>
            <div className="flex justify-between items-center mb-4">
              <h6 className="font-bold text-blue-900 flex items-center gap-2"><Code size={18}/> Coding Problems ({coding.length})</h6>
              <button 
                onClick={() => setShowCodingModal(true)}
                className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow hover:bg-blue-700"
              >
                + Add Problem
              </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {coding.map((c, idx) => (
                <div key={idx} className="text-sm bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <span className="font-bold text-slate-800">{idx+1}. {c.title}</span>
                    <div className="mt-1 text-xs text-slate-500 uppercase">{c.language} • {c.test_cases?.length || 0} Tests</div>
                  </div>
                  <button onClick={() => setCoding(coding.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><X size={16}/></button>
                </div>
              ))}
              {coding.length === 0 && <p className="text-sm text-slate-400 text-center py-4 border-2 border-dashed border-blue-100 rounded-xl">No Coding problems added.</p>}
            </div>
          </div>
        </div>

        {/* LEADERBOARD SECTION */}
        <div className="mt-8 border-t border-slate-200 pt-8">
          <h4 className="font-bold text-slate-800 text-lg mb-4">Arena Leaderboard</h4>
          {leaderboard.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center bg-slate-50 rounded-xl border border-slate-200">No students have completed this arena yet.</p>
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
                        <img src={user.profile_pic || `https://ui-avatars.com/api/?name=${user.full_name}&background=e2e8f0`} className="w-8 h-8 rounded-full border border-slate-200"/>
                        <span className="text-sm font-bold text-slate-900">{user.full_name}</span>
                      </td>
                      <td className="p-4 text-sm font-black text-blue-600">
                        {user.total_score} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showMcqModalForQuiz !== null && <AddMcqModal onAdd={(m) => { const newQ = [...quizzes]; newQ[showMcqModalForQuiz].mcqs.push(m); setQuizzes(newQ); setShowMcqModalForQuiz(null); }} onClose={() => setShowMcqModalForQuiz(null)} />}
      {showCodingModal && <AddCodingModal onAdd={(c) => { setCoding([...coding, c]); setShowCodingModal(false); }} onClose={() => setShowCodingModal(false)} />}
    </div>
  );
}

function AddMcqModal({ onAdd, onClose }) {
  const [question, setQ] = useState('');
  const [optionA, setA] = useState('');
  const [optionB, setB] = useState('');
  const [optionC, setC] = useState('');
  const [optionD, setD] = useState('');
  const [correct, setCorrect] = useState('A');
  const [explanation, setExp] = useState('');

  const submit = (e) => {
    e.preventDefault();
    onAdd({ question, option_a: optionA, option_b: optionB, option_c: optionC, option_d: optionD, correct_answer: correct, explanation });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Add Practice MCQ</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        <input type="text" placeholder="Question text" required value={question} onChange={e=>setQ(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="Option A" required value={optionA} onChange={e=>setA(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          <input type="text" placeholder="Option B" required value={optionB} onChange={e=>setB(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          <input type="text" placeholder="Option C" value={optionC} onChange={e=>setC(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          <input type="text" placeholder="Option D" value={optionD} onChange={e=>setD(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Correct Option</label>
          <select value={correct} onChange={e=>setCorrect(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 text-sm">
            <option value="A">Option A</option>
            <option value="B">Option B</option>
            <option value="C">Option C</option>
            <option value="D">Option D</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Explanation (Optional)</label>
          <textarea placeholder="Explanation" value={explanation} onChange={e=>setExp(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows="2"/>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow hover:bg-blue-700">Add Question</button>
        </div>
      </form>
    </div>
  );
}

function AddCodingModal({ onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [language, setLanguage] = useState('python');
  const [starter, setStarter] = useState('');
  const [testCases, setTestCases] = useState([{ input_data: '', expected_output: '', is_hidden: false }]);

  const addTc = () => setTestCases([...testCases, { input_data: '', expected_output: '', is_hidden: false }]);

  const submit = (e) => {
    e.preventDefault();
    onAdd({ title, problem_statement: problem, language, starter_code: starter, test_cases: testCases });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Add Coding Problem</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Title</label>
          <input type="text" placeholder="Problem Title" required value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Problem Statement</label>
          <textarea placeholder="Problem Statement" required value={problem} onChange={e=>setProblem(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows="3"/>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Language</label>
          <select value={language} onChange={e=>setLanguage(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none bg-slate-50 text-sm">
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node)</option>
            <option value="c">C (GCC)</option>
            <option value="cpp">C++ (GCC)</option>
            <option value="java">Java (OpenJDK)</option>
            <option value="php">PHP</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Starter Code (Optional)</label>
          <textarea placeholder="def solve():\n    pass" value={starter} onChange={e=>setStarter(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-slate-900 text-blue-300" rows="4"/>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-sm text-slate-800">Test Cases</h4>
            <button type="button" onClick={addTc} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition">+ Add Test Case</button>
          </div>
          <div className="space-y-2">
            {testCases.map((tc, idx) => (
              <div key={idx} className="flex gap-2 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <input type="text" placeholder="Stdin (Input)" value={tc.input_data} onChange={e=>{const n=[...testCases];n[idx].input_data=e.target.value;setTestCases(n);}} className="flex-1 p-2 text-xs border border-slate-200 rounded-lg font-mono outline-none focus:border-blue-500" />
                <input type="text" placeholder="Expected Output" required value={tc.expected_output} onChange={e=>{const n=[...testCases];n[idx].expected_output=e.target.value;setTestCases(n);}} className="flex-1 p-2 text-xs border border-slate-200 rounded-lg font-mono outline-none focus:border-blue-500" />
                <label className="text-xs flex items-center gap-1.5 px-2 font-bold text-slate-600 cursor-pointer pt-2">
                  <input type="checkbox" checked={tc.is_hidden} onChange={e=>{const n=[...testCases];n[idx].is_hidden=e.target.checked;setTestCases(n);}} className="w-4 h-4 text-blue-600 rounded" />
                  Hidden
                </label>
                <button type="button" onClick={() => setTestCases(testCases.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 p-2"><X size={16}/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow hover:bg-blue-700">Add Problem</button>
        </div>
      </form>
    </div>
  );
}

export default InstructorGlobalArenas;
