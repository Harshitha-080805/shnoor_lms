import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Star, Send, X, ThumbsUp, ThumbsDown, AlertCircle, BookOpen, User } from 'lucide-react';
import api from '../api';

export const PlatformFeedbackModal = ({ isOpen, onClose, role, onSuccess }) => {
  const [category, setCategory] = useState('Suggestion');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      return alert("Please select a star rating before submitting.");
    }
    setSubmitting(true);
    try {
      await api.post('/api/feedback/platform', { category, subject, description, rating });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      alert('Failed to submit feedback.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 opacity-100 transition-opacity">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative border border-slate-100 transform scale-100 transition-transform">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
            <Star className="text-emerald-600" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Platform Feedback</h2>
            <p className="text-slate-500 text-sm mt-0.5">Help us improve your experience</p>
          </div>
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center py-12 text-emerald-600">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <ThumbsUp size={48} className="text-emerald-500" />
            </div>
            <p className="font-bold text-xl text-emerald-800">Thank you!</p>
            <p className="text-emerald-600/80 text-sm mt-1">Your feedback has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                <div className="relative">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  >
                    <option value="Suggestion">💡 Suggestion</option>
                    <option value="Feature Request">🚀 Feature Request</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                <input 
                  required 
                  type="text" 
                  value={subject} 
                  placeholder="What is this regarding?"
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Platform Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={`transition-colors ${(hoveredRating || rating) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea 
                  required 
                  rows="4" 
                  value={description} 
                  placeholder="Please describe your feedback in detail..."
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 resize-none custom-scrollbar"
                ></textarea>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:active:scale-100"
            >
              {submitting ? 'Sending...' : <><Send size={18} /> Send Feedback</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const LessonFeedback = ({ lessonId }) => {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setSubmitted(false); // Reset state when moving to a new lesson
    if (lessonId) {
      api.get(`/api/feedback/lesson/check/${lessonId}`)
        .then(res => {
          if (isMounted && res.data.hasSubmitted) {
            setSubmitted(true);
          }
        })
        .catch(console.error);
    }
    return () => { isMounted = false; };
  }, [lessonId]);

  const handleFeedback = async (isHelpful) => {
    try {
      await api.post('/api/feedback/lesson', { lesson_id: lessonId, is_helpful: isHelpful, comment: '' });
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 400) {
        setSubmitted(true); // Already submitted
      }
    }
  };

  if (submitted) {
    return <div className="text-sm text-slate-500 text-center py-4">Thanks for your feedback!</div>;
  }

  return (
    <div className="flex items-center justify-center gap-4 py-4 border-t border-slate-100 mt-4">
      <span className="text-sm font-medium text-slate-600">Was this lesson helpful?</span>
      <button onClick={() => handleFeedback(true)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition"><ThumbsUp size={20} /></button>
      <button onClick={() => handleFeedback(false)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"><ThumbsDown size={20} /></button>
    </div>
  );
};

export const CourseFeedbackForm = ({ courseId, instructorId, onComplete }) => {
  const [courseRating, setCourseRating] = useState(0);
  const [courseReview, setCourseReview] = useState('');
  
  const [teachingRating, setTeachingRating] = useState(0);
  const [knowledgeRating, setKnowledgeRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [instructorReview, setInstructorReview] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!courseRating) {
      return alert("Please provide an overall course rating before submitting.");
    }
    
    if (instructorId && (!teachingRating || !knowledgeRating || !communicationRating)) {
      return alert("Please provide all instructor ratings before submitting.");
    }
    
    setSubmitting(true);
    try {
      await api.post('/api/feedback/course', { course_id: courseId, rating: courseRating, review: courseReview });
      
      if (instructorId) {
        await api.post('/api/feedback/instructor', { 
          instructor_id: instructorId, course_id: courseId, 
          teaching_rating: teachingRating, knowledge_rating: knowledgeRating, 
          communication_rating: communicationRating, review: instructorReview 
        });
      }
      
      onComplete();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit feedback.');
    }
    setSubmitting(false);
  };

  const StarRating = ({ value, onChange, size = 28, gap = 'gap-2' }) => (
    <div className={`flex items-center justify-center ${gap}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button 
          key={star} 
          type="button" 
          onClick={() => onChange(star)} 
          className={`transition-all duration-200 transform hover:scale-110 ${star <= value ? 'text-amber-400 drop-shadow-md' : 'text-slate-200 hover:text-amber-200'}`}
        >
          <Star size={size} fill={star <= value ? "currentColor" : "none"} weight={star <= value ? "fill" : "regular"} />
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-8">
      
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <h2 className="text-3xl font-extrabold text-slate-800">Rate Your Experience</h2>
        <p className="text-slate-500 font-medium">Your feedback helps us improve the course for future students.</p>
      </div>

      <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={24} className="text-blue-500" /> Course Feedback
        </h3>
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">Overall Course Rating</label>
          <StarRating value={courseRating} onChange={setCourseRating} size={36} />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">Course Review (Optional)</label>
          <textarea 
            rows="3" 
            value={courseReview} 
            onChange={e => setCourseReview(e.target.value)} 
            className="w-full border-slate-200 bg-white rounded-xl shadow-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all p-4 resize-none" 
            placeholder="What did you love? What could be better?"
          ></textarea>
        </div>
      </div>

      {instructorId && (
        <div className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User size={24} className="text-purple-500" /> Instructor Feedback
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center w-full overflow-hidden">
              <label className="block text-sm font-bold text-slate-700 mb-3 truncate w-full">Teaching</label>
              <StarRating value={teachingRating} onChange={setTeachingRating} size={22} gap="gap-1" />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center w-full overflow-hidden">
              <label className="block text-sm font-bold text-slate-700 mb-3 truncate w-full">Knowledge</label>
              <StarRating value={knowledgeRating} onChange={setKnowledgeRating} size={22} gap="gap-1" />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center w-full overflow-hidden">
              <label className="block text-sm font-bold text-slate-700 mb-3 truncate w-full">Communication</label>
              <StarRating value={communicationRating} onChange={setCommunicationRating} size={22} gap="gap-1" />
            </div>
          </div>
          
          <div className="pt-2">
            <label className="block text-sm font-bold text-slate-700 mb-3">Instructor Review (Optional)</label>
            <textarea 
              rows="3" 
              value={instructorReview} 
              onChange={e => setInstructorReview(e.target.value)} 
              className="w-full border-slate-200 bg-white rounded-xl shadow-sm focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all p-4 resize-none" 
              placeholder="Any comments specifically for the instructor?"
            ></textarea>
          </div>
        </div>
      )}

      <button 
        type="submit"
        disabled={submitting} 
        className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-lg flex justify-center items-center gap-2 mt-4"
      >
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
};

export const GlobalFeedbackButton = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const role = sessionStorage.getItem('role');

  useEffect(() => {
    if (role && !role.toLowerCase().includes('admin')) {
      api.get('/api/feedback/platform')
        .then(res => {
          if (res.data && res.data.length > 0) {
            setHasSubmitted(true);
          }
        })
        .catch(console.error);
    }
  }, [location.pathname, role]);
  
  if (!role || role.toLowerCase().includes('admin') || hasSubmitted) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-slate-900 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform z-40 group flex items-center justify-center"
      >
        <Star size={24} />
      </button>
      <PlatformFeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} role={role} onSuccess={() => setHasSubmitted(true)} />
    </>
  );
};
