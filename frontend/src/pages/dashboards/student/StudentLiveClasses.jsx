import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Link as LinkIcon, ExternalLink, PlayCircle, BookOpen } from 'lucide-react';
import api from '../../../api';

const StudentLiveClasses = () => {
  const [liveClasses, setLiveClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/live-classes');
      setLiveClasses(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load live classes data.");
    } finally {
      setLoading(false);
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
            My Live Classes
          </h1>
          <p className="text-blue-100 font-medium text-sm max-w-xl">
            Join your scheduled virtual sessions and access class recordings.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      ) : liveClasses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-blue-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">No Upcoming Classes</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">You don't have any scheduled live sessions for your enrolled courses right now.</p>
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
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{cls.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 font-medium">
                    <BookOpen size={14} className="text-indigo-400" />
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
                        <Calendar size={16} className="text-purple-500" />
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
                        <Video size={16} className="text-indigo-500" />
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
                        Join Session <ExternalLink size={16} />
                      </a>
                    )}
                    {cls.recording_link && (
                       <a
                       href={cls.recording_link}
                       target="_blank"
                       rel="noreferrer"
                       className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 rounded-xl font-bold text-sm text-center transition-colors border border-indigo-200 flex items-center justify-center gap-2"
                     >
                       <PlayCircle size={16} /> Watch Recording
                     </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentLiveClasses;
