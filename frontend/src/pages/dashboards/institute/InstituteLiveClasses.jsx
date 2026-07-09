import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Plus, Edit, Trash2, Link as LinkIcon, ExternalLink, Users, Save, X, BookOpen, AlertCircle, PlayCircle } from 'lucide-react';
import api from '../../../api';

const InstituteLiveClasses = () => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    course_id: '',
    title: '',
    description: '',
    meeting_provider: 'Google Meet',
    meeting_link: '',
    start_datetime: '',
    end_datetime: '',
    recording_link: '',
    status: 'Upcoming'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, coursesRes] = await Promise.all([
        api.get('/api/live-classes'),
        api.get('/api/org-admin/instructors/courses')
      ]);
      setLiveClasses(classesRes.data);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load live classes data.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cls = null) => {
    if (cls) {
      setIsEditing(true);
      setFormData({
        id: cls.id,
        course_id: cls.course_id,
        title: cls.title,
        description: cls.description || '',
        meeting_provider: cls.meeting_provider,
        meeting_link: cls.meeting_link,
        start_datetime: new Date(cls.start_datetime).toISOString().slice(0, 16),
        end_datetime: new Date(cls.end_datetime).toISOString().slice(0, 16),
        recording_link: cls.recording_link || '',
        status: cls.status
      });
    } else {
      setIsEditing(false);
      setFormData({
        id: null,
        course_id: courses.length > 0 ? courses[0].id : '',
        title: '',
        description: '',
        meeting_provider: 'Google Meet',
        meeting_link: '',
        start_datetime: '',
        end_datetime: '',
        recording_link: '',
        status: 'Upcoming'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString()
      };
      if (isEditing) {
        await api.put(`/api/live-classes/${formData.id}`, payload);
      } else {
        await api.post('/api/live-classes', payload);
      }
      await fetchData();
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this live class?")) {
      try {
        await api.delete(`/api/live-classes/${id}`);
        await fetchData();
      } catch (err) {
        alert("Failed to delete live class");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Live': return 'bg-red-500 text-white animate-pulse';
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelled': return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-blue-950 p-6 rounded-2xl shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500 opacity-10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl shadow-inner border border-white/20">
              <Video className="text-yellow-400 w-5 h-5" />
            </div>
            Organization Live Classes
          </h1>
          <p className="text-blue-100 font-medium text-sm max-w-xl">
            Oversee and manage live sessions for all courses in your institute.
          </p>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="relative z-10 bg-white text-blue-950 hover:bg-yellow-50 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm hover:shadow flex items-center gap-2 group border border-slate-100"
        >
          <div className="bg-yellow-100 p-1 rounded-md group-hover:scale-110 transition-transform">
            <Plus size={16} className="text-blue-950" />
          </div>
          Schedule Class
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-emerald-600"></div>
        </div>
      ) : liveClasses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">No Live Classes Yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">No live classes have been scheduled in your organization. Schedule one now.</p>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-950 hover:bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm hover:shadow flex items-center gap-2 mx-auto"
          >
            <Plus size={18} /> Schedule First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveClasses.map((cls) => {
            const startDate = new Date(cls.start_datetime);
            const endDate = new Date(cls.end_datetime);
            const isLive = startDate <= new Date() && endDate >= new Date() && cls.status === 'Upcoming';
            const isPast = new Date() > endDate;
            const displayStatus = isLive ? 'Live' : (isPast && cls.status === 'Upcoming' ? 'Completed' : cls.status);

            return (
              <div key={cls.id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
                <div className="h-2 bg-yellow-500 w-full"></div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(displayStatus)}`}>
                      {displayStatus === 'Live' ? <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white animate-ping"></span> Live Now</span> : displayStatus}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(cls)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(cls.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{cls.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 font-medium">
                    <BookOpen size={14} className="text-teal-400" />
                    <span className="truncate">{cls.course_title}</span>
                  </div>
                  {cls.instructor_name && (
                    <div className="text-sm text-slate-500 mb-4 font-medium">
                      Instructor: {cls.instructor_name}
                    </div>
                  )}

                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex-1">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Calendar size={16} className="text-emerald-500" />
                      </div>
                      <span className="font-semibold">{startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Clock size={16} className="text-amber-500" />
                      </div>
                      <span className="font-semibold">
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Video size={16} className="text-purple-500" />
                      </div>
                      <span className="font-semibold">{cls.meeting_provider}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    {displayStatus !== 'Completed' && displayStatus !== 'Cancelled' && (
                      <a
                        href={cls.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-blue-950 hover:bg-blue-900 text-white py-2.5 rounded-xl font-bold text-sm text-center transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        {!cls.instructor_id ? 'Start Meeting' : 'Join Meeting'} <ExternalLink size={16} />
                      </a>
                    )}
                    {cls.recording_link && (
                       <a
                       href={cls.recording_link}
                       target="_blank"
                       rel="noreferrer"
                       className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-700 py-2.5 rounded-xl font-bold text-sm text-center transition-colors border border-teal-200 flex items-center justify-center gap-2"
                     >
                       <PlayCircle size={16} /> Recording
                     </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {isEditing ? <Edit className="text-emerald-500" /> : <Plus className="text-emerald-500" />}
                {isEditing ? 'Edit Live Class' : 'Schedule Live Class'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3">
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
              <form id="live-class-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Course *</label>
                    <select
                      required
                      value={formData.course_id}
                      onChange={e => setFormData({...formData, course_id: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent p-3 outline-none transition font-medium"
                    >
                      <option value="">Select a Course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Class Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Week 1: Introduction"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent p-3 outline-none transition font-medium"
                    />
                  </div>



                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Start Date & Time *</label>
                    <input
                      required
                      type="datetime-local"
                      value={formData.start_datetime}
                      onChange={e => setFormData({...formData, start_datetime: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent p-3 outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">End Date & Time *</label>
                    <input
                      required
                      type="datetime-local"
                      value={formData.end_datetime}
                      onChange={e => setFormData({...formData, end_datetime: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent p-3 outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Meeting Provider *</label>
                    <select
                      required
                      value={formData.meeting_provider}
                      onChange={e => setFormData({...formData, meeting_provider: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent p-3 outline-none transition font-medium"
                    >
                      <option value="Google Meet">Google Meet</option>
                      <option value="Zoom">Zoom</option>
                      <option value="Microsoft Teams">Microsoft Teams</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Meeting Link *</label>
                    <input
                      required
                      type="url"
                      placeholder="https://..."
                      value={formData.meeting_link}
                      onChange={e => setFormData({...formData, meeting_link: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent p-3 outline-none transition font-medium"
                    />
                  </div>

                  {isEditing && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                        <select
                          value={formData.status}
                          onChange={e => setFormData({...formData, status: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent p-3 outline-none transition font-medium"
                        >
                          <option value="Upcoming">Upcoming</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Recording Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="Link to video recording..."
                          value={formData.recording_link}
                          onChange={e => setFormData({...formData, recording_link: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent p-3 outline-none transition font-medium"
                        />
                      </div>
                    </>
                  )}
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="live-class-form"
                disabled={submitting}
                className="bg-blue-950 hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center gap-2"
              >
                {submitting ? 'Saving...' : <><Save size={18} /> Save Class</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstituteLiveClasses;
