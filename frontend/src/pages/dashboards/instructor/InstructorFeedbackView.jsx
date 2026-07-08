import React, { useState, useEffect } from 'react';
import api from '../../../api';
import { Star } from 'lucide-react';

export default function InstructorFeedbackView() {
  const [courseFeedback, setCourseFeedback] = useState([]);
  const [instructorFeedback, setInstructorFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, iRes] = await Promise.all([
          api.get(`/api/feedback/course/instructor/me`),
          api.get(`/api/feedback/instructor/me`)
        ]);
        
        setCourseFeedback(cRes.data);
        setInstructorFeedback(iRes.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const avgCourse = courseFeedback.length ? (courseFeedback.reduce((a, b) => a + b.rating, 0) / courseFeedback.length).toFixed(1) : 'N/A';
  const avgInstructor = instructorFeedback.length ? (instructorFeedback.reduce((a, b) => a + b.overall_rating, 0) / instructorFeedback.length).toFixed(1) : 'N/A';

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading feedback...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Star size={28} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">Feedback & Reviews</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase">Average Course Rating</h3>
            <p className="text-4xl font-black text-slate-800 mt-2 flex items-center gap-2">
              {avgCourse} <Star className="text-yellow-400" size={32} fill="currentColor" />
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">From {courseFeedback.length} reviews</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase">Average Instructor Rating</h3>
            <p className="text-4xl font-black text-slate-800 mt-2 flex items-center gap-2">
              {avgInstructor} <Star className="text-yellow-400" size={32} fill="currentColor" />
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">From {instructorFeedback.length} reviews</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Recent Course Reviews</h2>
        <div className="space-y-4">
          {courseFeedback.length === 0 ? (
            <p className="text-slate-500">No course reviews yet.</p>
          ) : (
            courseFeedback.map(f => (
              <div key={f.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800">{f.course_title}</h4>
                    <p className="text-xs text-slate-500">By {f.student_name} on {new Date(f.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                    <Star size={14} className="text-yellow-500" fill="currentColor" />
                    <span className="text-xs font-bold text-yellow-700">{f.rating}/5</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-2">{f.review}</p>
              </div>
            ))
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
                    <span className="text-xs font-bold text-yellow-700">{f.overall_rating.toFixed(1)}/5</span>
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
