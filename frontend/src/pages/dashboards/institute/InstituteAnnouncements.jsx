import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plus, X, Megaphone, Calendar, Clock, Edit2, Trash2, User } from "lucide-react";
import api from "../../../api";

function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-16 min-h-[300px] bg-white rounded-2xl border border-slate-200">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 text-slate-400 border border-slate-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto">{description}</p>
    </div>
  );
}

function InstituteAnnouncements() {
  const location = useLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(location.state?.searchTerm || "");
  const [sortOption, setSortOption] = useState("Newest");
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'drafts', 'archived'
  const [editingId, setEditingId] = useState(null);

  const role = sessionStorage.getItem("role") || "";
  const isSuperAdmin = role.toUpperCase() === "ADMIN";
  const isInstructor = role.toUpperCase() === "INSTRUCTOR";
  const isLearner = role.toUpperCase() === "LEARNER";
  const isOrgAdmin = role.toUpperCase() === "ORGANIZATION_ADMIN" || role.toUpperCase() === "MANAGER";
  const canEdit = !isLearner;

  let currentUserId = null;
  try {
    const token = sessionStorage.getItem("access");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.userId;
    }
  } catch (e) {}

  const canEditAnnouncement = (announcement) => {
    if (!canEdit) return false;
    if (announcement.author_id) {
      return announcement.author_id === currentUserId;
    }
    // Fallback for older announcements
    if (isSuperAdmin && announcement.author_role === 'SUPER_ADMIN') return true;
    if (isOrgAdmin && announcement.author_role === 'ORGANIZATION_ADMIN') return true;
    if (isInstructor && announcement.author_role === 'INSTRUCTOR') return true;
    if (isOrgAdmin && !announcement.author_role) return true;
    return false;
  };

  let apiPath = "/api/org-admin/announcements";
  if (isSuperAdmin) apiPath = "/api/admin/announcements";
  else if (isInstructor) apiPath = "/api/instructor/announcements";
  else if (isLearner) apiPath = "/api/learner/announcements";

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get(apiPath);
      if (res.status >= 200 && res.status < 300) {
        setAnnouncements(res.data);
      }
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`${apiPath}/${editingId}`, {
          title: newTitle,
          content: newContent
        });
      } else {
        await api.post(apiPath, {
          title: newTitle,
          content: newContent
        });
      }
      setNewTitle("");
      setNewContent("");
      setEditingId(null);
      setShowModal(false);
      fetchAnnouncements();
    } catch (err) {
      console.error("Failed to save announcement:", err);
      alert("An error occurred while saving the announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (announcement) => {
    setEditingId(announcement.id);
    setNewTitle(announcement.title);
    setNewContent(announcement.content);
    setShowModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.delete(`${apiPath}/${id}`);
      fetchAnnouncements();
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      alert("Failed to delete announcement.");
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNewTitle("");
    setNewContent("");
    setShowModal(true);
  };

  const getCategoryTheme = (title) => {
    const t = title.toLowerCase();
    if (t.includes('maintenance') || t.includes('system') || t.includes('urgent')) {
      return { label: 'SYSTEM', bg: 'bg-red-50', text: 'text-red-600' };
    }
    if (t.includes('feature') || t.includes('new') || t.includes('update')) {
      return { label: 'FEATURE', bg: 'bg-emerald-50', text: 'text-emerald-600' };
    }
    return { label: 'GENERAL', bg: 'bg-blue-50', text: 'text-blue-600' };
  };

  const sortedAnnouncements = React.useMemo(() => {
    let dataCopy = announcements.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase()));

    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === "Title A-Z") return dataCopy.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    if (sortOption === "Title Z-A") return dataCopy.sort((a,b) => (b.title||'').localeCompare(a.title||''));

    return dataCopy;
  }, [announcements, search, sortOption]);

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl mx-auto pb-10">
      
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Megaphone size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Announcements</h2>
            <p className="text-sm text-slate-500">Broadcast important messages to instructors and learners instantly</p>
          </div>
        </div>
        {canEdit && (
          <button 
            onClick={openCreateModal}
            className="bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-black shadow-[0_4px_15px_-4px_rgba(234,179,8,0.4)] px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Create Announcement
          </button>
        )}
      </div>





      {/* Tabs */}
      <div className="flex items-center justify-between py-2 gap-4">
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          All Broadcasts
        </button>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-4 py-2 shadow-sm"
        >
          <option value="Newest">Sort by: Newest</option>
          <option value="Oldest">Sort by: Oldest</option>
          <option value="Title A-Z">Title A-Z</option>
          <option value="Title Z-A">Title Z-A</option>
        </select>
      </div>

      {/* Announcements List */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
          </div>
        ) : sortedAnnouncements.length === 0 ? (
          <EmptyState 
            title="No Announcements" 
            description="You have not published any organization-wide announcements yet or no announcements match your search. Click 'Create Announcement' to get started." 
            icon={<Megaphone className="w-8 h-8" />} 
          />
        ) : (
          <div className="space-y-4">
            {sortedAnnouncements
              .map((announcement) => {
              const theme = getCategoryTheme(announcement.title);
              
              return (
                <div key={announcement.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                  
                  {/* Left Section: Metadata */}
                  <div className="w-full md:w-48 shrink-0 flex flex-col gap-3 md:border-r border-slate-100 md:pr-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <User className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-full ${theme.bg} ${theme.text}`}>
                          {theme.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {new Date(announcement.created_at).toLocaleDateString(undefined, { 
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-600">
                        By <span className="font-bold text-slate-800">
                          {announcement.author_role === 'SUPER_ADMIN' ? 'Super Admin' : 
                           announcement.author_role === 'INSTRUCTOR' ? 'Instructor' : 
                           'Admin'}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Right Section: Content */}
                  <div className="flex-1 flex flex-col">
                    <h4 className="text-lg font-black text-slate-900 mb-3">{announcement.title}</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mb-6">{announcement.content}</p>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {canEditAnnouncement(announcement) && (
                        <>
                          <button 
                            onClick={() => handleEditClick(announcement)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(announcement.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Megaphone size={20} className="text-blue-600" /> {editingId ? "Edit Announcement" : "Create Announcement"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Announcement Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  placeholder="e.g. System Maintenance This Weekend"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Message Content</label>
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                  placeholder="Type your message here..."
                  required
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-md disabled:opacity-50"
                >
                  {submitting ? (editingId ? "Saving..." : "Publishing...") : (editingId ? "Save Changes" : "Publish Announcement")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstituteAnnouncements;
