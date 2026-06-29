import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Smile, MoreVertical, Edit2, Trash2, Reply, Copy, CornerUpRight, Forward, Check, X } from "lucide-react";

function MessageBubble({ message, repliedMessage, isOwnMessage, currentUserId, onAction }) {
  if (message.message_type === 'SYSTEM') {
    return (
      <div className="flex justify-center my-4">
        <span className="bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-full text-center shadow-sm">
          {message.message}
        </span>
      </div>
    );
  }

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const timeStr = format(new Date(message.created_at), "h:mm a");
  const initial = (message.sender_name || "U").charAt(0).toUpperCase();

  const isAdmin = message.sender_name === "Admin User";
  const avatarBg = isAdmin ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600";
  const nameColor = isAdmin ? "text-blue-600" : "text-slate-700";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.message || "");
    setShowMenu(false);
  };

  const handleAction = (action, data) => {
    setShowMenu(false);
    if (onAction) onAction(action, message, data);
  };

  const renderReactions = () => {
    if (!message.reactions) return null;
    let reacts = message.reactions;
    if (typeof reacts === 'string') {
      try { reacts = JSON.parse(reacts); } catch (e) { reacts = {}; }
    }
    const emojis = Object.values(reacts);
    if (emojis.length === 0) return null;

    const uniqueEmojis = [...new Set(emojis)];
    const myReaction = currentUserId ? reacts[currentUserId] : null;

    return (
      <div className="flex -mt-3 relative z-10">
        <div className="flex gap-1">
          {uniqueEmojis.map(emoji => {
            const count = emojis.filter(e => e === emoji).length;
            const isMine = myReaction === emoji;
            return (
              <button 
                key={emoji}
                onClick={() => handleAction('REACT', emoji)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 shadow-sm text-xs border transition-colors ${isMine ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                title={isMine ? "Remove reaction" : "Add reaction"}
              >
                <span>{emoji}</span>
                <span className={`font-medium text-[10px] ${isMine ? 'text-blue-600' : 'text-slate-400'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (message.is_deleted_for_everyone) {
      return <p className="italic text-slate-400 text-sm">🚫 This message was deleted</p>;
    }

    return (
      <>
        {message.is_forwarded && (
          <div className="flex items-center gap-1 mb-1 opacity-70 text-[11px] italic font-medium">
            <Forward size={12} />
            <span>Forwarded</span>
          </div>
        )}
        {repliedMessage && (
          <div className={`mb-2 p-2 rounded-lg text-sm border-l-4 border-blue-500 opacity-90 ${isOwnMessage ? 'bg-blue-800/30' : 'bg-slate-200/50'}`}>
            <p className={`text-xs font-bold mb-0.5 ${isOwnMessage ? 'text-blue-200' : 'text-blue-600'}`}>{repliedMessage.sender_name}</p>
            <p className={`truncate max-w-[200px] ${isOwnMessage ? 'text-slate-200' : 'text-slate-600'}`}>{repliedMessage.message || (repliedMessage.file_url ? `[${repliedMessage.message_type}]` : '...')}</p>
          </div>
        )}
        {message.message && <p className="whitespace-pre-wrap">{message.message}</p>}
        {message.is_edited && <span className="text-[10px] opacity-70 mt-1 block">(edited)</span>}
        
        {message.message_type === "IMAGE" && message.file_url && (
          <img 
            src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${message.file_url.replace(/\\/g, '/')}`} 
            alt="attachment" 
            className="mt-2 max-w-full rounded-lg border border-slate-200" 
          />
        )}
        
        {message.message_type === "AUDIO" && message.file_url && (
          <audio controls className="mt-2 h-10 w-[240px]">
            <source src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${message.file_url.replace(/\\/g, '/')}`} type="audio/webm" />
          </audio>
        )}

        {message.message_type === "FILE" && message.file_url && (
          <a 
            href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/${message.file_url.replace(/\\/g, '/')}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center gap-2 mt-2 p-3 rounded-xl border ${
              isOwnMessage ? "bg-blue-700 border-blue-500 hover:bg-blue-800" : "bg-white border-slate-200 hover:bg-slate-50"
            } transition-colors`}
          >
            <span className={`text-sm font-semibold truncate max-w-[200px] ${isOwnMessage ? 'text-white' : 'text-blue-600'}`}>
              {message.file_name || "Download Document"}
            </span>
          </a>
        )}
      </>
    );
  };

  const MenuDropdown = () => (
    <div className={`absolute top-8 ${isOwnMessage ? 'right-0' : 'left-0'} w-52 bg-white border border-slate-100 shadow-xl rounded-xl py-2 z-50`}>
      
      {/* Quick Reactions Row */}
      <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-slate-100">
        {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
          <button key={emoji} onClick={() => handleAction('REACT', emoji)} className="hover:scale-125 transition-transform text-lg hover:bg-slate-50 rounded-full w-6 h-6 flex items-center justify-center">{emoji}</button>
        ))}
      </div>

      <button onClick={() => handleAction('REPLY')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Reply size={14}/> Reply</button>
      <button onClick={() => handleAction('FORWARD')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Forward size={14}/> Forward</button>
      {message.message && <button onClick={handleCopy} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Copy size={14}/> Copy</button>}
      
      {isOwnMessage && message.message_type === 'TEXT' && !message.is_deleted_for_everyone && (
        <button onClick={() => handleAction('EDIT')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={14}/> Edit</button>
      )}
      
      <div className="h-px bg-slate-100 my-1"></div>
      
      <button onClick={() => handleAction('DELETE_ME')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Delete for me</button>
      {isOwnMessage && !message.is_deleted_for_everyone && (
        <button onClick={() => handleAction('DELETE_EVERYONE')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-2"><Trash2 size={14}/> Delete for everyone</button>
      )}
    </div>
  );

  if (isOwnMessage) {
    return (
      <div className="flex flex-col items-end mb-2 group relative" ref={menuRef}>
        <div className="flex items-start gap-2 max-w-[75%] relative">
          
          <button onClick={() => setShowMenu(!showMenu)} className="mt-4 p-1 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical size={16} />
          </button>
          
          <div className="flex flex-col items-end">
            <div className="text-[11px] text-slate-400 mb-1 px-1">
              <span>{timeStr}</span>
            </div>
            
            <div className={`px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm text-[15px] relative ${message.is_deleted_for_everyone ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-blue-600 text-white'}`}>
              {renderContent()}
            </div>
            {renderReactions()}
          </div>
        </div>
        {showMenu && <MenuDropdown />}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start mb-2 group relative" ref={menuRef}>
      <div className="flex items-start gap-3 max-w-[75%]">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mt-1 ${avatarBg}`}>
          {initial}
        </div>
        
        <div className="flex flex-col items-start relative">
          <div className="text-[12px] mb-1 px-1 flex items-center gap-3">
            <span className={`font-bold ${nameColor}`}>{message.sender_name}</span>
            <span className="text-slate-400 font-medium">{timeStr}</span>
          </div>
          
          <div className="flex items-start gap-2">
            <div className={`px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm text-[15px] ${message.is_deleted_for_everyone ? 'bg-slate-50 text-slate-400 italic' : 'bg-slate-50 border border-slate-100 text-slate-800'}`}>
              {renderContent()}
            </div>
            <button onClick={() => setShowMenu(!showMenu)} className="mt-2 p-1 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical size={16} />
            </button>
          </div>
          {renderReactions()}
        </div>
      </div>
      {showMenu && <MenuDropdown />}
    </div>
  );
}

export default MessageBubble;
