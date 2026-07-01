import React, { useState, useEffect } from "react";
import api from "../../../api";

export default function InstituteGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]); // All approved users in org

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [createGroupMembers, setCreateGroupMembers] = useState([]);
  const [searchCreateUsers, setSearchCreateUsers] = useState("");
  const [departmentFilterCreate, setDepartmentFilterCreate] = useState("ALL");

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [searchManageUsers, setSearchManageUsers] = useState("");
  const [departmentFilterManage, setDepartmentFilterManage] = useState("ALL");

  const departments = [...new Set(users.map(u => u.department).filter(Boolean))];

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/api/groups');
      setGroups(res.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const [instructorsRes, learnersRes] = await Promise.all([
        api.get('/api/org-admin/instructors'),
        api.get('/api/org-admin/learners')
      ]);
      const instructors = (instructorsRes.data || []).map(u => ({ ...u, role: 'INSTRUCTOR' }));
      const learners = (learnersRes.data || []).map(u => ({ ...u, role: 'LEARNER' }));
      const combined = [...instructors, ...learners];
      setUsers(combined);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/groups', { name: newGroupName, description: "" });
      const newGroup = res.data;
      if (createGroupMembers.length > 0) {
        await api.put(`/api/groups/${newGroup.id}/members`, { userIds: createGroupMembers });
      }
      setNewGroupName("");
      setCreateGroupMembers([]);
      setSearchCreateUsers("");
      setDepartmentFilterCreate("ALL");
      setShowCreateModal(false);
      fetchGroups();
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group");
    }
  };

  const handleDeleteGroup = async (id) => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      await api.delete(`/api/groups/${id}`);
      fetchGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const openMembersModal = async (group) => {
    setSelectedGroup(group);
    try {
      const res = await api.get(`/api/groups/${group.id}/members`);
      setGroupMembers(res.data.map(m => m.id));
      setSearchManageUsers("");
      setDepartmentFilterManage("ALL");
      setShowMembersModal(true);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const toggleMember = (userId) => {
    if (groupMembers.includes(userId)) {
      setGroupMembers(groupMembers.filter(id => id !== userId));
    } else {
      setGroupMembers([...groupMembers, userId]);
    }
  };

  const handleSaveMembers = async () => {
    try {
      await api.put(`/api/groups/${selectedGroup.id}/members`, { userIds: groupMembers });
      setShowMembersModal(false);
      alert("Members updated successfully");
    } catch (error) {
      console.error("Error saving members:", error);
      alert("Failed to save members");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Groups & Batches</h1>
          <p className="text-slate-500 text-sm mt-1">Manage student batches and assign instructors</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-yellow-500 text-blue-950 hover:bg-blue-900 hover:text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Create Group
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Groups Found</h3>
          <p className="text-slate-500 mb-6">You haven't created any groups yet.</p>
          <button onClick={() => setShowCreateModal(true)} className="text-indigo-600 font-medium hover:text-indigo-700">
            + Create your first group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 line-clamp-1">{group.name}</h3>
                </div>
              </div>
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                <button 
                  onClick={() => openMembersModal(group)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Manage Members
                </button>
                <button 
                  onClick={() => handleDeleteGroup(group.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Create New Group</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                <div className="bg-white p-5 rounded-xl border border-slate-200 mb-6 space-y-4 shadow-sm">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Group Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 bg-slate-50 transition-all text-sm font-medium"
                      placeholder="e.g. Batch 2024 - Section A"
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[300px]">
                  <h4 className="font-bold text-slate-800 mb-3">Assign Members</h4>
                  <div className="mb-4 flex flex-col sm:flex-row gap-3">
                     <div className="relative flex-1">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                       </div>
                       <input 
                         type="text" 
                         placeholder="Search students or instructors..." 
                         value={searchCreateUsers}
                         onChange={(e) => setSearchCreateUsers(e.target.value)}
                         className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-sm bg-slate-50 transition-all" 
                       />
                     </div>
                     <select 
                       value={departmentFilterCreate} 
                       onChange={(e) => setDepartmentFilterCreate(e.target.value)}
                       className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 text-sm bg-slate-50 sm:w-48"
                     >
                       <option value="ALL">All Departments</option>
                       {departments.map((dept, i) => (
                         <option key={i} value={dept}>{dept}</option>
                       ))}
                     </select>
                  </div>
                
                {(() => {
                  const filteredUsers = users.filter(u => {
                    const matchesSearch = u.full_name.toLowerCase().includes(searchCreateUsers.toLowerCase()) || u.email.toLowerCase().includes(searchCreateUsers.toLowerCase());
                    const matchesDept = departmentFilterCreate === "ALL" || u.department === departmentFilterCreate;
                    return matchesSearch && matchesDept;
                  });
                  const allFilteredIds = filteredUsers.map(u => u.id);
                  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => createGroupMembers.includes(id));
                  
                  return (
                    <>
                      {filteredUsers.length > 0 && (
                        <div className="mb-3 px-1 flex items-center">
                          <label className="flex items-center cursor-pointer text-sm font-bold text-slate-700">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 mr-2 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              checked={allSelected}
                              onChange={() => {
                                if (allSelected) {
                                  setCreateGroupMembers(createGroupMembers.filter(id => !allFilteredIds.includes(id)));
                                } else {
                                  const newSelections = new Set([...createGroupMembers, ...allFilteredIds]);
                                  setCreateGroupMembers(Array.from(newSelections));
                                }
                              }}
                            />
                            Select All {filteredUsers.length} Users
                          </label>
                        </div>
                      )}
                      <div className="space-y-2">
                        {filteredUsers.map(user => (
                    <label key={user.id} className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        checked={createGroupMembers.includes(user.id)}
                        onChange={() => {
                          if (createGroupMembers.includes(user.id)) {
                            setCreateGroupMembers(createGroupMembers.filter(id => id !== user.id));
                          } else {
                            setCreateGroupMembers([...createGroupMembers, user.id]);
                          }
                        }}
                      />
                      <div className="ml-3 flex-1 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'INSTRUCTOR' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.role}
                        </span>
                      </div>
                    </label>
                        ))}
                        {filteredUsers.length === 0 && (
                          <div className="text-center py-6 text-slate-400 text-sm">No users found matching your filters.</div>
                        )}
                      </div>
                    </>
                  );
                })()}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-sm text-slate-500 font-medium">{createGroupMembers.length} members selected</span>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 font-bold text-blue-950 bg-yellow-500 hover:bg-blue-900 hover:text-white rounded-xl transition-all shadow-sm"
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembersModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Manage Members: {selectedGroup.name}</h3>
              <button onClick={() => setShowMembersModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 flex flex-col sm:flex-row gap-3">
                 <input 
                   type="text" 
                   placeholder="Search users..." 
                   value={searchManageUsers}
                   onChange={(e) => setSearchManageUsers(e.target.value)}
                   className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm" 
                 />
                 <select 
                   value={departmentFilterManage} 
                   onChange={(e) => setDepartmentFilterManage(e.target.value)}
                   className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm sm:w-48"
                 >
                   <option value="ALL">All Departments</option>
                   {departments.map((dept, i) => (
                     <option key={i} value={dept}>{dept}</option>
                   ))}
                 </select>
              </div>
              
              {(() => {
                const filteredUsers = users.filter(u => {
                  const matchesSearch = u.full_name.toLowerCase().includes(searchManageUsers.toLowerCase()) || u.email.toLowerCase().includes(searchManageUsers.toLowerCase());
                  const matchesDept = departmentFilterManage === "ALL" || u.department === departmentFilterManage;
                  return matchesSearch && matchesDept;
                });
                const allFilteredIds = filteredUsers.map(u => u.id);
                const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => groupMembers.includes(id));
                
                return (
                  <>
                    {filteredUsers.length > 0 && (
                      <div className="mb-3 px-1 flex items-center">
                        <label className="flex items-center cursor-pointer text-sm font-bold text-slate-700">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 mr-2 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            checked={allSelected}
                            onChange={() => {
                              if (allSelected) {
                                setGroupMembers(groupMembers.filter(id => !allFilteredIds.includes(id)));
                              } else {
                                const newSelections = new Set([...groupMembers, ...allFilteredIds]);
                                setGroupMembers(Array.from(newSelections));
                              }
                            }}
                          />
                          Select All {filteredUsers.length} Users
                        </label>
                      </div>
                    )}
                    <div className="space-y-2">
                      {filteredUsers.map(user => (
                  <label key={user.id} className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      checked={groupMembers.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                    />
                    <div className="ml-3 flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.role === 'INSTRUCTOR' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {user.role}
                      </span>
                    </div>
                  </label>
                      ))}
                      {filteredUsers.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-sm">No users found matching your filters.</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-sm text-slate-500 font-medium">{groupMembers.length} members selected</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowMembersModal(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveMembers}
                  className="px-4 py-2 font-bold text-blue-950 bg-yellow-500 hover:bg-blue-900 hover:text-white rounded-xl transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
