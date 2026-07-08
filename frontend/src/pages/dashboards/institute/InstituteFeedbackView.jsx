import React, { useState, useEffect } from 'react';
import api from '../../../api';
import { Star, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react';

export default function InstituteFeedbackView() {
  const [courseFeedback, setCourseFeedback] = useState([]);
  const [instructorFeedback, setInstructorFeedback] = useState([]);
  const [lessonFeedback, setLessonFeedback] = useState([]);
  const [expandedReview, setExpandedReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, iRes, lRes] = await Promise.all([
          api.get(`/api/feedback/course/org/me`),
          api.get(`/api/feedback/instructor/org/me`),
          api.get(`/api/feedback/lesson/org/me`)
        ]);
        
        setCourseFeedback(cRes.data);
        setInstructorFeedback(iRes.data);
        setLessonFeedback(lRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const avgCourse = courseFeedback.length ? (courseFeedback.reduce((a, b) => a + Number(b.rating), 0) / courseFeedback.length).toFixed(1) : '0.0';
  const avgInstructor = instructorFeedback.length ? (instructorFeedback.reduce((a, b) => a + Number(b.overall_rating), 0) / instructorFeedback.length).toFixed(1) : '0.0';
  const helpfulCount = lessonFeedback.filter(lf => lf.is_helpful).length;
  const helpfulPercentage = lessonFeedback.length ? Math.round((helpfulCount / lessonFeedback.length) * 100) : 0;

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading feedback...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Star size={28} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">Feedback & Reviews</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-blue-950 rounded-2xl p-5 border border-blue-900 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Avg Course Rating</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-extrabold text-white">{avgCourse}</h3>
              <span className="text-sm text-blue-300 font-medium">/ 5.0</span>
            </div>
            <p className="text-xs text-blue-400 mt-1">From {courseFeedback.length} reviews</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <Star size={20} className="fill-white" />
          </div>
        </div>

        <div className="bg-blue-950 rounded-2xl p-5 border border-blue-900 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Avg Instructor Rating</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-extrabold text-white">{avgInstructor}</h3>
              <span className="text-sm text-blue-300 font-medium">/ 5.0</span>
            </div>
            <p className="text-xs text-blue-400 mt-1">From {instructorFeedback.length} reviews</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/20 flex items-center justify-center">
            <Star size={20} className="fill-white" />
          </div>
        </div>

        <div className="bg-blue-950 rounded-2xl p-5 border border-blue-900 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Lesson Helpfulness</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-extrabold text-white">{helpfulPercentage}%</h3>
            </div>
            <p className="text-xs text-blue-400 mt-1">From {lessonFeedback.length} votes</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20 flex items-center justify-center">
            <ThumbsUp size={20} className="fill-white" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Recent Course Reviews</h2>
        <div className="space-y-4">
          {courseFeedback.length === 0 ? (
            <p className="text-slate-500">No course reviews yet.</p>
          ) : (
            courseFeedback.map(f => {
              const isExpanded = expandedReview === f.id;
              const studentLessonFeedbacks = lessonFeedback.filter(
                lf => lf.course_id === f.course_id && lf.student_id === f.student_id
              );
              
              return (
              <div key={f.id} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden transition-all duration-300">
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => setExpandedReview(isExpanded ? null : f.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-800">{f.course_title}</h4>
                      <p className="text-xs text-slate-500">By {f.student_name} on {new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                        <span className="text-xs font-bold text-yellow-700">{f.rating}/5</span>
                      </div>
                      {studentLessonFeedbacks.length > 0 && (
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{f.review}</p>
                  
                  {!isExpanded && studentLessonFeedbacks.length > 0 && (
                    <div className="mt-3 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                      {studentLessonFeedbacks.length} Lesson Feedback{studentLessonFeedbacks.length !== 1 ? 's' : ''} Included
                    </div>
                  )}
                </div>

                {isExpanded && studentLessonFeedbacks.length > 0 && (
                  <div className="border-t border-slate-200 bg-white p-4 space-y-3">
                    <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Lesson Feedback from this Learner</h5>
                    {studentLessonFeedbacks.map(lf => (
                      <div key={lf.id} className="flex items-start justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{lf.lesson_title}</p>
                          {lf.comment && <p className="text-xs text-slate-600 mt-1">{lf.comment}</p>}
                        </div>
                        <div className={`p-1.5 rounded-full flex items-center justify-center ${lf.is_helpful ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {lf.is_helpful ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )})
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Recent Instructor Reviews</h2>
        <div className="space-y-4">
          {instructorFeedback.length === 0 ? (
            <p className="text-slate-500">No instructor reviews yet.</p>
          ) : (
            instructorFeedback.map(f => (
              <div key={f.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800">{f.course_title}</h4>
                    <p className="text-xs text-slate-500">By {f.student_name} on {new Date(f.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                    <Star size={14} className="text-yellow-500" fill="currentColor" />
                    <span className="text-xs font-bold text-yellow-700">{Number(f.overall_rating).toFixed(1)}/5</span>
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>Teaching: {f.teaching_rating}/5</span>
                  <span>Knowledge: {f.knowledge_rating}/5</span>
                  <span>Communication: {f.communication_rating}/5</span>
                </div>
                {f.review && <p className="text-sm text-slate-600 mt-3">{f.review}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
