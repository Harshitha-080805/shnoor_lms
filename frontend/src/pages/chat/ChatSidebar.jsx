import { useState, useRef, useEffect } from "react";
import { Users, Search, SlidersHorizontal, BookOpen, Plus, MessageCircle, Archive, Lock, KeyRound } from "lucide-react";

const formatTime = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  const isToday = now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

function ChatSidebar({ conversations, activeConvId, initialSearch, onSelectConv, onNewDirect, onNewGroup, onOpenPinModal }) {
  const [search, setSearch] = useState(initialSearch || "");
  const [filter, setFilter] = useState("ALL"); // ALL, ARCHIVED, LOCKED
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const filteredConvs = conversations.filter(c => {
    if (filter === "ARCHIVED" && !c.is_archived) return false;
    if (filter === "LOCKED" && !c.is_locked) return false;
    if (filter === "ALL" && (c.is_archived || c.is_locked)) return false; // Hide archived/locked from main view

    return (c.name || "Direct Message").toLowerCase().includes(search.toLowerCase());
  });

  const renderIcon = (type, name) => {
    if (type === "ORGANIZATION") {
      const initial = name ? name.charAt(0).toUpperCase() : "O";
      return (
        <div className="w-8 h-8 rounded-full bg-brand-600 text-base-white flex items-center justify-center font-bold text-sm shrink-0">
          {initial}
        </div>
      );
    }
    if (type === "COURSE") {
      return (
        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <BookOpen size={16} />
        </div>
      );
    }
    if (type === "ANNOUNCEMENT") {
      return (
        <div className="w-8 h-8 rounded-full bg-danger-50 text-danger-600 flex items-center justify-center shrink-0">
          <MessageCircle size={16} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-surface-100 text-surface-500 flex items-center justify-center shrink-0">
        <Users size={16} />
      </div>
    );
  };

  const renderList = (type, title) => {
    const list = filteredConvs.filter(c => c.type === type);
    if (list.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-2 px-4 flex items-center gap-2">
          {title}
        </h3>
        <div className="space-y-1 px-2">
          {list.map(conv => {
            const isActive = activeConvId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConv(conv)}
                className={`w-full flex items-center justify-between px-2 py-2 rounded-xl transition-all group ${
                  isActive ? "bg-brand-50" : "hover:bg-surface-50"
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {renderIcon(conv.type, conv.name)}
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className={`text-sm font-semibold truncate flex items-center gap-1 ${isActive ? 'text-surface-900' : 'text-surface-700'}`}>
                      {conv.is_locked && <Lock size={12} className="text-surface-400" />}
                      {conv.is_archived && <Archive size={12} className="text-surface-400" />}
                      {conv.name || "Direct Message"}
                    </span>
                    {conv.type === "ORGANIZATION" && (
                      <span className="text-[11px] text-surface-400 truncate">Organization</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <span className={`text-[10px] font-medium ${isActive ? 'text-brand-600' : 'text-surface-400'}`}>
                    {formatTime(conv.last_message_at || conv.created_at)}
                  </span>
                  <div className="flex items-center gap-1">
                    {parseInt(conv.unread_count || 0, 10) > 0 && (
                      <span className="bg-danger-500 text-base-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {parseInt(conv.unread_count, 10) > 99 ? '99+' : parseInt(conv.unread_count, 10)}
                      </span>
                    )}
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-600"></div>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-[300px] bg-base-white h-full flex flex-col border-r border-surface-100 relative">
      
      {/* Search Header */}
      <div className="p-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-50 border border-surface-100 rounded-xl pl-9 pr-3 py-2 text-sm text-surface-700 placeholder-slate-400 focus:outline-none focus:border-brand-200 focus:bg-base-white transition-all"
          />
        </div>
        
        <div className="relative" ref={settingsRef}>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 border rounded-xl transition-colors shrink-0 ${showSettings || filter !== 'ALL' ? 'bg-brand-50 border-brand-200 text-brand-600' : 'border-surface-100 text-surface-400 hover:bg-surface-50 hover:text-surface-600'}`}
          >
            <SlidersHorizontal size={16} />
          </button>
          
          {showSettings && (
            <div className="absolute top-10 right-0 w-48 bg-base-white border border-surface-100 shadow-xl rounded-xl py-2 z-50">
              <button onClick={() => { setFilter('ALL'); setShowSettings(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${filter === 'ALL' ? 'text-brand-600 bg-brand-50 font-medium' : 'text-surface-700 hover:bg-surface-50'}`}>
                <MessageCircle size={14} /> All Chats
              </button>
              <button onClick={() => { setFilter('ARCHIVED'); setShowSettings(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${filter === 'ARCHIVED' ? 'text-brand-600 bg-brand-50 font-medium' : 'text-surface-700 hover:bg-surface-50'}`}>
                <Archive size={14} /> Archived
              </button>
              <button onClick={() => { setFilter('LOCKED'); setShowSettings(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${filter === 'LOCKED' ? 'text-brand-600 bg-brand-50 font-medium' : 'text-surface-700 hover:bg-surface-50'}`}>
                <Lock size={14} /> Locked
              </button>
              
              <div className="h-px bg-surface-100 my-1"></div>
              
              <button onClick={() => { onOpenPinModal(); setShowSettings(false); }} className="w-full text-left px-4 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2">
                <KeyRound size={14} /> Change PIN
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-surface-400 p-6">
            <MessageCircle size={32} className="opacity-20 mb-3 text-surface-300" />
            <p className="text-sm font-medium">No conversations yet.</p>
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="text-center text-surface-400 p-6 text-sm">No chats found for this filter.</div>
        ) : (
          <div className="pb-4">
            {renderList("ANNOUNCEMENT", "System Announcements")}
            {renderList("ORGANIZATION", "Organizations")}
            {renderList("COURSE", "Courses")}
            {renderList("GROUP", "Custom Groups")}
            {renderList("DIRECT", "Direct Messages")}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-surface-100">
        <button 
          onClick={onNewGroup}
          className="w-full flex items-center justify-center gap-2 bg-base-white border border-brand-200 text-brand-600 hover:bg-brand-50 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          <Plus size={18} /> New Group
        </button>
      </div>
    </div>
  );
}

export default ChatSidebar;
