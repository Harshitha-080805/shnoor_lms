import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import NewGroupModal from "./NewGroupModal";
import AddMemberModal from "./AddMemberModal";
import PinModal from "./PinModal";
import ForwardModal from "./ForwardModal";
import { chatService } from "../../services/chatService";
import { socketService } from "../../services/socket";

// We need to parse JWT or just rely on backend. 
// Assuming session storage has userId, or we decode the token simply.
const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

function ChatLayout() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [verifyPinModalOpen, setVerifyPinModalOpen] = useState(false);
  const [verifyTargetConvId, setVerifyTargetConvId] = useState(null);
  
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const activeConvIdRef = useRef(activeConvId);

  const location = useLocation();

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    if (location.state && location.state.targetId) {
      setActiveConvId(location.state.targetId);
      // clear the state so it doesn't stay stuck if we navigate away and back
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const refreshConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to refresh conversations", err);
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem("access");
    if (!token) return;
    const decoded = parseJwt(token);
    if (decoded) {
      setCurrentUserId(decoded.userId);
      setCurrentUserRole(decoded.role ? decoded.role.toUpperCase() : null);
    }

    // Initialize Socket
    const socket = socketService.connect();

    // Fetch initial conversations
    const loadConversations = async () => {
      try {
        const data = await chatService.getConversations();
        setConversations(data);
        
        // Join rooms
        const roomIds = data.map(c => c.id);
        if (roomIds.length > 0) {
          socket.emit("join_rooms", roomIds);
        }
      } catch (err) {
        console.error("Failed to load conversations", err);
      }
    };
    loadConversations();

    // Socket listeners
    socket.on("connect", () => {
      // Re-join rooms on reconnect
      if (activeConvIdRef.current) {
        socket.emit("join_rooms", [activeConvIdRef.current]);
      }
      chatService.getConversations().then(data => {
        const roomIds = data.map(c => c.id);
        if (roomIds.length > 0) socket.emit("join_rooms", roomIds);
      });
    });

    socket.on("receive_message", (msg) => {
      setMessages(prev => {
        // If message belongs to active conversation, append it
        if (activeConvIdRef.current && String(msg.conversation_id) === String(activeConvIdRef.current)) {
          return [...prev, msg];
        }
        return prev;
      });
      // Optionally update conversation list sorting or unread count here
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const loadMessages = async () => {
    if (!activeConvId) return;
    try {
      const data = await chatService.getMessages(activeConvId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  // When active conversation changes, fetch its historical messages
  useEffect(() => {
    loadMessages();
  }, [activeConvId]);

  const handleSendMessage = (content, type = "TEXT", fileName = null, fileUrl = null, fileType = null, replyToId = null) => {
    if (!activeConvId) return;
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit("send_message", {
        conversationId: activeConvId,
        message: content,
        messageType: type,
        fileUrl: fileUrl,
        fileName: fileName,
        fileType: fileType,
        replyToId: replyToId
      });
    }
  };

  const submitForwardMessage = (targetConvId) => {
    const socket = socketService.getSocket();
    if (socket && forwardMessage) {
      socket.emit("send_message", {
        conversationId: targetConvId,
        message: forwardMessage.message,
        messageType: forwardMessage.message_type,
        fileUrl: forwardMessage.file_url,
        fileName: forwardMessage.file_name,
        fileType: forwardMessage.file_type,
        isForwarded: true
      });
      setIsForwardModalOpen(false);
      setForwardMessage(null);
      setActiveConvId(targetConvId);
      socket.emit("join_rooms", [targetConvId]);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  const handleNewDirect = async () => {
    const targetId = prompt("Enter the User ID you want to message:");
    if (!targetId) return;
    try {
      const res = await chatService.startDirectChat(targetId);
      // Refresh conversations
      const data = await chatService.getConversations();
      setConversations(data);
      setActiveConvId(res.conversationId);
      socketService.getSocket().emit("join_rooms", [res.conversationId]);
    } catch (err) {
      alert("Failed to start chat. Check user ID.");
    }
  };

  const handleNewGroup = () => {
    setIsGroupModalOpen(true);
  };

  const submitNewGroup = async (name, memberIds) => {
    try {
      const res = await chatService.createGroupChat(name, memberIds);
      const data = await chatService.getConversations();
      setConversations(data);
      setActiveConvId(res.conversationId);
      socketService.getSocket().emit("join_rooms", [res.conversationId]);
      setIsGroupModalOpen(false);
    } catch (err) {
      alert("Failed to create group.");
    }
  };

  const submitAddMembers = async (memberIds) => {
    try {
      await chatService.addGroupMembers(activeConvId, memberIds);
      setIsAddMemberModalOpen(false);
      alert("Members added successfully!");
    } catch (err) {
      alert("Failed to add members: " + (err.response?.data?.error || err.message));
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConvId) return;
    try {
      await chatService.leaveGroup(activeConvId);
      setActiveConvId(null);
      refreshConversations();
      alert("Left group successfully.");
    } catch (err) {
      alert("Failed to leave group: " + (err.response?.data?.error || err.message));
    }
  };

  const handleStartDirect = async (targetId) => {
    if (!targetId || targetId === currentUserId) return;
    try {
      const res = await chatService.startDirectChat(targetId);
      const data = await chatService.getConversations();
      setConversations(data);
      setActiveConvId(res.conversationId);
      socketService.getSocket().emit("join_rooms", [res.conversationId]);
    } catch (err) {
      alert("Failed to start chat.");
    }
  };

  const handleSelectConv = (conv) => {
    if (conv.is_locked) {
      setVerifyTargetConvId(conv.id);
      setVerifyPinModalOpen(true);
    } else {
      setActiveConvId(conv.id);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] w-full flex flex-col overflow-hidden bg-white font-sans rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar 
          conversations={conversations} 
          activeConvId={activeConvId} 
          initialSearch={location.state?.searchTerm}
          onSelectConv={handleSelectConv}
          onNewDirect={handleNewDirect}
          onNewGroup={handleNewGroup}
          onOpenPinModal={() => setIsPinModalOpen(true)}
        />
        <ChatWindow 
          activeConv={activeConv} 
          messages={messages} 
          onSendMessage={handleSendMessage}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onStartDirectChat={handleStartDirect}
          onRefreshMessages={loadMessages}
          onRefreshConversations={refreshConversations}
          onForwardMessage={(msg) => { setForwardMessage(msg); setIsForwardModalOpen(true); }}
          onOpenAddMember={() => setIsAddMemberModalOpen(true)}
          onLeaveGroup={handleLeaveGroup}
        />
      </div>
      <NewGroupModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        onCreate={submitNewGroup} 
      />
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onAddMembers={submitAddMembers}
        activeConvId={activeConvId}
      />
      <PinModal 
        isOpen={isPinModalOpen} 
        onClose={() => setIsPinModalOpen(false)} 
        mode="SET" 
      />
      <PinModal
        isOpen={verifyPinModalOpen}
        onClose={(success) => {
          setVerifyPinModalOpen(false);
          if (success === true) {
            setActiveConvId(verifyTargetConvId);
          }
        }}
        mode="VERIFY"
      />
      <ForwardModal
        isOpen={isForwardModalOpen}
        onClose={() => { setIsForwardModalOpen(false); setForwardMessage(null); }}
        conversations={conversations}
        onForward={submitForwardMessage}
      />
    </div>
  );
}

export default ChatLayout;
