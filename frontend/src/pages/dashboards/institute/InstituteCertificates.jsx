import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../../../api";

function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-16 min-h-[300px]">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 text-slate-400 border border-slate-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto">{description}</p>
    </div>
  );
}

function InstituteCertificates() {
  const location = useLocation();
  const searchTerm = location.state?.searchTerm || '';
  const [pendingCerts, setPendingCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("Newest");

  const loadPendingCerts = () => {
    setLoading(true);
    api.get('/api/admin/pending-certificates')
      .then(res => {
        if (res.status >= 200 && res.status < 300) setPendingCerts(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPendingCerts();
  }, []);

  const sortedCerts = React.useMemo(() => {
    let dataCopy = pendingCerts.filter(cert => !searchTerm || cert.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) || cert.student_name?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === "Student A-Z") return dataCopy.sort((a,b) => (a.student_name||'').localeCompare(b.student_name||''));
    if (sortOption === "Student Z-A") return dataCopy.sort((a,b) => (b.student_name||'').localeCompare(a.student_name||''));

    return dataCopy;
  }, [pendingCerts, searchTerm, sortOption]);

  const handleReview = (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this certificate request?`)) return;
    
    api.post(`/api/admin/certificates/${id}/review`, { action })
      .then(res => {
        if (res.status >= 200 && res.status < 300) {
          alert(`Certificate ${action}d successfully`);
          loadPendingCerts();
        }
      })
      .catch(err => {
        console.error(err);
        alert("Failed to review certificate");
      });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pending Certificates</h1>
        <p className="text-sm text-slate-500 mt-1">Review and approve certificate requests from your learners.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-4 py-2 w-full sm:w-auto shadow-sm"
        >
          <option value="Newest">Sort by: Newest</option>
          <option value="Oldest">Sort by: Oldest</option>
          <option value="Student A-Z">Learner A-Z</option>
          <option value="Student Z-A">Learner Z-A</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : pendingCerts.length === 0 ? (
          <EmptyState 
            title="No Pending Requests" 
            description="There are currently no certificate approval requests from your learners."
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        ) : sortedCerts.length === 0 ? (
          <EmptyState 
            title="No Matching Requests" 
            description="No certificate approval requests match your search criteria."
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Learner Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Requested</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCerts.map(cert => (
                  <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{cert.student_name}</div>
                      <div className="text-xs text-slate-500">{cert.student_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{cert.course_title}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {new Date(cert.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleReview(cert.id, 'approve')}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold rounded-lg text-xs transition"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReview(cert.id, 'reject')}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-lg text-xs transition"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstituteCertificates;
