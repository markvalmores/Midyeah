/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Users, Plus, Share2, Video as VideoIcon, Mic, MicOff, Camera,
  CameraOff, Send, LogOut, Check, Info, ShieldAlert, KeyRound
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { WatchRoom as RoomType } from "../types";

export default function WatchRoom() {
  const [rooms, setRooms] = useState<RoomType[]>([
    { id: "room1", name: "Midnight Movie Stream 🍿", isPublic: true, inviteCode: "MID-9923", creator: "Usagyuun Fans" },
    { id: "room2", name: "Bunny Coffee Chat Cozy ☕", isPublic: true, inviteCode: "BUN-2041", creator: "MidyBunny" }
  ]);

  const [activeRoom, setActiveRoom] = useState<RoomType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Creation params
  const [newRoomName, setNewRoomName] = useState("");
  const [roomType, setRoomType] = useState<"public" | "private">("public");
  const [inviteCode, setInviteCode] = useState("");

  // Search or join invite code
  const [searchCode, setSearchCode] = useState("");
  const [joinError, setJoinError] = useState("");

  // Live video/audio chat feed states
  const [isCamOn, setIsCamOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Group chat states
  const [roomChats, setRoomChats] = useState<{ sender: string; text: string }[]>([
    { sender: "MidyBunny", text: "Nice stream, cozy vibes!" },
    { sender: "Usagyuun Vtuber", text: "Welcome peers, enjoy the movie together!" },
    { sender: "Mark David", score: 0, text: "Platform is running beautifully!" } as any
  ]);
  const [newMessage, setNewMessage] = useState("");

  // Handle camera toggle with real permissions prompt
  const toggleCamera = async () => {
    if (isCamOn) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
      setIsCamOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
        setCameraStream(stream);
        setIsCamOn(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        alert("Camera permission denied, or camera unavailable on your layout. Using happy Purple Mascot avatar fallback stream!");
        setIsCamOn(true); // virtual camera fallback
      }
    }
  };

  const toggleMicrophone = async () => {
    setIsMicOn(!isMicOn);
    if (cameraStream) {
      cameraStream.getAudioTracks().forEach(track => {
        track.enabled = !isMicOn;
      });
    }
  };

  // Generate Invite Code helper
  const triggerInviteGenerator = () => {
    const code = "MID-" + Math.floor(1000 + Math.random() * 9000);
    setInviteCode(code);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const code = inviteCode || "MID-" + Math.floor(1000 + Math.random() * 9000);
    const newRoom: RoomType = {
      id: "room-" + Date.now(),
      name: newRoomName,
      isPublic: roomType === "public",
      inviteCode: code,
      creator: "You (Active Creator)"
    };

    setRooms(p => [newRoom, ...p]);
    setActiveRoom(newRoom);
    setShowCreateModal(false);
    
    // reset parameters
    setNewRoomName("");
    setInviteCode("");
    
    // initial room chat greet
    setRoomChats([
      { sender: "MidYeah Mascot Bunny 🐰", text: `Welcome to the watch room '${newRoomName}'! Invite others using copyable stream key or Code ${code}` }
    ]);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = searchCode.trim().toUpperCase();
    if (!cleanCode) return;

    const find = rooms.find(r => r.inviteCode.toUpperCase() === cleanCode);
    if (find) {
      setActiveRoom(find);
      setSearchCode("");
      setJoinError("");
      setRoomChats([
        { sender: "MidyBunny", text: "Successfully synchronized watch session with " + find.name }
      ]);
    } else {
      setJoinError("Room key not found. Please try again or create a fresh room!");
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;
    setRoomChats(p => [...p, { sender: "You", text: newMessage }]);
    setNewMessage("");

    // Simulate reactive comments from Midy
    setTimeout(() => {
      const responses = [
        "That scene was absolutely incredible!",
        "Midy is happy holding a coffee cup watching with us! 🐰☕",
        "Praise God for this amazing collaborative viewing technology!",
        "Remember to support creators by keeping comments respectful.",
        "Your synchronized view is perfectly real-time."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setRoomChats(p => [...p, { sender: "MidyBunny", text: randomResponse }]);
    }, 1500);
  };

  // Turn off streamer streams upon exit
  const handleExitRoom = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCamOn(false);
    setIsMicOn(false);
    setActiveRoom(null);
  };

  return (
    <div className="bg-[#121214] text-slate-100 rounded-2xl p-6 border border-white/10 min-h-[420px] shadow-xl">
      <AnimatePresence mode="wait">
        {!activeRoom ? (
          /* General Lobby Dashboard */
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-3 gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-1">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>PUBLIC WATCHROOMS</span>
                </h2>
                <p className="text-[10px] text-purple-300 mt-0.5">Stream collaboratively and keep virtual video chats active with friends!</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Search / Enter code to join */}
                <form onSubmit={handleJoinByCode} className="flex bg-[#1C1C1F] border border-white/10 rounded-xl overflow-hidden text-xs max-w-xs">
                  <input
                    type="text"
                    placeholder="Enter Invite Code (e.g. MID-9923)"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="bg-transparent px-2.5 py-1 text-xs focus:ring-0 text-white font-semibold flex-1 outline-none"
                    id="room-code-input"
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 font-bold px-3 text-white transition cursor-pointer"
                    id="submit-room-code"
                  >
                    Join
                  </button>
                </form>

                <button
                  onClick={() => { setShowCreateModal(true); triggerInviteGenerator(); }}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition shadow"
                  id="trigger-create-room-btn"
                >
                  <Plus className="w-4 h-4" /> Create Room
                </button>
              </div>
            </div>

            {joinError && (
              <div className="bg-rose-950/40 text-rose-300 border border-rose-900/60 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>{joinError}</span>
              </div>
            )}

            {/* Public Rooms Loop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-[#1C1C1F] border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:border-purple-500/30 transition-all shadow"
                >
                  <div>
                    <span className="bg-purple-600/80 text-[9px] text-purple-100 font-bold px-1.5 py-0.5 rounded mr-2 uppercase">
                      {room.isPublic ? "Public" : "Invite Only"}
                    </span>
                    <h3 className="font-bold text-sm text-gray-100 mt-1">{room.name}</h3>
                    <p className="text-[10px] text-purple-400 mt-0.5">Stream owner: {room.creator}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400">Invite Code: </span>
                      <span className="font-mono text-purple-300 font-bold text-xs bg-purple-950 px-2 py-0.5 rounded">{room.inviteCode}</span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveRoom(room);
                        setRoomChats([
                          { sender: "MidyBunny", text: `Joined cozy watch party: ${room.name}` }
                        ]);
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition"
                      id={`join-room-action-${room.id}`}
                    >
                      Connect Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Active Collaborative Room Feed */
          <motion.div
            key="activeroom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Left Collaborative Watch Feed */}
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between bg-[#1C1C1F] p-3 rounded-xl border border-white/10">
                <div>
                  <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <VideoIcon className="w-4 h-4 text-purple-400 animate-pulse" />
                    <span>Watch Session: {activeRoom.name}</span>
                  </h2>
                  <p className="text-[10px] text-purple-300">Invite URL Token: <span className="font-mono text-purple-400 font-bold">{activeRoom.inviteCode}</span></p>
                </div>
                
                <button
                  onClick={handleExitRoom}
                  className="flex items-center gap-1 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/20 text-rose-300 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer"
                  id="exit-room-btn"
                >
                  <LogOut className="w-3.5 h-3.5" /> Disconnect
                </button>
              </div>

              {/* Collaborative Synchronizer Video representation */}
              <div className="bg-[#0A0A0B] rounded-xl aspect-video relative flex flex-col items-center justify-center overflow-hidden border border-white/10">
                <VideoIcon className="w-12 h-12 text-purple-600 animate-bounce mb-2" />
                <p className="text-xs text-gray-300 font-bold">Collaborative Video Streaming Node Active</p>
                <p className="text-[10px] text-purple-400 mt-1">Playback is automatically synchronized with the host group camera stream.</p>
              </div>

              {/* Video and Audio chat feed block */}
              <div className="flex flex-col bg-purple-950/10 p-3 rounded-xl border border-purple-950/25 gap-2.5">
                <span className="text-[11px] font-bold text-purple-300 tracking-wider">COLLABORATIVE LIVE CAM CHAT FEED</span>

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Your Cam Box */}
                  <div className="bg-slate-900 rounded-lg aspect-video relative overflow-hidden flex flex-col items-center justify-center border border-purple-950">
                    {isCamOn ? (
                      cameraStream ? (
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        /* Falling Purple Bunny mascot virtual avatar */
                        <div className="flex flex-col items-center justify-center bg-purple-950/40 w-full h-full p-2 text-center select-none">
                          <span className="text-2xl animate-bounce">🐰🍰</span>
                          <span className="text-[10px] font-bold text-purple-300 mt-1">Midy Virtual Avatar Stream</span>
                          <span className="text-[9px] text-gray-400">My camera mock is running clean!</span>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <CameraOff className="w-6 h-6 text-gray-500" />
                        <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">My Cam Off</span>
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 bg-black/70 px-2 py-0.5 rounded text-[8px] text-white">
                      You (Watching) {isMicOn ? "🎤" : "🔇"}
                    </div>
                  </div>

                  {/* Partner / Host Cam Box */}
                  <div className="bg-slate-900 rounded-lg aspect-video relative overflow-hidden flex flex-col items-center justify-center border border-purple-950">
                    <div className="flex flex-col items-center justify-center text-center p-2">
                      <span className="text-2xl animate-pulse">☕🐰</span>
                      <span className="text-[9px] text-purple-300 font-bold mt-1">Host: Usagyuun Fan</span>
                      <span className="text-[8px] text-emerald-400 mt-0.5">● Active stream audio</span>
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 bg-black/70 px-2 py-0.5 rounded text-[8px] text-white">
                      Usagyuun Vtuber Member 🎤
                    </div>
                  </div>
                </div>

                {/* Control switches */}
                <div className="flex items-center justify-center gap-3 mt-1 pt-1 border-t border-purple-950/30">
                  <button
                    onClick={toggleCamera}
                    className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 ${isCamOn ? "bg-purple-600 text-white" : "bg-purple-950/55 text-purple-300 hover:bg-purple-900"}`}
                    id="toggle-room-cam"
                  >
                    {isCamOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                    <span>{isCamOn ? "Stop Feed" : "Start Video Chat"}</span>
                  </button>

                  <button
                    onClick={toggleMicrophone}
                    className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 ${isMicOn ? "bg-emerald-600 text-white" : "bg-purple-950/55 text-purple-300 hover:bg-purple-900"}`}
                    id="toggle-room-mic"
                  >
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    <span>{isMicOn ? "Mute Mic" : "Allow Microphone"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Collaborative Watch chat pane */}
            <div className="bg-slate-950 border border-purple-950 rounded-xl p-3 flex flex-col h-[400px]">
              <span className="text-[10px] text-purple-300 font-bold uppercase mb-2">Watchroom Chat Sidebar</span>
              
              <div className="flex-1 overflow-y-auto mb-2 space-y-2.5 pr-1 scrollbar-thin">
                {roomChats.map((msg, idx) => (
                  <div key={idx} className="text-xs bg-purple-950/15 p-2 rounded-lg border border-purple-950/20">
                    <span className="font-bold text-purple-300 mr-2">{msg.sender}:</span>
                    <span className="text-gray-200">{msg.text}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type watch notes..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="bg-purple-950/30 border border-purple-900/60 rounded-lg text-xs p-2 text-white flex-1 outline-none focus:border-purple-500"
                  id="room-msg-input"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-400 p-2 text-white rounded-lg transition"
                  id="send-room-msg-btn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Creation Modal View */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#120e1a] border-2 border-purple-500 rounded-2xl max-w-sm w-full p-4 p-5 shadow-2xl relative"
            >
              <h3 className="text-base font-bold text-white mb-1">Create collaborative Watchroom</h3>
              <p className="text-[11px] text-purple-400 mb-4">Set up a space, invite your crew, and watch together safely!</p>

              <form onSubmit={handleCreateRoom} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-300 font-medium mb-1 uppercase text-[10px]">Room Heading Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vtuber Stream Watch! ☕"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-purple-950/40 border border-purple-900 /60 rounded-xl p-2 text-white outline-none focus:border-purple-500"
                    id="new-room-name-input"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1 uppercase text-[10px]">Privacy Selector</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as any)}
                    className="w-full bg-[#1e172a] border border-purple-900/60 text-purple-300 rounded-xl p-2 outline-none"
                    id="new-room-privacy-input"
                  >
                    <option value="public">🌐 Public Lobby (Anyone can search/join)</option>
                    <option value="private">🔒 Private (Requires 7-digit Invite code)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1 uppercase text-[10px]">Invite Code Token</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      placeholder="e.g. MID-9883"
                      value={inviteCode}
                      className="bg-purple-950/30 border border-purple-900/60 rounded-xl p-2 text-purple-300 font-mono font-bold flex-1"
                      id="new-room-code-display"
                    />
                    <button
                      type="button"
                      onClick={triggerInviteGenerator}
                      className="bg-purple-950 hover:bg-purple-900 text-purple-400 border border-purple-800 p-2 rounded-xl"
                      id="regen-room-code-btn"
                    >
                      Regen Token
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-purple-950/60">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 bg-transparent hover:bg-purple-950/40 px-3.5 py-1.5 rounded-xl cursor-pointer"
                    id="cancel-create-room"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-1.5 rounded-xl cursor-pointer"
                    id="submit-create-room"
                  >
                    Save & Open
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
