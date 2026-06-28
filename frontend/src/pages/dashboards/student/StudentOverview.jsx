import { useState, useEffect } from 'react';
import { PlayCircle, Award, Target, Flame, Calendar, BookOpen, ClipboardList, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';

function StudentOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ quizzesPassed: 0, totalQuizzes: 0, certsCount: 0 });
  const [activeCourse, setActiveCourse] = useState(null);
  const [streakCount, setStreakCount] = useState(1);
  const [loading, setLoading] = useState(true);



  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const normalized = path.replace(/\\/g, '/');
    return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${normalized.startsWith('/') ? normalized.slice(1) : normalized}`;
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [resEnroll, resCerts, resStreak] = await Promise.all([
          api.get(`/api/courses/enrollments`),
          api.get(`/api/courses/certificates`),
          api.post(`/api/accounts/streak`)
        ]);
        let enrolls = [];
        let certs = [];
        if ((resEnroll.status >= 200 && resEnroll.status < 300)) enrolls = resEnroll.data;
        if ((resCerts.status >= 200 && resCerts.status < 300)) certs = resCerts.data;
        if ((resStreak.status >= 200 && resStreak.status < 300)) setStreakCount(resStreak.data.streak_count || 1);

        let totalQuizzes = 0;
        let quizzesPassed = 0;
        let totalLessons = 0;
        let lessonsCompleted = 0;
        let totalExams = 0;
        let examsPassed = 0;
        let totalAssignments = 0;
        let assignmentsDone = 0;
        let enrolledCourses = enrolls.length;

        enrolls.forEach(e => {
          // Lessons & Quizzes
          e.course.modules?.forEach(m => {
            totalQuizzes += m.quizzes?.length || 0;
            totalLessons += m.lessons?.length || 0;
            m.quizzes?.forEach(q => {
              if (e.quiz_attempts?.some(a => a.quiz === q.id && a.passed)) {
                quizzesPassed++;
              }
            });
            m.lessons?.forEach(l => {
              if (e.lesson_progress?.some(p => p.lesson === l.id && p.is_completed)) {
                lessonsCompleted++;
              }
            });
          });

          // Assignments
          if (e.course.assessments) {
             totalAssignments += e.course.assessments.length;
             e.course.assessments.forEach(a => {
                if (e.assessment_submissions?.some(sub => sub.assessment === a.id)) {
                   assignmentsDone++;
                }
             });
          }

          // Course Exams
          if (e.course.has_course_exam) {
             totalExams++;
             if (e.course_exam_attempts?.some(a => a.status === 'PASSED')) {
                examsPassed++;
             }
          }
        });

        const approvedCerts = certs.filter(r => r.status?.toUpperCase() === "APPROVED").length;
        setStats({ 
           enrolledCourses, 
           totalLessons, lessonsCompleted, 
           totalQuizzes, quizzesPassed, 
           totalAssignments, assignmentsDone, 
           totalExams, examsPassed, 
           certsCount: approvedCerts 
        });

        const active = enrolls.find(e => {
          let courseLessons = 0;
          e.course.modules?.forEach(m => { courseLessons += m.lessons?.length || 0; });
          const completed = e.lesson_progress?.filter(p => p.is_completed).length || 0;
          return courseLessons > 0 && completed < courseLessons;
        }) || enrolls[0];

        if (active) {
          let courseLessons = 0;
          active.course.modules?.forEach(m => { courseLessons += m.lessons?.length || 0; });
          const completed = active.lesson_progress?.filter(p => p.is_completed).length || 0;
          const pct = courseLessons > 0 ? Math.round((completed / courseLessons) * 100) : 0;
          setActiveCourse({
            id: active.id,
            title: active.course.title,
            progress: pct,
            image: getMediaUrl(active.course.thumbnail_file || active.course.thumbnail_url) || null,
            instructor: active.course.instructor?.full_name || active.course.instructor?.email
          });
        }
      } catch (err) { } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);
  const username = sessionStorage.getItem("username") || "Learner";

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-brand-600 to-accent-700 rounded-3xl p-8 text-base-white flex flex-col md:flex-row justify-between items-center shadow-lg shadow-brand-900/20">
        <div className="mb-6 md:mb-0">
          <h2 className="text-3xl font-extrabold mb-2">Welcome back, {username}! 👋</h2>
          {activeCourse ? (
            <p className="text-brand-100 max-w-md text-sm leading-relaxed">
              You are {activeCourse.progress}% through your {activeCourse.title} course. Keep up the great work!
            </p>
          ) : (
            <p className="text-brand-100 max-w-md text-sm leading-relaxed">
              You don't have any active learning courses. Explore the catalog and request enrollment!
            </p>
          )}
        </div>
        <div className="bg-base-white/20 p-4 rounded-2xl backdrop-blur-sm border border-base-white/30 text-center min-w-[150px]">
          <div className="flex items-center justify-center gap-2 text-warning-300 font-bold text-xl mb-1">
            <Flame size={24} className="fill-warning-300" />
            {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-base-white">Learning Streak</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-base-white rounded-2xl border border-surface-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-950"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-6">
            {activeCourse && (
              <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-surface-800">Continue Learning</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div
                    onClick={() => navigate('/student-dashboard/courses')}
                    className="w-full sm:w-1/3 h-32 bg-surface-200 rounded-xl relative overflow-hidden group cursor-pointer"
                  >
                    {activeCourse.image ? (
                      <img src={activeCourse.image} alt="Course Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent-100 to-brand-200 flex flex-col items-center justify-center text-accent-400 group-hover:scale-105 transition-transform duration-500">
                        <span className="text-xs font-bold mt-2">No Thumbnail</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-base-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle size={48} className="text-base-white" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-xs font-bold text-brand-950 mb-1">IN PROGRESS</p>
                    <h4 className="text-xl font-bold text-surface-900 mb-2">{activeCourse.title}</h4>
                    <p className="text-sm text-surface-500 mb-4">By {activeCourse.instructor}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-950 rounded-full" style={{ width: `${activeCourse.progress}%` }}></div>
                      </div>
                      <span className="text-sm font-bold text-surface-700">{activeCourse.progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-brand-50 text-brand-600 rounded-xl">
                  <BookOpen size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Enrolled Courses</p>
                  <h4 className="text-2xl font-bold text-surface-900">{stats.enrolledCourses}</h4>
                </div>
              </div>
              <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-success-50 text-success-600 rounded-xl">
                  <PlayCircle size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Lessons Completed</p>
                  <h4 className="text-2xl font-bold text-surface-900">{stats.lessonsCompleted}/{stats.totalLessons}</h4>
                </div>
              </div>
              <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-warning-50 text-warning-600 rounded-xl">
                  <Target size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Quizzes Passed</p>
                  <h4 className="text-2xl font-bold text-surface-900">{stats.quizzesPassed}/{stats.totalQuizzes}</h4>
                </div>
              </div>
              <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-info-50 text-info-600 rounded-xl">
                  <Award size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Certificates Earned</p>
                  <h4 className="text-2xl font-bold text-surface-900">{stats.certsCount}</h4>
                </div>
              </div>
              <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-accent-50 text-accent-600 rounded-xl">
                  <ClipboardList size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Exams Passed</p>
                  <h4 className="text-2xl font-bold text-surface-900">{stats.examsPassed}/{stats.totalExams}</h4>
                </div>
              </div>
              <div className="bg-base-white p-6 rounded-2xl border border-surface-200 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-danger-50 text-danger-600 rounded-xl">
                  <FileText size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-500">Assignments Done</p>
                  <h4 className="text-2xl font-bold text-surface-900">{stats.assignmentsDone}/{stats.totalAssignments}</h4>
                </div>
              </div>
            </div>
          </div>


        </div>
      )}
    </div>
  );
}

export default StudentOverview;