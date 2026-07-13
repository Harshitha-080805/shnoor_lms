import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Camera, Volume2, ShieldAlert } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../api';

const ProctoringEngine = ({ 
  sessionId, 
  settings = {}, 
  onViolation,
  onReady,
  onForceSubmit,
  targetType,
  targetId
}) => {
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceModel, setFaceModel] = useState(null);
  const [objectModel, setObjectModel] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const faceModelRef = useRef(null);
  const objectModelRef = useRef(null);
  const faceIntervalRef = useRef(null);
  const objectIntervalRef = useRef(null);
  const voiceIntervalRef = useRef(null);
  const lastViolationTimes = useRef({});

  const [warning, setWarning] = useState(null);

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({}); // Store RTCPeerConnection for each instructor

  // Video Recording Refs
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const {
    enable_face_detection = true,
    enable_mobile_detection = true,
    enable_tab_switch = true,
    enable_voice_detection = true,
    enable_fullscreen_exit = true,
    enable_copy_paste = true
  } = settings;

  useEffect(() => {
    // 1. Initialize WebCam & Microphone
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: enable_voice_detection
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);

        if (enable_voice_detection) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
        }

        // Initialize MediaRecorder
        const options = { mimeType: 'video/webm; codecs=vp8,opus' };
        if (MediaRecorder.isTypeSupported(options.mimeType)) {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
        } else {
          mediaRecorderRef.current = new MediaRecorder(stream);
        }
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = uploadSessionVideo;
        mediaRecorderRef.current.start(); // Record continuously to avoid keyframe corruption

        // 2. Load Models Lazily
        loadModels();

      } catch (err) {
        console.error("Camera/Mic Permission Denied", err);
        // We could trigger a violation or block the exam here
      }
    };

    initMedia();

    return () => {
      stopMonitoring();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    };
  }, []);

  // WebRTC Setup
  useEffect(() => {
    if (!cameraReady) return;

    // Only connect if we have a token
    const token = sessionStorage.getItem('access') || localStorage.getItem('token');
    if (!token) {
      console.warn("ProctoringEngine: No auth token found!");
      return;
    }

    const socket = io('http://localhost:5000', {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("Proctoring Engine Socket connected");
    });

    if (targetType && targetId) {
      socket.emit('join_proctor_room', { targetType, targetId });
    }

    socket.on('request_video_stream', async ({ instructorSocketId }) => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionsRef.current[instructorSocketId] = pc;

      // Add local stream to peer connection
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          // Do not add audio track if user requested video only, but we'll add all for now
          pc.addTrack(track, streamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            targetSocketId: instructorSocketId,
            candidate: event.candidate
          });
        }
      };

      // Create offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', {
          targetSocketId: instructorSocketId,
          sdp: offer
        });
      } catch (err) {
        console.error("Failed to create offer", err);
      }
    });

    socket.on('webrtc_answer', async ({ sdp, senderSocketId }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.on('webrtc_ice_candidate', async ({ candidate, senderSocketId }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('proctor_action', (data) => {
      if (data.action === 'MESSAGE') {
        alert("Message from Proctor:\n\n" + data.payload.text);
      } else if (data.action === 'TERMINATE') {
        alert("Your exam has been forcefully terminated by the proctor due to excessive violations or suspicious activity.");
        if (onForceSubmit) {
          onForceSubmit();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [cameraReady, targetType, targetId]);

  const loadModels = async () => {
    try {
      await tf.ready();
      
      const promises = [];
      if (enable_face_detection) {
        promises.push(blazeface.load().then(model => {
          faceModelRef.current = model;
          setFaceModel(model);
        }));
      }
      if (enable_mobile_detection) {
        promises.push(cocoSsd.load().then(model => {
          objectModelRef.current = model;
          setObjectModel(model);
        }));
      }
      
      await Promise.all(promises);
      
      setModelsLoaded(true);
      if (onReady) onReady();
      startMonitoring();
    } catch (err) {
      console.error("Error loading TF models", err);
    }
  };

  const startMonitoring = () => {
    setIsMonitoring(true);

    if (enable_face_detection) {
      faceIntervalRef.current = setInterval(checkFace, 1500);
    }

    if (enable_mobile_detection) {
      objectIntervalRef.current = setInterval(checkObject, 3000);
    }

    if (enable_voice_detection && analyserRef.current) {
      voiceIntervalRef.current = setInterval(checkVoice, 500);
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    clearInterval(faceIntervalRef.current);
    clearInterval(objectIntervalRef.current);
    clearInterval(voiceIntervalRef.current);
  };

  const uploadSessionVideo = async () => {
    if (recordedChunksRef.current.length === 0 || !sessionId) return;
    
    const blob = new Blob(recordedChunksRef.current, {
      type: 'video/webm'
    });
    
    const formData = new FormData();
    formData.append('video', blob, `session-${sessionId}.webm`);
    formData.append('session_id', sessionId);
    
    try {
      await api.post('/api/proctoring/upload-video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Session video uploaded successfully');
    } catch (err) {
      console.error('Failed to upload session video', err);
    }
  };

  const triggerViolation = (type, severity = 'HIGH') => {
    const now = Date.now();
    // 2-second cooldown per violation type to prevent spamming
    if (lastViolationTimes.current[type] && now - lastViolationTimes.current[type] < 2000) {
      return;
    }
    lastViolationTimes.current[type] = now;

    // Basic screenshot capture for evidence
    let snapshot = null;
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        snapshot = canvas.toDataURL('image/jpeg', 0.5);
      }
    }
    
    onViolation({
      session_id: sessionId,
      violation_type: type,
      severity,
      image_snapshot: snapshot
    });

    if (socketRef.current && peerConnectionsRef.current) {
      Object.keys(peerConnectionsRef.current).forEach(instructorSocketId => {
        socketRef.current.emit('forward_violation', {
          targetSocketId: instructorSocketId,
          violationType: type
        });
      });
    }

    setWarning(`Warning: ${type}`);
    setTimeout(() => setWarning(null), 4000);
  };

  // Check Face
  const checkFace = async () => {
    if (!videoRef.current || !faceModelRef.current || videoRef.current.readyState !== 4) return;
    try {
      const predictions = await faceModelRef.current.estimateFaces(videoRef.current, false);
      if (predictions.length === 0) {
        triggerViolation('No Face Detected', 'HIGH');
      } else if (predictions.length > 1) {
        triggerViolation('Multiple Faces Detected', 'HIGH');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Check Phone
  const checkObject = async () => {
    if (!videoRef.current || !objectModelRef.current || videoRef.current.readyState !== 4) return;
    try {
      // Lower minimum score to 0.35 (default 0.5) to catch phones aggressively even at angles/edges
      const predictions = await objectModelRef.current.detect(videoRef.current, 40, 0.35);
      const phoneDetected = predictions.some(p => p.class === 'cell phone' || p.class === 'remote');
      if (phoneDetected) {
        triggerViolation('Mobile Device Detected', 'HIGH');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Check Voice
  const checkVoice = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
    
    let sumSquares = 0.0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
        let norm = (dataArrayRef.current[i] / 128.0) - 1.0;
        sumSquares += (norm * norm);
    }
    const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);
    const volume = Math.max(0, Math.min(1, rms * 10)); // Arbitrary scaling for volume detection

    // If volume is consistently high, log violation
    // Adjust threshold based on testing
    if (volume > 0.4) {
      triggerViolation('Voice Detected (Noise Level High)', 'MEDIUM');
    }
  };

  // DOM Event Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (enable_tab_switch && document.visibilityState === 'hidden') {
        triggerViolation('Tab Switching Detected', 'HIGH');
      }
    };

    const handleWindowBlur = () => {
      if (enable_tab_switch) {
        triggerViolation('Window Lost Focus (Blur)', 'MEDIUM');
      }
    };

    const handleCopyPaste = (e) => {
      if (enable_copy_paste) {
        e.preventDefault();
        triggerViolation('Copy/Paste Attempt', 'HIGH');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
  }, [enable_tab_switch, enable_copy_paste, sessionId]);

  return (
    <>
      {warning && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl z-[99999] flex items-center gap-3 animate-in slide-in-from-top-4 font-bold border-2 border-red-400">
          <ShieldAlert size={24} />
          {warning}
        </div>
      )}
      <div className="fixed bottom-4 right-4 w-48 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 z-[9999] pointer-events-none">
        <div className="bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldAlert size={14} className="text-emerald-400" />
            Proctoring Active
          </span>
        </div>
        <div className="relative">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-auto"
          />
        </div>
      </div>
    </>
  );
};

export default ProctoringEngine;
