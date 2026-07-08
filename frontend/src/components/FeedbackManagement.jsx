import React, { useState, useEffect } from 'react';
import api from '../api';
import { Star, MessageSquare, Lightbulb, User, Building2, Mail } from 'lucide-react';

export default function AdminFeedbackManagement() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    try {
      const res = await api.get('/api/feedback/platform');
      setFeedback(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  if (loading) return (
    <div className="p-8 text-center text-slate-500 text-sm font-medium">Loading feedback...</div>
  );

  const avgRating = feedback.length > 0 
    ? (feedback.reduce((sum, f) => sum + Number(f.rating || 0), 0) / feedback.filter(f => f.rating > 0).length || 0).toFixed(1)
    : "0.0";

  const suggestions = feedback.filter(f => f.category === 'Suggestion').length;
  const requests = feedback.filter(f => f.category === 'Feature Request').length;

  return (
    <div className="space-y-6 max-w-[1500px]">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-950 rounded-2xl p-5 border border-blue-900 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Total Feedback</p>
            <h3 className="text-3xl font-extrabold text-white">{feedback.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20 flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
        </div>

        <div className="bg-blue-950 rounded-2xl p-5 border border-blue-900 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Avg Rating</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-3xl font-extrabold text-white">{avgRating}</h3>
              <span className="text-sm text-blue-300 font-medium">/ 5.0</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <Star size={20} className="fill-white" />
          </div>
        </div>

        <div className="bg-blue-950 rounded-2xl p-5 border border-blue-900 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Suggestions</p>
            <h3 className="text-3xl font-extrabold text-white">{suggestions}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/20 flex items-center justify-center">
            <Lightbulb size={20} />
          </div>
        </div>

        <div className="bg-blue-950 rounded-2xl p-5 border border-blue-900 flex items-start justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">Requests</p>
            <h3 className="text-3xl font-extrabold text-white">{requests}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20 flex items-center justify-center">
            <Lightbulb size={20} />
          </div>
        </div>
      </div>

      {/* Extended Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="px-6 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="px-6 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Email</th>
                <th className="px-6 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Organization</th>
                <th className="px-6 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Category</th>
                <th className="px-6 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Rating</th>
                <th className="px-6 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider w-full">Feedback</th>
                <th className="px-6 py-3 font-bold text-slate-600 text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feedback.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-medium">
                    No feedback available.
                  </td>
                </tr>
              ) : (
                feedback.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                    
                    {/* User */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <User size={13} />
                        </div>
                        <span className="font-bold text-[13px] text-slate-900">{f.user_name || 'Anonymous'}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        {f.user_role}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                      {f.user_email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <a href={`mailto:${f.user_email}`} className="text-[13px] text-blue-600 hover:underline">
                            {f.user_email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>

                    {/* Organization */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                      {f.org_name ? (
                        <div className="flex items-center gap-1.5 text-[13px] text-slate-700">
                          <Building2 size={12} className="text-slate-400 shrink-0" />
                          {f.org_name}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        f.category === 'Suggestion' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        f.category === 'Feature Request' ? 'bg-teal-50 text-teal-600 border-teal-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {f.category}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded text-amber-600 font-bold text-xs w-fit">
                        <Star size={12} className="fill-amber-500 text-amber-500" />
                        {f.rating > 0 ? f.rating : '-'}
                      </div>
                    </td>
                    
                    {/* Feedback Content */}
                    <td className="px-6 py-4 align-middle min-w-[250px]">
                      <p className="font-bold text-[13px] text-slate-900 mb-1">{f.subject}</p>
                      <p className="text-[12px] text-slate-600 leading-relaxed">{f.description}</p>
                    </td>
                    
                    {/* Date */}
                    <td className="px-6 py-4 align-middle text-right whitespace-nowrap text-slate-500 text-[12px] font-medium">
                      {new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
