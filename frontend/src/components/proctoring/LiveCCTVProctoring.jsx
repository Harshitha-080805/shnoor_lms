import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ShieldAlert, VideoOff, Users, Maximize2, Radio, Activity, LayoutGrid, MessageSquare, AlertTriangle } from 'lucide-react';

const LiveCCTVProctoring = () => {
    const [activeStudents, setActiveStudents] = useState({});
    const [selectedStudentForViolations, setSelectedStudentForViolations] = useState(null);
    const socketRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const videoRefs = useRef({});

    useEffect(() => {
        const token = sessionStorage.getItem('access') || localStorage.getItem('token');
        if (!token) return;

        const socket = io('http://localhost:5000', {
            auth: { token }
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("CCTV Socket connected");
        });

        socket.on('student_available', async (data) => {
            const { socketId, studentId, studentName, targetType, targetId } = data;
            
            if (peerConnectionsRef.current[socketId]) return;

            setActiveStudents(prev => ({
                ...prev,
                [socketId]: { studentId, studentName, targetType, targetId, violations: {}, totalViolations: 0 }
            }));

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            peerConnectionsRef.current[socketId] = pc;

            pc.ontrack = (event) => {
                if (videoRefs.current[socketId]) {
                    if (!videoRefs.current[socketId].srcObject) {
                        videoRefs.current[socketId].srcObject = new MediaStream();
                    }
                    videoRefs.current[socketId].srcObject.addTrack(event.track);
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('webrtc_ice_candidate', {
                        targetSocketId: socketId,
                        candidate: event.candidate
                    });
                }
            };

            socket.emit('request_video_stream', { targetSocketId: socketId });
        });

        socket.on('webrtc_offer', async ({ sdp, senderSocketId }) => {
            const pc = peerConnectionsRef.current[senderSocketId];
            if (!pc) return;

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                
                socket.emit('webrtc_answer', {
                    targetSocketId: senderSocketId,
                    sdp: answer
                });
            } catch (err) {
                console.error("Error handling offer in CCTV:", err);
            }
        });

        socket.on('webrtc_ice_candidate', async ({ candidate, senderSocketId }) => {
            const pc = peerConnectionsRef.current[senderSocketId];
            if (pc && candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error adding ice candidate:", err);
                }
            }
        });

        socket.on('student_violation', ({ violationType, studentSocketId }) => {
            setActiveStudents(prev => {
                if (!prev[studentSocketId]) return prev;
                const student = prev[studentSocketId];
                const violations = student.violations || {};
                const newCount = (violations[violationType] || 0) + 1;
                return {
                    ...prev,
                    [studentSocketId]: {
                        ...student,
                        violations: {
                            ...violations,
                            [violationType]: newCount
                        },
                        totalViolations: (student.totalViolations || 0) + 1
                    }
                };
            });
        });

        socket.on('student_disconnected', ({ socketId }) => {
            removeStudent(socketId);
        });

        return () => {
            socket.disconnect();
            Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
        };
    }, []);

    const handleSendMessage = (socketId) => {
        const msg = window.prompt("Enter message to send to the candidate:");
        if (msg && msg.trim()) {
            if (socketRef.current) {
                socketRef.current.emit('proctor_action', {
                    targetSocketId: socketId,
                    action: 'MESSAGE',
                    payload: { text: msg.trim() }
                });
                alert("Message sent successfully.");
            }
        }
    };

    const handleTerminate = (socketId) => {
        const confirm = window.confirm("Are you sure you want to forcefully terminate this candidate's exam? This will auto-submit their assessment immediately.");
        if (confirm) {
            if (socketRef.current) {
                socketRef.current.emit('proctor_action', {
                    targetSocketId: socketId,
                    action: 'TERMINATE',
                    payload: {}
                });
                alert("Termination signal sent.");
            }
        }
    };

    const handleFullscreen = (socketId) => {
        const videoEl = videoRefs.current[socketId];
        if (videoEl) {
            if (videoEl.requestFullscreen) {
                videoEl.requestFullscreen();
            } else if (videoEl.webkitRequestFullscreen) {
                videoEl.webkitRequestFullscreen();
            } else if (videoEl.msRequestFullscreen) {
                videoEl.msRequestFullscreen();
            }
        }
    };

    const removeStudent = (socketId) => {
        if (peerConnectionsRef.current[socketId]) {
            peerConnectionsRef.current[socketId].close();
            delete peerConnectionsRef.current[socketId];
        }
        setActiveStudents(prev => {
            const updated = { ...prev };
            delete updated[socketId];
            return updated;
        });
    };

    return (
        <div className="h-[calc(100vh-120px)] bg-slate-50 pb-6 pr-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
                
                {/* Premium Inner Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                    <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm border border-emerald-100/50">
                            <LayoutGrid size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 leading-tight tracking-tight">Live Monitoring</h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time CCTV feeds for active sessions</p>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-200/60 px-4 py-2 rounded-xl flex items-center gap-3 shadow-inner">
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active</span>
                            <span className="text-base font-extrabold text-slate-800">{Object.keys(activeStudents).length}</span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col p-6 bg-slate-50/30 overflow-y-auto">
                    {Object.keys(activeStudents).length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="max-w-md w-full text-center">
                                <div className="w-28 h-28 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                                    <div className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full animate-[spin_15s_linear_infinite]"></div>
                                    <ShieldAlert size={40} className="text-slate-300" />
                                </div>
                                <h3 className="text-2xl font-extrabold text-slate-800 mb-3 tracking-tight">No Active Sessions</h3>
                                <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto font-medium">
                                    There are currently no candidates taking a proctored exam. 
                                    When an exam begins, the candidate's live video feed will instantly appear here.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Object.entries(activeStudents).map(([socketId, student]) => (
                                <div key={socketId} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 group transition-all duration-300 hover:shadow-md hover:border-emerald-200 flex flex-col">
                                    
                                    {/* Video Container */}
                                    <div className="aspect-video bg-slate-900 relative">
                                        <div className="absolute top-3 left-3 z-10">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/60 border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                {student.targetType} LIVE
                                            </span>
                                        </div>
                                        
                                        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleFullscreen(socketId)}
                                                className="text-white hover:text-emerald-400 bg-black/40 hover:bg-black/60 p-1.5 rounded-md backdrop-blur-md transition-colors"
                                                title="Fullscreen"
                                            >
                                                <Maximize2 size={16} />
                                            </button>
                                        </div>

                                        <video
                                            ref={el => {
                                                if (el) videoRefs.current[socketId] = el;
                                            }}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    
                                    {/* Bottom Info Area */}
                                    <div className="p-4 flex flex-col justify-between flex-1 bg-white">
                                        <div className="mb-3">
                                            <h4 className="text-slate-800 font-bold text-sm truncate">{student.studentName}</h4>
                                            <div className="flex items-center justify-between mt-1">
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Activity size={12} className="text-emerald-500" />
                                                    <span className="text-xs font-medium">ID: {student.studentId}</span>
                                                </div>
                                                <button 
                                                    onClick={() => setSelectedStudentForViolations(student)}
                                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                                >
                                                    {student.totalViolations || 0} Violations
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2 mt-2">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleSendMessage(socketId)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors uppercase tracking-wider bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl"
                                                >
                                                    <MessageSquare size={14} /> Message
                                                </button>
                                                <button 
                                                    onClick={() => handleTerminate(socketId)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-bold text-white hover:bg-red-600 transition-colors uppercase tracking-wider bg-red-500 border border-red-500 px-3 py-2 rounded-xl shadow-sm"
                                                >
                                                    <AlertTriangle size={14} /> Terminate
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => removeStudent(socketId)}
                                                className="w-full text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider px-3 py-1 mt-1 rounded-xl"
                                            >
                                                Dismiss Feed
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {Object.keys(activeStudents).length === 0 && (
                <div className="flex flex-col items-center justify-center h-[600px] text-slate-400">
                    <VideoOff size={64} className="mb-4 text-slate-300" strokeWidth={1} />
                    <h3 className="text-xl font-bold text-slate-500 mb-2">No Active Streams</h3>
                    <p className="max-w-md text-center text-sm font-medium">
                        Waiting for candidates to begin their proctored sessions. Live feeds will appear here automatically.
                    </p>
                </div>
            )}

            {/* Violations Modal */}
            {selectedStudentForViolations && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Violations Log</h3>
                                <p className="text-xs font-medium text-slate-500">{selectedStudentForViolations.studentName}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
                            {(!selectedStudentForViolations.violations || Object.keys(selectedStudentForViolations.violations).length === 0) ? (
                                <p className="text-center text-sm font-bold text-slate-400 py-4">No violations logged yet.</p>
                            ) : (
                                Object.entries(selectedStudentForViolations.violations).map(([type, count]) => (
                                    <div key={type} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl">
                                        <span className="text-sm font-bold text-slate-700">{type}</span>
                                        <span className="text-sm font-black text-red-600 bg-red-100 px-2.5 py-0.5 rounded-lg">{count}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <button 
                            onClick={() => setSelectedStudentForViolations(null)}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-wider"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveCCTVProctoring;
