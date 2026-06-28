import React, { useState, useEffect } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
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

function UserTable({ type, users, status, onApprove, onReject }) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <EmptyState 
          title={`No ${status} ${type}s Found`} 
          description={status === 'Pending' ? `There are no pending approval requests for ${type.toLowerCase()}s at the moment.` : `There are currently no active ${type.toLowerCase()}s in your organization.`}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          } 
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{type} Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Joined</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              {status === 'Pending' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-800">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 text-slate-600 text-sm">{user.email}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {status}
                  </span>
                </td>
                {status === 'Pending' && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onApprove(user.id)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                        Approve
                      </button>
                      <button onClick={() => onReject(user.id)} className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                        Reject
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InstituteLearners() {
  const { orgType } = useOutletContext();
  const location = useLocation();
  const learnerText = orgType === 'company' ? 'Employee' : 'Learner';
  const [activeTab, setActiveTab] = useState('active');
  const [search, setSearch] = useState(location.state?.searchTerm || '');
  const [activeUsers, setActiveUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("Newest");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activeRes, pendingRes] = await Promise.all([
        api.get('/api/org-admin/learners'),
        api.get('/api/org-admin/users/pending')
      ]);
      
      if (activeRes.status >= 200 && activeRes.status < 300) {
        setActiveUsers(activeRes.data);
      }
      
      if (pendingRes.status >= 200 && pendingRes.status < 300) {
        const learnersOnly = pendingRes.data.filter(u => u.role === 'LEARNER');
        setPendingUsers(learnersOnly);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    try {
      const res = await api.put(`/api/org-admin/users/${id}/approve`);
      if (res.status >= 200 && res.status < 300) {
        fetchData();
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert("Failed to approve user.");
      }
    }
  };

  const handleReject = async (id) => {
    if(!window.confirm("Are you sure you want to reject and remove this user?")) return;
    try {
      const res = await api.delete(`/api/org-admin/users/${id}/reject`);
      if (res.status >= 200 && res.status < 300) {
        fetchData();
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert("Failed to reject user.");
      }
    }
  };

  const currentUsers = activeTab === 'active' ? activeUsers : pendingUsers;

  const filteredUsers = React.useMemo(() => {
    let dataCopy = currentUsers.filter(u => 
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === "Title A-Z") return dataCopy.sort((a,b) => (a.full_name||'').localeCompare(b.full_name||''));
    if (sortOption === "Title Z-A") return dataCopy.sort((a,b) => (b.full_name||'').localeCompare(a.full_name||''));

    return dataCopy;
  }, [currentUsers, search, sortOption]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none ${activeTab === 'active' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Active {learnerText}s
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Pending Approvals
            {pendingUsers.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingUsers.length}</span>
            )}
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block px-4 py-2 w-full sm:w-auto"
          >
            <option value="Newest">Sort by: Newest</option>
            <option value="Oldest">Sort by: Oldest</option>
            <option value="Title A-Z">Name A-Z</option>
            <option value="Title Z-A">Name Z-A</option>
          </select>
          <div className="relative w-full sm:w-72">
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder={`Search ${learnerText.toLowerCase()}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
        </div>
      ) : (
        <UserTable 
          type={learnerText}
          users={filteredUsers} 
          status={activeTab === 'active' ? 'Active' : 'Pending'} 
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

export default InstituteLearners;
