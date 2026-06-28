import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, PlayCircle, CheckCircle, Clock, Lock, BookOpen, ChevronRight, Check, FileText, Maximize, Target, Video, Music, Image, Award, X, File } from 'lucide-react';
import api from '../../../api';
import CourseExamTaker from './CourseExamTaker';

function StudentCourses() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('enrolled');
  const [enrollments, setEnrollments] = useState([]);
  const [discoverCourses, setDiscoverCourses] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [searchTerm, setSearchTerm] = useState(location.state?.searchTerm || '');
  const [enrolledSort, setEnrolledSort] = useState("Newest");
  const [discoverSort, setDiscoverSort] = useState("Newest");
  const [loading, setLoading] = useState(true);
  const [activePlayer, setActivePlayer] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [assignmentText, setAssignmentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canComplete, setCanComplete] = useState(false);
  const [lessonStarted, setLessonStarted] = useState(false);
  const [courseExam, setCourseExam] = useState(null);
  const [activeCourseExam, setActiveCourseExam] = useState(false);
  const [previewCourseId, setPreviewCourseId] = useState(null);
  const [previewCourseData, setPreviewCourseData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (id) => {
    setPreviewCourseId(id);
    setPreviewLoading(true);
    try {
      const res = await api.get(`/api/courses/${id}`);
      setPreviewCourseData(res.data);
    } catch(e) {}
    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewCourseId(null);
    setPreviewCourseData(null);
  };

  const videoRef = React.useRef(null);
  const maxTimeWatchedRef = React.useRef(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const resCert = await api.get(`/api/courses/certificates`);
      if (resCert.status >= 200 && resCert.status < 300) {
        setCertificates(resCert.data);
      }
    } catch (e) { console.error('Failed to load certs:', e); }
    try {
      const resCatalog = await api.get(`/api/courses/`);
      if ((resCatalog.status >= 200 && resCatalog.status < 300)) {
        setDiscoverCourses(resCatalog.data);
      }
    } catch (e) { console.error('Failed to load courses:', e); }
    try {
      const resEnroll = await api.get(`/api/courses/enrollments`);
      if ((resEnroll.status >= 200 && resEnroll.status < 300)) {
        const enrollData = resEnroll.data;
        setEnrollments(enrollData || []);
        if (activePlayer) {
          const updated = enrollData.find(e => e.id === activePlayer.id);
          if (updated) setActivePlayer(updated);
        }
      }
    } catch (e) { console.error('Failed to load enrollments:', e); }
    setLoading(false);
  };

  useEffect(() => {
    if (activePlayer?.course?.id) {
       api.get(`/api/exams/student/courses/${activePlayer.course.id}`).then(res => {
           if (res.data && res.data.length > 0) setCourseExam(res.data[0]);
           else setCourseExam(null);
       }).catch(e => console.error(e));
    } else {
       setCourseExam(null);
    }
  }, [activePlayer?.course?.id]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (enrollments.length > 0 && location.state?.targetCourseId) {
      const targetCourseId = location.state.targetCourseId;
      const course = enrollments.find(e => e.course?.id === targetCourseId);
      if (course) {
        setActivePlayer(course);
        const { targetItemId, targetItemType } = location.state;
        
        if (targetItemType === 'lesson') {
          let foundLesson = null;
          course.course?.modules?.forEach(m => {
            if (m.lessons) {
              const l = m.lessons.find(x => x.id === targetItemId);
              if (l) foundLesson = l;
            }
          });
          if (foundLesson) setActiveLesson(foundLesson);
        } else if (targetItemType === 'quiz') {
          let foundQuiz = null;
          course.course?.modules?.forEach(m => {
            if (m.quizzes) {
              const q = m.quizzes.find(x => x.id === targetItemId);
              if (q) foundQuiz = q;
            }
          });
          if (foundQuiz) setActiveQuiz(foundQuiz);
        } else if (targetItemType === 'assignment') {
          const foundAssignment = course.course?.assessments?.find(a => a.id === targetItemId);
          if (foundAssignment) setActiveAssessment(foundAssignment);
        } else if (targetItemType === 'module') {
          // just opening the course is enough for module
        }

        // Clear state so reload doesn't trigger it again
        window.history.replaceState({}, document.title);
      } else {
        // If they search for something in an unenrolled course, we can switch to discover
        setActiveTab('discover');
        setSearchTerm(location.state.searchTerm);
        window.history.replaceState({}, document.title);
      }
    }
  }, [enrollments, location.state]);

  useEffect(() => {
    if (activeLesson) {
      setCanComplete(false);
      setCountdown(0);
      setLessonStarted(false);

      const userIdentifier = sessionStorage.getItem("email") || sessionStorage.getItem("username") || "guest";
      const savedMaxTime = localStorage.getItem(`vid_progress_v2_${userIdentifier}_${activeLesson.id}`);
      maxTimeWatchedRef.current = savedMaxTime ? parseFloat(savedMaxTime) : 0;

      const isDone = isLessonCompleted(activePlayer, activeLesson.id);
      if (isDone) {
        setCanComplete(true);
        return;
      }

      const type = activeLesson.content_type?.toLowerCase();
      if (type !== 'video' && type !== 'audio') {
        setLessonStarted(true);
        api.post(`/api/courses/lessons/${activeLesson.id}/start`).catch(e => console.error("Failed to start lesson"));
        const duration = activeLesson.required_duration || 10;
        if (duration > 0) {
          setCountdown(duration);
        } else {
          setCanComplete(true);
        }
      }
    }
  }, [activeLesson, activePlayer]);

  const startLessonTimer = () => {
    if (!activeLesson || lessonStarted || isLessonCompleted(activePlayer, activeLesson.id)) return;
    setLessonStarted(true);
    api.post(`/api/courses/lessons/${activeLesson.id}/start`).catch(e => console.error("Failed to start lesson"));

    const type = activeLesson.content_type?.toLowerCase();
    if (type !== 'video') {
      const duration = activeLesson.required_duration || 10;
      if (duration > 0) {
        setCountdown(duration);
      } else {
        setCanComplete(true);
      }
    }
  };

  useEffect(() => {
    if (countdown > 0 && !canComplete) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown, canComplete]);

  const handleEnroll = async (courseId) => {
    try {
      const res = await api.post(`/api/courses/${courseId}/enroll`);
      if ((res.status >= 200 && res.status < 300)) {
        alert("Enrolled successfully!");
        loadData();
      } else {
        const err = res.data;
        alert(err.error || "Enrollment failed");
      }
    } catch (e) {
      if (e.response && e.response.data && e.response.data.missingPrerequisites) {
        const missing = e.response.data.missingPrerequisites.map(m => m.title).join(', ');
        alert(`Prerequisites not met. You must complete: ${missing}`);
      } else {
        alert(e.response?.data?.error || "Failed to enroll");
      }
    }
  };

  const handleCompleteLesson = async (lessonId) => {
    try {
      const res = await api.post(`/api/courses/lessons/${lessonId}/complete`);
      if ((res.status >= 200 && res.status < 300)) {
        loadData();
      } else {
        alert(res.data?.error || "Failed to complete lesson");
      }
    } catch (e) {
      alert(e.response?.data?.error || "Error completing lesson");
    }
  };

  const handleSubmitQuiz = async (quizId) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/api/courses/quizzes/${quizId}/submit`, { answers: quizAnswers });
      if ((res.status >= 200 && res.status < 300)) {
        const data = res.data;
        setQuizResult(data);
        loadData();
      }
    } catch (e) { } finally {
      setSubmitting(false);
    }
  };

  const handleRequestCert = async (courseId) => {
    try {
      const res = await api.post(`/api/courses/${courseId}/certificate`);
      if ((res.status >= 200 && res.status < 300)) {
        alert("Certificate requested!");
        loadData();
      } else {
        const err = res.data;
        alert(err.error || "Requirements not met yet");
      }
    } catch (e) { }
  };

  const getMediaUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const normalized = path.replace(/\\/g, '/');
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${normalized.startsWith('/') ? normalized.slice(1) : normalized}`;
  };

  const isLessonCompleted = (enrollment, lessonId) => {
    return enrollment?.lesson_progress?.some(p => p.lesson === lessonId && p.is_completed);
  };

  const getQuizStatus = (enrollment, quizId) => {
    const attempts = enrollment?.quiz_attempts?.filter(a => a.quiz === quizId);
    if (!attempts || attempts.length === 0) return null;
    return { passed: attempts.some(a => a.passed), score: Math.max(...attempts.map(a => a.score)), totalQ: attempts[0].total_questions };
  };

  const isModuleCompleted = (enrollment, module) => {
    if (!module) return true;
    let completed = true;
    if (module.lessons) {
      module.lessons.forEach(l => {
        if (!isLessonCompleted(enrollment, l.id)) completed = false;
      });
    }
    if (module.quizzes) {
      module.quizzes.forEach(q => {
        const status = getQuizStatus(enrollment, q.id);
        if (!status || !status.passed) completed = false;
      });
    }
    return completed;
  };

  const isModuleUnlocked = (enrollment, modules, mIdx) => {
    for (let i = 0; i < mIdx; i++) {
      if (!isModuleCompleted(enrollment, modules[i])) return false;
    }
    return true;
  };

  const getProgress = (e) => {
    let total = 0;
    e.course.modules?.forEach(m => {
      if (m.title !== "Final Quiz") total += m.lessons?.length || 0;
    });
    const completed = e.lesson_progress?.filter(p => p.is_completed).length || 0;
    return {
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      total,
      completed
    };
  };

  const checkCertReady = (e) => {
    let allLessonsCompleted = true;
    let allQuizzesPassed = true;
    let allAssessmentsSubmitted = true;
    let courseExamPassed = true;

    // Check lessons & quizzes in all modules
    if (e.course.modules) {
      e.course.modules.forEach(m => {
        if (e.course.has_course_exam && m.title === "Final Quiz") return;
        
        if (m.lessons && m.lessons.length > 0) {
          m.lessons.forEach(l => {
            const p = e.lesson_progress?.find(lp => lp.lesson === l.id);
            if (!p || !p.is_completed) allLessonsCompleted = false;
          });
        }
        if (m.quizzes && m.quizzes.length > 0) {
          m.quizzes.forEach(q => {
            const passed = e.quiz_attempts?.some(a => a.quiz === q.id && a.passed);
            if (!passed) allQuizzesPassed = false;
          });
        }
      });
    }

    // Check assessments (removed to avoid blocking cert generation since they are not in the syllabus)
    // if (e.course.assessments && e.course.assessments.length > 0) {
    //   e.course.assessments.forEach(a => {
    //     const sub = e.assessment_submissions?.find(s => s.assessment === a.id);
    //     if (!sub) allAssessmentsSubmitted = false;
    //   });
    // }

    if (e.course.has_course_exam) {
      const passed = e.course_exam_attempts?.some(a => a.status === 'PASSED');
      if (!passed) courseExamPassed = false;
    }

    return allLessonsCompleted && allQuizzesPassed && courseExamPassed;
  };

  const getCertStatus = (enrollmentId) => {
    const cert = certificates.find(c => String(c.enrollment_id) === String(enrollmentId));
    return cert ? cert.status?.toUpperCase() : null;
  };

  const sortedEnrolled = React.useMemo(() => {
    let dataCopy = [...enrollments];
    
    // Search Filter
    dataCopy = dataCopy.filter(e => {
      const q = searchTerm.toLowerCase();
      if (e.course.title.toLowerCase().includes(q)) return true;
      if (e.course.modules?.some(m => 
        (m.title && m.title.toLowerCase().includes(q)) ||
        m.lessons?.some(l => l.title && l.title.toLowerCase().includes(q)) ||
        m.quizzes?.some(qz => qz.title && qz.title.toLowerCase().includes(q))
      )) return true;
      if (e.course.assessments?.some(a => a.title && a.title.toLowerCase().includes(q))) return true;
      return false;
    });

    if (enrolledSort === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (enrolledSort === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (enrolledSort === "Title A-Z") return dataCopy.sort((a,b) => (a.course.title||'').localeCompare(b.course.title||''));
    if (enrolledSort === "Title Z-A") return dataCopy.sort((a,b) => (b.course.title||'').localeCompare(a.course.title||''));
    
    return dataCopy;
  }, [enrollments, searchTerm, enrolledSort]);

  const sortedDiscover = React.useMemo(() => {
    let dataCopy = [...discoverCourses];
    
    // Search Filter
    dataCopy = dataCopy.filter(c => {
      const q = searchTerm.toLowerCase();
      if (c.title.toLowerCase().includes(q)) return true;
      if (c.modules?.some(m => 
        (m.title && m.title.toLowerCase().includes(q)) ||
        m.lessons?.some(l => l.title && l.title.toLowerCase().includes(q)) ||
        m.quizzes?.some(qz => qz.title && qz.title.toLowerCase().includes(q))
      )) return true;
      if (c.assessments?.some(a => a.title && a.title.toLowerCase().includes(q))) return true;
      return false;
    });

    if (discoverSort === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (discoverSort === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (discoverSort === "Title A-Z") return dataCopy.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (discoverSort === "Title Z-A") return dataCopy.sort((a,b) => (b.title||'').localeCompare(a.title||''));

    return dataCopy;
  }, [discoverCourses, searchTerm, discoverSort]);

  if (activePlayer) {
    const flatItems = [];
    if (activePlayer && activePlayer.course && activePlayer.course.modules) {
      const modules = activePlayer.course.modules.filter(m => m.title !== "Final Quiz");
      const finalMod = activePlayer.course.modules.find(m => m.title === "Final Quiz");
      modules.forEach((m) => {
        if (m.lessons) m.lessons.forEach(l => flatItems.push({ type: 'lesson', item: l }));
        if (m.quizzes) m.quizzes.forEach(q => flatItems.push({ type: 'quiz', item: q }));
      });
      if (courseExam) {
         flatItems.push({ type: 'course_exam', item: courseExam });
      } else if (finalMod && finalMod.quizzes) {
         finalMod.quizzes.forEach(q => flatItems.push({ type: 'quiz', item: q }));
      }
    }

    const isItemUnlocked = (type, id) => {
       const currentIndex = flatItems.findIndex(i => i.type === type && (type === 'course_exam' ? true : i.item.id === id));
       if (currentIndex === -1) return false;
       if (currentIndex === 0) return true;
       const prev = flatItems[currentIndex - 1];
       if (prev.type === 'lesson') return isLessonCompleted(activePlayer, prev.item.id);
       if (prev.type === 'quiz') return getQuizStatus(activePlayer, prev.item.id)?.passed === true;
       if (prev.type === 'course_exam') return activePlayer.course_exam_attempts?.some(a => a.status === 'PASSED') || false;
       return false;
    };

    const handleNextItem = (currentType, currentId) => {
      const currentIndex = flatItems.findIndex(i => i.type === currentType && (currentType === 'course_exam' ? true : i.item.id === currentId));
      if (currentIndex !== -1 && currentIndex < flatItems.length - 1) {
         const next = flatItems[currentIndex + 1];
         if (next.type === 'lesson') {
            setActiveLesson(next.item); setActiveQuiz(null); setActiveAssessment(null); setActiveCourseExam(false);
         } else if (next.type === 'quiz') {
            setActiveQuiz(next.item); setActiveLesson(null); setActiveAssessment(null); setActiveCourseExam(false);
         } else if (next.type === 'course_exam') {
            setActiveCourseExam(true); setActiveQuiz(null); setActiveLesson(null); setActiveAssessment(null);
         }
      }
    };

    const progress = getProgress(activePlayer);
    const readyCert = checkCertReady(activePlayer);
    const finalMod = activePlayer.course.modules?.find(m => m.title === "Final Quiz");
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-80 bg-slate-900 text-slate-100 flex flex-col flex-shrink-0 shadow-xl z-10">
          <div className="p-5 border-b border-slate-800">
            <button
              onClick={() => {
                setActivePlayer(null);
                setActiveLesson(null);
                setActiveQuiz(null);
                setQuizResult(null);
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 uppercase mb-3 block"
            >
              ← Leave Course
            </button>
            <h3 className="font-extrabold text-base line-clamp-1">{activePlayer.course.title}</h3>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-bold">
              <span>{progress.pct}% Complete</span>
              <span>{progress.completed}/{progress.total} Lessons</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress.pct}%` }}></div>
            </div>
            {readyCert && getCertStatus(activePlayer.id) !== 'APPROVED' && getCertStatus(activePlayer.id) !== 'PENDING' && (
              <button
                onClick={() => handleRequestCert(activePlayer.course.id)}
                className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-xs transition shadow"
              >
                Request Certificate
              </button>
            )}
            {getCertStatus(activePlayer.id) === 'PENDING' && (
              <div className="w-full mt-4 bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs text-center border border-slate-600">
                Certificate Requested
              </div>
            )}
            {getCertStatus(activePlayer.id) === 'APPROVED' && (
              <button
                onClick={() => navigate('/student-dashboard/certificates')}
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs transition shadow flex items-center justify-center gap-2"
              >
                <Award size={14} /> View Certificate
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto sidebar-scrollbar p-4 space-y-5">
            {activePlayer.course.modules?.filter(m => m.title !== "Final Quiz").map((m, mIdx, arr) => {
              const unlocked = isModuleUnlocked(activePlayer, arr, mIdx);
              return (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex justify-between items-center px-2">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase">Module {mIdx + 1}: {m.title}</h5>
                    {!unlocked && <Lock size={12} className="text-slate-600" />}
                  </div>
                  <div className="space-y-1">
                    {m.lessons?.map(l => {
                      const done = isLessonCompleted(activePlayer, l.id);
                      const active = activeLesson?.id === l.id;
                      const itemUnlocked = unlocked && isItemUnlocked('lesson', l.id);
                      return (
                        <button
                          key={l.id}
                          disabled={!itemUnlocked}
                          onClick={() => { setActiveLesson(l); setActiveQuiz(null); setActiveAssessment(null); setQuizResult(null); }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-between transition ${!itemUnlocked ? 'opacity-50 cursor-not-allowed hover:bg-transparent text-slate-500' : active ? 'bg-yellow-500 text-blue-950 font-black' : 'hover:bg-slate-800 text-slate-400'}`}
                        >
                          <span className="truncate pr-2">{l.title}</span>
                          {done && <Check size={14} className="text-green-400" />}
                          {!itemUnlocked && !done && <Lock size={12} className="text-slate-600" />}
                        </button>
                      );
                    })}
                    {m.quizzes?.map(q => {
                      const status = getQuizStatus(activePlayer, q.id);
                      const active = activeQuiz?.id === q.id;
                      const itemUnlocked = unlocked && isItemUnlocked('quiz', q.id);
                      return (
                        <button
                          key={q.id}
                          disabled={!itemUnlocked}
                          onClick={() => { setActiveQuiz(q); setActiveLesson(null); setActiveAssessment(null); setQuizAnswers({}); setQuizResult(null); }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-between transition ${!itemUnlocked ? 'opacity-50 cursor-not-allowed hover:bg-transparent text-slate-500' : active ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-indigo-400'}`}
                        >
                          <span className="truncate pr-2">Quiz: {q.title}</span>
                          {status?.passed && <Check size={14} className="text-green-400" />}
                          {!itemUnlocked && !status?.passed && <Lock size={12} className="text-slate-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            })}
            {finalMod && !courseExam && (
              <div className="border-t border-slate-800 pt-4 space-y-1.5">
                <div className="flex justify-between items-center px-2">
                  <h5 className="text-[11px] font-bold text-amber-500 uppercase">Final Evaluation</h5>
                  {!isModuleUnlocked(activePlayer, activePlayer.course.modules?.filter(m => m.title !== "Final Quiz") || [], (activePlayer.course.modules?.filter(m => m.title !== "Final Quiz") || []).length) && <Lock size={12} className="text-slate-600" />}
                </div>
                <div className="space-y-1">
                  {finalMod.quizzes?.map(q => {
                    const status = getQuizStatus(activePlayer, q.id);
                    const active = activeQuiz?.id === q.id;
                    const modUnlocked = isModuleUnlocked(activePlayer, activePlayer.course.modules?.filter(m => m.title !== "Final Quiz") || [], (activePlayer.course.modules?.filter(m => m.title !== "Final Quiz") || []).length);
                    const itemUnlocked = modUnlocked && isItemUnlocked('quiz', q.id);
                    return (
                      <button
                        key={q.id}
                        disabled={!itemUnlocked}
                        onClick={() => { setActiveQuiz(q); setActiveLesson(null); setActiveAssessment(null); setQuizAnswers({}); setQuizResult(null); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-between transition ${!itemUnlocked ? 'opacity-50 cursor-not-allowed hover:bg-transparent text-slate-500' : active ? 'bg-amber-600 text-white' : 'hover:bg-slate-800 text-amber-400'}`}
                      >
                        <span className="truncate pr-2">🏆 Final Quiz: {q.title}</span>
                        {status?.passed && <Check size={14} className="text-green-400" />}
                        {!itemUnlocked && !status?.passed && <Lock size={12} className="text-slate-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {courseExam && (
              <div className="border-t border-slate-800 pt-4 space-y-1.5">
                <div className="flex justify-between items-center px-2">
                  <h5 className="text-[11px] font-bold text-amber-500 uppercase">Final Evaluation</h5>
                  {!isModuleUnlocked(activePlayer, activePlayer.course.modules?.filter(m => m.title !== "Final Quiz") || [], (activePlayer.course.modules?.filter(m => m.title !== "Final Quiz") || []).length) && <Lock size={12} className="text-slate-600" />}
                </div>
                <div className="space-y-1">
                  {(() => {
                    const modUnlocked = isModuleUnlocked(activePlayer, activePlayer.course.modules?.filter(m => m.title !== "Final Quiz") || [], (activePlayer.course.modules?.filter(m => m.title !== "Final Quiz") || []).length);
                    const itemUnlocked = modUnlocked && isItemUnlocked('course_exam', null);
                    return (
                      <button
                        disabled={!itemUnlocked}
                        onClick={() => { setActiveCourseExam(true); setActiveQuiz(null); setActiveLesson(null); setActiveAssessment(null); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center justify-between transition ${!itemUnlocked ? 'opacity-50 cursor-not-allowed hover:bg-transparent text-slate-500' : activeCourseExam ? 'bg-amber-600 text-white' : 'hover:bg-slate-800 text-amber-400'}`}
                      >
                        <span className="truncate pr-2"><Award size={14} className="inline mr-1"/> Course Exam</span>
                        {activePlayer.course_exam_attempts?.some(a => a.status === 'PASSED') && <Check size={14} className="text-green-400" />}
                        {!itemUnlocked && !activePlayer.course_exam_attempts?.some(a => a.status === 'PASSED') && <Lock size={12} className="text-slate-600" />}
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-4 lg:p-8 bg-slate-50">
          {activeCourseExam && courseExam && (
             <CourseExamTaker exam={courseExam} onComplete={() => { loadData(); setActiveCourseExam(false); }} onCancel={() => setActiveCourseExam(false)} />
          )}
          {activeLesson && (
            <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">{activeLesson.title}</h3>
              {activeLesson.content_type?.toLowerCase() === "video" && (activeLesson.video_file || activeLesson.video_url) && (
                <div className="bg-black rounded-xl overflow-hidden aspect-video max-h-[360px] flex items-center justify-center">
                  <video
                    ref={videoRef}
                    key={activeLesson.id}
                    src={getMediaUrl(activeLesson.video_file || activeLesson.video_url)}
                    controls
                    crossOrigin="anonymous"
                    controlsList={canComplete ? undefined : "nodownload"}
                    onContextMenu={e => { if (!canComplete) e.preventDefault(); }}
                    onLoadedMetadata={(e) => {
                      const userIdentifier = sessionStorage.getItem("email") || sessionStorage.getItem("username") || "guest";
                      const savedMaxTime = localStorage.getItem(`vid_progress_v2_${userIdentifier}_${activeLesson.id}`);
                      const maxTime = savedMaxTime ? parseFloat(savedMaxTime) : 0;
                      maxTimeWatchedRef.current = maxTime;
                      
                      const savedLastPlayed = localStorage.getItem(`vid_last_played_${userIdentifier}_${activeLesson.id}`);
                      const resumeTime = savedLastPlayed ? parseFloat(savedLastPlayed) : maxTime;

                      if (resumeTime > 0 && e.target.duration && resumeTime < e.target.duration * 0.99) {
                        e.target.currentTime = resumeTime;
                      }
                    }}
                    onSeeking={(e) => {
                      if (e.target.currentTime > maxTimeWatchedRef.current + 0.1) {
                        e.target.currentTime = maxTimeWatchedRef.current;
                      }
                    }}
                    onSeeked={(e) => {
                      if (e.target.currentTime > maxTimeWatchedRef.current + 0.1) {
                        e.target.currentTime = maxTimeWatchedRef.current;
                      }
                    }}
                    onPlay={startLessonTimer}
                    onEnded={(e) => {
                      if (maxTimeWatchedRef.current >= e.target.duration * 0.95) {
                        setCanComplete(true);
                      } else {
                        e.target.currentTime = maxTimeWatchedRef.current;
                        e.target.play().catch(() => {});
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const video = e.target;
                      if (!video.duration) return;
                      const currentTime = video.currentTime;
                      const userIdentifier = sessionStorage.getItem("email") || sessionStorage.getItem("username") || "guest";
                      
                      localStorage.setItem(`vid_last_played_${userIdentifier}_${activeLesson.id}`, currentTime.toString());
                      
                      if (!video.seeking) {
                        // Strict interval skipping protection (0.5 seconds)
                        if (currentTime > maxTimeWatchedRef.current + 0.5) {
                          video.currentTime = maxTimeWatchedRef.current;
                        } else {
                          const newMaxTime = Math.max(maxTimeWatchedRef.current, currentTime);
                          if (newMaxTime > maxTimeWatchedRef.current) {
                            maxTimeWatchedRef.current = newMaxTime;
                            localStorage.setItem(`vid_progress_v2_${userIdentifier}_${activeLesson.id}`, newMaxTime.toString());
                          }
                        }
                      }
                      
                      // Mark complete if 95% watched (more reliable than 99%)
                      if (maxTimeWatchedRef.current >= video.duration * 0.95) {
                        setCanComplete(true);
                      }
                    }}
                    className="w-full h-full object-contain unclickable-timeline"
                  >
                    {activeLesson.vtt_file && <track kind="subtitles" src={getMediaUrl(activeLesson.vtt_file)} srcLang="en" label="English" default />}
                  </video>
                </div>
              )}
              {activeLesson.content_type?.toLowerCase() === "video" && !(activeLesson.video_file || activeLesson.video_url) && (
                <div className="rounded-xl overflow-hidden aspect-video bg-slate-100 flex flex-col items-center justify-center p-6 border border-slate-200 text-center space-y-4">
                  <Video size={48} className="text-slate-400" />
                  <div>
                    <h4 className="font-bold text-slate-800">No Video Available</h4>
                    <p className="text-slate-500 text-sm">The instructor has not uploaded a video for this lesson.</p>
                  </div>
                </div>
              )}
              {activeLesson.content_type?.toLowerCase() === "audio" && (activeLesson.audio_file || activeLesson.audio_url) && (
                <audio key={activeLesson.id} src={getMediaUrl(activeLesson.audio_file || activeLesson.audio_url)} controls crossOrigin="anonymous" onPlay={startLessonTimer} onEnded={() => setCanComplete(true)} className="w-full mt-3">
                  {activeLesson.vtt_file && <track kind="subtitles" src={getMediaUrl(activeLesson.vtt_file)} srcLang="en" label="English" default />}
                </audio>
              )}
              {activeLesson.content_type?.toLowerCase() === "audio" && !(activeLesson.audio_file || activeLesson.audio_url) && (
                <div className="rounded-xl overflow-hidden h-32 bg-slate-100 flex flex-col items-center justify-center p-6 border border-slate-200 text-center space-y-4">
                  <Music size={32} className="text-slate-400" />
                  <div>
                    <h4 className="font-bold text-slate-800">No Audio Available</h4>
                    <p className="text-slate-500 text-sm">The instructor has not uploaded an audio file for this lesson.</p>
                  </div>
                </div>
              )}
              {activeLesson.content_type?.toLowerCase() === "image" && (activeLesson.image_file || activeLesson.image_url) && (
                <div className="rounded-xl overflow-hidden max-h-[480px] flex items-center justify-center bg-slate-100 p-2 border border-slate-200">
                  <img src={getMediaUrl(activeLesson.image_file || activeLesson.image_url)} alt={activeLesson.title} className="max-w-full max-h-[440px] object-contain rounded-lg" />
                </div>
              )}
              {activeLesson.content_type?.toLowerCase() === "image" && !(activeLesson.image_file || activeLesson.image_url) && (
                <div className="rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 flex flex-col items-center justify-center p-6 border border-slate-200 text-center space-y-4">
                  <Image size={48} className="text-slate-400" />
                  <div>
                    <h4 className="font-bold text-slate-800">No Image Available</h4>
                    <p className="text-slate-500 text-sm">The instructor has not uploaded an image for this lesson.</p>
                  </div>
                </div>
              )}
              {activeLesson.content_type?.toLowerCase() === "document" && (activeLesson.document_file || activeLesson.document_url) && (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden aspect-[4/3] flex flex-col bg-slate-100 p-2 border border-slate-200">
                    {(() => {
                      const proxyUrl = activeLesson.document_file
                        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/lessons/${activeLesson.id}/document?v=2`
                        : activeLesson.document_url;

                      return (
                        <div id={`pdf-container-${activeLesson.id}`} className="w-full h-full rounded-lg bg-white overflow-hidden">
                          <iframe src={proxyUrl} className="w-full h-full bg-white" title={activeLesson.title} />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        const el = document.getElementById(`pdf-container-${activeLesson.id}`);
                        if (el) {
                          if (el.requestFullscreen) { el.requestFullscreen(); }
                          else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); }
                          else if (el.msRequestFullscreen) { el.msRequestFullscreen(); }
                        }
                      }}
                      className="bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-900 transition flex items-center gap-2 text-sm shadow"
                    >
                      <Maximize size={16} /> Full Screen
                    </button>
                    {(() => {
                      const downloadUrl = activeLesson.document_file
                        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/lessons/${activeLesson.id}/document?download=true`
                        : activeLesson.document_url;
                      return (
                        <a href={downloadUrl} target="_blank" rel="noreferrer" download className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center gap-2 text-sm shadow">
                          <FileText size={16} /> Download Document
                        </a>
                      );
                    })()}
                  </div>
                </div>
              )}
              {activeLesson.content_type?.toLowerCase() === "document" && !(activeLesson.document_file || activeLesson.document_url) && (
                <div className="rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 flex flex-col items-center justify-center p-6 border border-slate-200 text-center space-y-4">
                  <FileText size={48} className="text-slate-400" />
                  <div>
                    <h4 className="font-bold text-slate-800">No Document Available</h4>
                    <p className="text-slate-500 text-sm">The instructor has not uploaded a document for this lesson.</p>
                  </div>
                </div>
              )}
              {activeLesson.text_content && <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line">{activeLesson.text_content}</div>}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                  {(!isLessonCompleted(activePlayer, activeLesson.id) && !canComplete && countdown > 0) && (
                    <>
                      <Clock size={16} className="text-yellow-500 animate-pulse" />
                      <span>Required Time: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
                    </>
                  )}
                </div>
                {isLessonCompleted(activePlayer, activeLesson.id) ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-4 py-2 rounded-xl border border-green-200">Completed 🎉</span>
                      <button onClick={() => handleNextItem('lesson', activeLesson.id)} className="font-black font-bold py-2 px-5 rounded-xl text-xs transition bg-blue-600 hover:bg-blue-700 text-white shadow flex items-center gap-1.5">
                        Next <ChevronRight size={14}/>
                      </button>
                    </div>
                  ) : (
                    <button disabled={!canComplete} onClick={() => handleCompleteLesson(activeLesson.id)} className={`font-black font-bold py-2 px-5 rounded-xl text-xs transition flex items-center gap-2 ${canComplete ? 'bg-yellow-500 hover:bg-yellow-400 text-blue-950 shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                      {canComplete ? 'Mark Completed' : <><Lock size={14} /> Locked</>}
                    </button>
                  )}
              </div>
            </div>
          )}
          {activeQuiz && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-900">{activeQuiz.title}</h3>
              {quizResult ? (
                <div className="text-center py-8 space-y-3">
                  <div className="text-4xl">{quizResult.passed ? "🎉" : "😢"}</div>
                  <h4 className="text-base font-bold text-slate-800">{quizResult.passed ? "Quiz Passed!" : "Quiz Failed"}</h4>
                  <p className="text-sm text-slate-500">Score: {quizResult.score} / {quizResult.total_questions}</p>
                  <div className="flex justify-center gap-3 mt-4">
                    <button onClick={() => { setQuizResult(null); setQuizAnswers({}); }} className="bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs">Retake Quiz</button>
                    {quizResult.passed && (
                      <button onClick={() => handleNextItem('quiz', activeQuiz.id)} className="font-black font-bold py-2 px-5 rounded-xl text-xs transition bg-blue-600 hover:bg-blue-700 text-white shadow flex items-center gap-1.5">
                        Next <ChevronRight size={14}/>
                      </button>
                    )}
                  </div>
                </div>
              ) : getQuizStatus(activePlayer, activeQuiz.id)?.passed ? (
                <div className="text-center py-8 space-y-3">
                  <span className="text-4xl">🏆</span>
                  <p className="text-sm font-bold text-green-600">You have already passed this quiz!</p>
                  <div className="flex justify-center gap-3 mt-4">
                    <button onClick={() => { setQuizAnswers({}); }} className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs">Retake Quiz</button>
                    <button onClick={() => handleNextItem('quiz', activeQuiz.id)} className="font-black font-bold py-2 px-5 rounded-xl text-xs transition bg-blue-600 hover:bg-blue-700 text-white shadow flex items-center gap-1.5">
                      Next <ChevronRight size={14}/>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuiz(activeQuiz.id); }} className="space-y-5">
                  {activeQuiz.questions?.map((q, idx, arr) => {
                    let isUnlocked = true;
                    if (idx > 0) {
                      for (let i = 0; i < idx; i++) {
                        const prevAns = quizAnswers[arr[i].id];
                        if (!prevAns || (Array.isArray(prevAns) && prevAns.length === 0)) {
                          isUnlocked = false;
                          break;
                        }
                      }
                    }
                    return (
                    <div key={q.id} className={`p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-sm transition-all ${!isUnlocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                      <div className="font-bold text-slate-800 flex justify-between items-center">
                        <span>{idx + 1}. {q.text}</span>
                        {!isUnlocked && <Lock size={14} className="text-slate-400" />}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {['A', 'B', 'C', 'D'].map(k => {
                          const val = q[`option_${k.toLowerCase()}`];
                          if (!val) return null;
                          const isMult = q.question_type === 'multiple';
                          const isSel = isMult ? (quizAnswers[q.id] || []).includes(k) : quizAnswers[q.id] === k;
                          return (
                            <label key={k} className={`flex items-center gap-3 p-3 rounded-lg border bg-white cursor-pointer transition ${isSel ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:bg-slate-100'}`}>
                              <input
                                type={isMult ? 'checkbox' : 'radio'}
                                name={`q-${q.id}`}
                                checked={isSel}
                                onChange={() => {
                                  if (isMult) {
                                    const curr = quizAnswers[q.id] || [];
                                    setQuizAnswers({ ...quizAnswers, [q.id]: curr.includes(k) ? curr.filter(o => o !== k) : [...curr, k] });
                                  } else {
                                    setQuizAnswers({ ...quizAnswers, [q.id]: k });
                                  }
                                }}
                                className="h-4 w-4 text-blue-950 border-slate-300 bg-white"
                              />
                              <span className="font-bold">{k}.</span>
                              <span>{val}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )})}
                  <div className="flex justify-end pt-3">
                    {(() => {
                      const isQuizComplete = activeQuiz.questions?.every(q => {
                        const ans = quizAnswers[q.id];
                        return ans && (!Array.isArray(ans) || ans.length > 0);
                      });
                      return (
                        <button type="submit" disabled={submitting || !isQuizComplete} className={`font-black font-bold py-2.5 px-6 rounded-xl text-xs transition shadow ${submitting || !isQuizComplete ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-yellow-500 hover:bg-yellow-400 text-blue-950 shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)]'}`}>
                          {submitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                      );
                    })()}
                  </div>
                </form>
              )}
            </div>
          )}
          {!activeLesson && !activeQuiz && !activeCourseExam && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              {readyCert ? (
                <>
                  <div className="text-6xl mb-4">🏆</div>
                  <h4 className="font-bold text-2xl text-slate-800 mb-2">Congratulations!</h4>
                  <p className="text-slate-500 mb-6 max-w-md">You have successfully completed all the modules, quizzes, and the final exam for this course.</p>
                  
                  {getCertStatus(activePlayer.id) === 'APPROVED' ? (
                    <button
                      onClick={() => navigate('/student-dashboard/certificates')}
                      className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
                    >
                      <Award size={20} /> View Certificate
                    </button>
                  ) : getCertStatus(activePlayer.id) === 'PENDING' ? (
                    <div className="px-8 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl border-2 border-slate-200 flex items-center gap-2 cursor-default">
                      <Clock size={20} /> Certificate Requested
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRequestCert(activePlayer.course.id)}
                      className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
                    >
                      <Award size={20} /> Request Certificate
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="text-4xl mb-3">📖</div>
                  <h4 className="font-bold text-slate-800">Select an item from the syllabus panel to begin!</h4>
                  <p className="text-slate-500 text-xs mt-1">Select lessons or quizzes in the sidebar to load their content.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Segmented Control Tabs */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl shadow-inner border border-slate-200/50">
          <button
            onClick={() => setActiveTab('enrolled')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'enrolled' ? 'bg-white text-blue-900 shadow-sm scale-100' : 'text-slate-500 hover:text-slate-800 scale-95'}`}
          >
            My Learning
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${activeTab === 'discover' ? 'bg-white text-blue-900 shadow-sm scale-100' : 'text-slate-500 hover:text-slate-800 scale-95'}`}
          >
            Discover Courses
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <select
            value={activeTab === 'enrolled' ? enrolledSort : discoverSort}
            onChange={(e) => activeTab === 'enrolled' ? setEnrolledSort(e.target.value) : setDiscoverSort(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm hover:border-slate-300 transition-colors cursor-pointer outline-none"
          >
            <option value="Newest">Sort by: Newest</option>
            <option value="Oldest">Sort by: Oldest</option>
            <option value="Title A-Z">Title A-Z</option>
            <option value="Title Z-A">Title Z-A</option>
          </select>
          <div className="relative w-full md:w-72 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm shadow-sm hover:border-slate-300 transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
        </div>
      ) : activeTab === 'enrolled' ? (
        <div className="space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedEnrolled.map(e => {
              const progress = getProgress(e);
              const certStatus = getCertStatus(e.id);
              const readyCert = checkCertReady(e);
              return (
                <div key={e.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 overflow-hidden flex flex-col group transition-all duration-300">
                  <div className="h-44 relative overflow-hidden bg-slate-100 cursor-pointer" onClick={() => { setActivePlayer(e); setActiveLesson(null); setActiveQuiz(null); setActiveAssessment(null); setQuizResult(null); }}>
                    {e.course.thumbnail_file || e.course.thumbnail_url ? (
                      <img src={getMediaUrl(e.course.thumbnail_file || e.course.thumbnail_url)} alt={e.course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-bold p-4 text-center text-sm shadow-inner group-hover:scale-105 transition-transform duration-700">{e.course.title}</div>
                    )}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-1 justify-between relative bg-white">
                    <div className="mb-4">
                      <h3 className="font-extrabold text-slate-800 mb-1.5 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 transition-colors">{e.course.title}</h3>
                      <p className="text-xs font-medium text-slate-400">By {e.course.instructor?.full_name || e.course.instructor?.email}</p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
                        <span className="text-blue-600">{progress.pct}% Complete</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 relative" style={{ width: `${progress.pct}%` }}>
                          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/40 rounded-full"></div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (certStatus === 'APPROVED' || certStatus === 'PENDING') {
                            navigate('/student-dashboard/certificates');
                          } else {
                            setActivePlayer(e);
                            setActiveLesson(null);
                            setActiveQuiz(null);
                            setActiveAssessment(null);
                            setQuizResult(null);
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${certStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-500 hover:text-white shadow-sm' : readyCert && certStatus !== 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white shadow-sm' : certStatus === 'PENDING' ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-slate-50 text-blue-600 border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-blue-500/20'}`}
                      >
                        {certStatus === 'APPROVED' ? <><Award size={18} /> View Certificate</> : certStatus === 'PENDING' ? <><Clock size={18} /> Certificate Pending</> : readyCert ? <><Award size={18} /> Request Certificate</> : <><PlayCircle size={18} className="group-hover:scale-110 transition-transform" /> Continue Learning</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {sortedEnrolled.length === 0 && (
              <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500">
                No enrolled courses found.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedDiscover.map(course => {
            const isEnrolled = enrollments.some(e => String(e.course.id) === String(course.id));
            return (
              <div key={course.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 overflow-hidden flex flex-col group transition-all duration-300">
                <div className="h-44 relative overflow-hidden bg-slate-100 cursor-pointer" onClick={() => openPreview(course.id)}>
                  {course.thumbnail_file || course.thumbnail_url ? (
                    <img src={getMediaUrl(course.thumbnail_file || course.thumbnail_url)} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-800 flex items-center justify-center text-white font-bold p-4 text-center text-sm shadow-inner group-hover:scale-105 transition-transform duration-700">{course.title}</div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                    Free
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
                
                <div className="p-5 flex flex-col flex-1 relative bg-white">
                  <div className="mb-5 cursor-pointer" onClick={() => openPreview(course.id)}>
                    <h3 className="font-extrabold text-slate-800 mb-1.5 line-clamp-2 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                    <p className="text-xs font-medium text-slate-400">By {course.instructor?.full_name || course.instructor?.email}</p>
                  </div>

                  <div className="mt-auto">
                    {isEnrolled ? (
                      <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 font-bold py-2.5 rounded-xl text-sm border border-emerald-100">
                        <Check size={16} /> Enrolled
                      </div>
                    ) : (
                      <button onClick={(e) => {
                          e.stopPropagation();
                          openPreview(course.id);
                      }} className="w-full py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 bg-white border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-slate-900/20">
                        <BookOpen size={18} /> View Course Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {sortedDiscover.length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500">
              No discoverable courses found.
            </div>
          )}
        </div>
      )}

      {previewCourseId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={closePreview}>
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={closePreview} className="absolute top-4 right-4 bg-black/10 hover:bg-black/20 text-slate-800 p-2 rounded-full transition-colors z-10">
              <X size={20} />
            </button>
            
            {/* Header Banner */}
            <div className="h-48 relative bg-slate-100 shrink-0 rounded-t-3xl overflow-hidden">
              {previewCourseData?.thumbnail_file || previewCourseData?.thumbnail_url ? (
                <img src={getMediaUrl(previewCourseData.thumbnail_file || previewCourseData.thumbnail_url)} alt={previewCourseData.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-200">{previewCourseData?.title}</div>
              )}
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
              {previewLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
                </div>
              ) : previewCourseData ? (
                <div className="space-y-8">
                  {/* Title Section */}
                  <div>
                    <div className="inline-block px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                      {previewCourseData?.difficulty_level || 'Beginner'}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight mb-2">
                      {previewCourseData.title}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                      By {previewCourseData?.instructor?.full_name || previewCourseData?.instructor?.email || 'Instructor'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Content Column */}
                    <div className="md:col-span-2 space-y-8">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Course Overview</h3>
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{previewCourseData.description}</p>
                      </div>

                      {previewCourseData.learning_outcomes && (
                        <div>
                          <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">What You'll Learn</h3>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {previewCourseData.learning_outcomes.split(',').map((outcome, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm font-medium">
                                <Check size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                <span>{outcome.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Course Curriculum</h3>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          {previewCourseData.modules?.length > 0 ? (
                            previewCourseData.modules.map((mod, idx) => (
                              <div key={mod.id} className={`p-4 ${idx !== previewCourseData.modules.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                <h4 className="font-bold text-slate-800 text-sm mb-2">{idx + 1}. {mod.title}</h4>
                                <div className="space-y-2 pl-4">
                                  {mod.lessons?.map(l => (
                                    <div key={l.id} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                      {l.lesson_type === 'video' ? <Video size={14} className="text-slate-400"/> : l.lesson_type === 'audio' ? <Music size={14} className="text-slate-400"/> : l.lesson_type === 'image' ? <Image size={14} className="text-slate-400"/> : <FileText size={14} className="text-slate-400"/>}
                                      {l.title}
                                    </div>
                                  ))}
                                  {mod.quizzes?.map(q => (
                                    <div key={q.id} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                      <File size={14} className="text-slate-400"/> {q.title} (Quiz)
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-sm text-slate-500 text-center">Curriculum not available yet.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-6">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          <Clock size={18} className="text-slate-400"/> 
                          <div>
                            <p className="text-xs text-slate-500 font-bold">DURATION</p>
                            <p>{previewCourseData.estimated_duration || 'Self-paced'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          <Award size={18} className="text-slate-400"/> 
                          <div>
                            <p className="text-xs text-slate-500 font-bold">CERTIFICATE</p>
                            <p>Included upon completion</p>
                          </div>
                        </div>
                        
                        {previewCourseData.skills_gained && (
                          <div className="pt-4 border-t border-slate-200">
                            <p className="text-xs text-slate-500 font-bold mb-2">SKILLS YOU'LL GAIN</p>
                            <div className="flex flex-wrap gap-2">
                              {previewCourseData.skills_gained.split(',').map((skill, idx) => (
                                <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-semibold">{skill.trim()}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {previewCourseData.prerequisites?.length > 0 && (
                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                          <h4 className="font-bold text-amber-900 text-sm mb-3 flex items-center gap-2"><Lock size={16}/> Enrollment Prerequisites</h4>
                          <div className="space-y-3">
                            {previewCourseData.prerequisites.map(p => {
                              const pEnrolled = enrollments.find(e => String(e.course?.id) === String(p.id));
                              let isCompleted = false;
                              if (pEnrolled) {
                                 const hasCert = certificates?.some(c => String(c.enrollment_id) === String(pEnrolled.id) && c.status === 'APPROVED');
                                 if (pEnrolled.completed_at || hasCert) isCompleted = true;
                              }
                              return (
                                <div key={p.id} className="flex items-start gap-2 text-xs">
                                  {isCompleted ? <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5"/> : <div className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0 mt-0.5"></div>}
                                  <div>
                                    <span className={isCompleted ? 'text-emerald-800 font-bold' : 'text-amber-900 font-bold'}>{p.title}</span>
                                    {(!isCompleted && p.minimum_completion_percentage > 0) && <p className="text-amber-700 text-[10px] font-medium mt-0.5">Requires {p.minimum_completion_percentage}% completion</p>}
                                    {(!isCompleted && p.minimum_quiz_score > 0) && <p className="text-amber-700 text-[10px] font-medium mt-0.5">Requires {p.minimum_quiz_score}% average quiz score</p>}
                                    {(!isCompleted && p.certificate_required) && <p className="text-amber-700 text-[10px] font-medium mt-0.5">Requires course certificate</p>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer / Action Bar */}
            {!previewLoading && previewCourseData && (
              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 rounded-b-3xl">
                {(() => {
                  const hasUnmet = previewCourseData.prerequisites?.some(p => {
                     const pEnrolled = enrollments.find(e => String(e.course?.id) === String(p.id));
                     if (!pEnrolled) return true;
                     const hasCert = certificates?.some(c => String(c.enrollment_id) === String(pEnrolled.id) && c.status === 'APPROVED');
                     return !(pEnrolled.completed_at || hasCert);
                  });
                  return (
                    <button 
                      onClick={() => {
                          if (hasUnmet) {
                             alert("Please complete all prerequisites before enrolling.");
                             return;
                          }
                          handleEnroll(previewCourseData.id);
                          closePreview();
                      }} 
                      disabled={hasUnmet}
                      className={`px-8 py-3 rounded-lg font-bold text-sm transition-all duration-300 ${
                        hasUnmet ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black'
                      }`}
                    >
                      {hasUnmet ? 'Prerequisites Pending' : 'Request Enrollment'}
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentCourses;