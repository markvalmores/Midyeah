/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Video as VideoIcon, Tv, Radio, Gamepad, User, LogIn, Plus, Sparkles,
  ShieldAlert, Settings, Coffee, Wifi, WifiOff, Upload, ArrowLeftRight, HelpCircle, Dumbbell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Video, UserProfile } from "./types";
import { getAllVideos, saveVideo, openDB, getProfile, saveProfile } from "./db";

import Mascot from "./components/Mascot";
import VideoPlayer from "./components/VideoPlayer";
import Games from "./components/Games";
import WatchRoom from "./components/WatchRoom";
import Livestream from "./components/Livestream";
import RadioPlayer from "./components/RadioPlayer";
import Onboarding from "./components/Onboarding";
import Profile from "./components/Profile";
import DiscordChat from "./components/DiscordChat";

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "rooms" | "radio" | "community" | "profile">("home");
  const [isCreatorMode, setIsCreatorMode] = useState(false); // Switch between Watcher and Creator mode
  const [offlineMode, setOfflineMode] = useState(false); // Offline-Viewing only downloaded videos
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);

  // Authentications
  const [currUser, setCurrUser] = useState<UserProfile | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [stepAuth, setStepAuth] = useState<"loggedOut" | "inputCode" | "onboard" | "loggedIn">("loggedOut");
  const [verificationCode, setVerificationCode] = useState("");
  const [authCodeSent, setAuthCodeSent] = useState("");

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(false);

  // Video datasets
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  // Console controllers styles
  const [consoleBrandInput, setConsoleBrandInput] = useState<"xbox" | "playstation" | "switch" | "touch">("touch");

  // Category view triggers
  const [categoryFilter, setCategoryFilter] = useState<"all" | "movie" | "rental">("all");
  const [sortBy, setSortBy] = useState<"date" | "alphabet">("date");

  // Video Upload inputs
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadIs360, setUploadIs360] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"normal" | "movie" | "rental">("normal");
  const [uploadRentalPrice, setUploadRentalPrice] = useState(3);
  const [uploadRentalPeriod, setUploadRentalPeriod] = useState("month");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Hydrate initial database connection and verify user
  useEffect(() => {
    openDB().then(() => {
      // Reload video inventory
      reloadVideos();
      
      // Auto register current or retrievemdv
      getProfile("guest@midyeah.com").then((profile) => {
        if (profile) {
          setCurrUser(profile);
          setStepAuth("loggedIn");
        }
      });
    });
  }, []);

  const reloadVideos = () => {
    getAllVideos().then((items) => {
      setVideosList(items || []);
      const savedOfflines = items.filter(v => v.isOffline).map(v => v.id);
      setDownloadedIds(savedOfflines);
    });
  };

  // 7-digit confirmation workflow simulation
  const handleRequestAuthCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passInput.trim()) return;

    // generate a cool, copyable 7-digit verification tag
    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    setAuthCodeSent(code);
    alert(`🔐 Midyeah Server Dispatch: 7-digit authorization code sent to ${emailInput}! Code: ${code} (Input below immediately)`);
    setStepAuth("inputCode");
  };

  const verifyRegisteredCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode === authCodeSent) {
      // Initialize layout profile
      const prof: UserProfile = {
        username: emailInput.split("@")[0],
        email: emailInput,
        channelName: emailInput.split("@")[0].toUpperCase() + " STATIONS",
        channelUrl: emailInput.split("@")[0] + "_ch",
        bio: "Thank you for watching on Midyeah, God bless everyone!",
        avatarUrl: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
        coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        subscribersCount: 775 // starting statistics close to criteria triggers
      };

      saveProfile(prof).then(() => {
        setCurrUser(prof);
        setStepAuth("onboard");
        setShowTutorial(true);
      });
    } else {
      alert("Invalid 7-digit confirmation key. Please verify original code.");
    }
  };

  // Video caching handling
  const handleDownloadVideo = async (v: Video) => {
    if (downloadedIds.includes(v.id)) return;
    
    // Simulate caching Blob or local index offsets in IDB
    // Generate simple simulated Blob representing video offline references
    const dummyBlob = v.blob || new Blob(["Midyeah Video Cache File Data"], { type: "video/mp4" });
    
    const offlineVideo: Video = {
      ...v,
      isOffline: true,
      blob: dummyBlob
    };

    await saveVideo(offlineVideo, dummyBlob);
    reloadVideos(); // Synchronize listing
    alert(`✨ '${v.title}' successfully cached into browser local IndexedDB storage. Ready for offline viewing modes! 🐰`);
  };

  // New Video upload registration
  const handleVideoUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("Please upload a supported video file.");
      return;
    }

    if (uploadCategory === "rental") {
      if (uploadRentalPrice < 3 || uploadRentalPrice > 100) {
        alert("Exclusive movie rental pricing requires minimum 3$ to max 100$ per month/year.");
        return;
      }
    }

    if (!currUser) return;

    // Use actual uploaded File object as the Blob and create URL
    const videoUrl = URL.createObjectURL(uploadFile);
    const mockId = "vid_" + Date.now();

    const newVideo: Video = {
      id: mockId,
      title: uploadTitle,
      description: uploadDesc,
      videoUrl: videoUrl,
      category: uploadCategory,
      rentalPrice: uploadCategory === "rental" ? uploadRentalPrice : undefined,
      rentalPeriod: uploadCategory === "rental" ? uploadRentalPeriod : undefined,
      is360: uploadIs360,
      uploadDate: new Date().toLocaleDateString(),
      creator: currUser,
      views: 0,
      likes: 0,
      dislikes: 0,
      reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      duration: 120, // simulate duration value
      blob: uploadFile // save actual file to IndexedDB!
    };

    // Save persistently to IDB
    await saveVideo(newVideo, uploadFile);
    
    setUploadTitle("");
    setUploadDesc("");
    setUploadIs360(false);
    setUploadCategory("normal");
    setUploadFile(null);

    alert(`🎬 '${newVideo.title}' registered and saved persistently into Midyeah database! Try closing and reopen the tab; it will stay persistent!`);
    reloadVideos();
    setIsCreatorMode(false); // switch back to explore view
  };

  // Profile upgrader
  const handleProfileUpdate = async (prof: UserProfile) => {
    await saveProfile(prof);
    setCurrUser(prof);
  };

  // Categories sort filter configurations
  const getFilteredVideosList = () => {
    let list = [...videosList];
    
    // If offline viewing is selected, display ONLY downloaded videos
    if (offlineMode) {
      list = list.filter(v => downloadedIds.includes(v.id));
    }

    if (categoryFilter !== "all") {
      list = list.filter(v => v.category === categoryFilter);
    }

    if (sortBy === "alphabet") {
      list.sort((a,b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a,b) => b.uploadDate.localeCompare(a.uploadDate));
    }

    return list;
  };

  // Xbox / Playstation Brand buttons configuration templates
  const brandButtons = {
    xbox: { stroke: "border-green-500", shadow: "shadow-green-500/10", tag: "Xbox" },
    playstation: { stroke: "border-blue-500", shadow: "shadow-blue-500/10", tag: "PlayStation" },
    switch: { stroke: "border-red-500", shadow: "shadow-red-500/10", tag: "Nintendo" },
    touch: { stroke: "border-purple-500", shadow: "shadow-purple-500/10", tag: "Touch" }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Background brand bunny wallpaper element */}
      <div className="absolute top-20 right-10 text-9xl text-white/[0.02] pointer-events-none font-bold select-none z-0">
        MIDYEAH
      </div>

      {/* 1. TOP HEADER BANNER BAR */}
      <header className="sticky top-0 z-40 bg-[#121214]/90 border-b border-white/10 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-4">
        
        {/* Brand Mascot layout area */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab("home"); setCurrentVideo(null); }}>
          <div className="h-9 w-9 bg-purple-600 rounded-full flex items-center justify-center border-2 border-purple-400 font-bold text-white shadow-lg shadow-purple-500/20">
            🐰
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black tracking-wider text-white">MIDYEAH</h1>
            <p className="text-[9px] text-[#ccaaff] font-mono leading-none">STREAM HAPPINESS ☕</p>
          </div>
        </div>

        {/* Dynamic navigation links list */}
        {stepAuth === "loggedIn" && (
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => { setActiveTab("home"); setCurrentVideo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${activeTab === "home" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              id="nav-tab-home"
            >
              <VideoIcon className="w-4 h-4" />
              <span className="hidden md:inline">Videos</span>
            </button>
            <button
              onClick={() => { setActiveTab("rooms"); setCurrentVideo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${activeTab === "rooms" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              id="nav-tab-rooms"
            >
              <Tv className="w-4 h-4" />
              <span className="hidden md:inline">Watchrooms</span>
            </button>
            <button
              onClick={() => { setActiveTab("radio"); setCurrentVideo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${activeTab === "radio" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              id="nav-tab-radio"
            >
              <Radio className="w-4 h-4" />
              <span className="hidden md:inline">Radio</span>
            </button>
            <button
              onClick={() => { setActiveTab("community"); setCurrentVideo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${activeTab === "community" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              id="nav-tab-community"
            >
              <Gamepad className="w-4 h-4" />
              <span className="hidden md:inline">Discord Circle</span>
            </button>
          </nav>
        )}

        {/* Right Switch indicators */}
        <div className="flex items-center gap-3">
          
          {/* Offline local toggle switch */}
          <button
            onClick={() => setOfflineMode(!offlineMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide transition shadow uppercase cursor-pointer ${offlineMode ? "bg-emerald-950 border-emerald-500 text-emerald-300 animate-pulse" : "bg-purple-950/40 border-purple-900/40 text-purple-300"}`}
            id="offline-mode-toggle"
            title="Toggle Offline Viewing Mode only downloaded videos play"
          >
            {offlineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{offlineMode ? "Offline Active" : "Online Node"}</span>
          </button>

          {stepAuth === "loggedIn" ? (
            <div className="flex items-center gap-2">
              {/* Creator Mode / Watcher Mode Toggle switcher */}
              <button
                onClick={() => {
                  setIsCreatorMode(!isCreatorMode);
                  setCurrentVideo(null); // idle player
                }}
                className={`text-[10px] font-bold px-2 py-1 border rounded-lg transition duration-200 cursor-pointer flex items-center gap-1 uppercase ${isCreatorMode ? "bg-rose-950 border-rose-600 text-rose-300" : "bg-purple-950 border-purple-800 text-purple-300"}`}
                id="toggle-creator-watcher"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{isCreatorMode ? "Creator view" : "Watcher view"}</span>
              </button>

              {/* Avatar Trigger click to profile */}
              <button
                onClick={() => { setActiveTab("profile"); setCurrentVideo(null); }}
                className="w-8 h-8 rounded-full overflow-hidden bg-purple-700 border border-purple-400 cursor-pointer shadow"
                id="header-user-profile-trigger"
              >
                <img src={currUser?.avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e)=>{(e.target as any).src="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40"}} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {}}
              className="bg-purple-600 text-white font-bold text-xs p-1 px-3 rounded-xl flex items-center gap-1 pointer-events-none"
              id="header-sign-in-btn"
            >
              <LogIn className="w-4 h-4" /> Guest Access
            </button>
          )}

        </div>
      </header>

      {/* 2. BODY CONTENT ROUTER SWITCHBOARD */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 z-10 relative">
        <AnimatePresence mode="wait">
          
          {/* USER NOT REGISTERED -> AUTH BOARD */}
          {stepAuth === "loggedOut" && (
            <motion.div
              key="auth-email-pass"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-md mx-auto my-12 bg-[#121214] border border-white/10 p-8 rounded-3xl shadow-2xl relative"
            >
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 p-3.5 bg-purple-600 rounded-full border-2 border-purple-400 shadow-xl">
                <Coffee className="w-6 h-6 text-white" />
              </div>

              <div className="text-center mt-4">
                <h2 className="text-lg font-black text-white">Join Midyeah Platform</h2>
                <p className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold mt-0.5">Please register your account safely</p>
              </div>

              <form onSubmit={handleRequestAuthCode} className="space-y-4 text-xs mt-6">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 uppercase text-[10px]">Your Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. mdv@futureamazing.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition"
                    id="auth-email-input"
                  />
                </div>

                <div>
                  <label className="block text-purple-400 font-semibold mb-1 uppercase text-[10px]">Secure Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition"
                    id="auth-password-input"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold p-3 rounded-xl cursor-pointer shadow transition"
                  id="auth-request-code-btn"
                >
                  Send 7-Digit Registration Code 📬
                </button>
              </form>

              <div className="mt-4 text-center border-t border-purple-950 pt-3">
                <span className="text-[9px] text-gray-400 font-medium">Midyeah checks your credential security • God Bless</span>
              </div>
            </motion.div>
          )}

          {/* AUTH CODE VERIFICATION FIELD */}
          {stepAuth === "inputCode" && (
            <motion.div
              key="auth-enter-code"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-w-sm mx-auto my-12 bg-[#121214] border border-white/10 p-8 rounded-3xl shadow-2xl text-center"
            >
              <div className="text-3xl animate-bounce">📬</div>
              <h3 className="text-sm font-bold text-white mt-2">Enter 7-Digit Confirmation Code</h3>
              <p className="text-[10px] text-purple-400 mt-1">We sent a verification code to {emailInput}. Enter it below immediately.</p>

              <form onSubmit={verifyRegisteredCode} className="space-y-4 mt-4">
                <input
                  type="text"
                  required
                  maxLength={7}
                  placeholder="e.g. 7771234"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full bg-purple-950/40 border-2 border-purple-500 text-center font-mono font-black text-lg p-2 rounded-xl text-purple-300 tracking-widest outline-none"
                  id="verification-code-input"
                />
                
                <p className="text-[10px] text-gray-400">Simulation Hint: Copy code tag <b>{authCodeSent}</b> to proceed!</p>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-2.5 rounded-xl cursor-pointer transition shadow"
                  id="verify-reg-code-btn"
                >
                  Verify and Join Platform ☕
                </button>
              </form>
            </motion.div>
          )}

          {/* ACTIVE LOGGED-IN SYSTEM VIEWBOARDS */}
          {stepAuth === "loggedIn" && (
            <motion.div
              key="main-boards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              
              {/* Creator Mode Dashboard view */}
              {isCreatorMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                  
                  {/* Left video uploads setup form */}
                  <div className="lg:col-span-2 bg-[#121214] border border-white/10 p-6 rounded-2xl shadow-xl flex flex-col gap-4">
                    <div className="border-b border-purple-950 pb-2">
                      <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                        <Upload className="w-5 h-5 text-purple-400" />
                        <span>UPLOAD NEW CREATIVE VIDEO</span>
                      </h2>
                      <p className="text-[10px] text-purple-300">Supports playbacks of MP4, WebM, AVI, FLV, and SWF file wrappers.</p>
                    </div>

                    <form onSubmit={handleVideoUploadSubmit} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1 uppercase text-[10px]">Showcase Video Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. My Cozy Vtuber Gameplay 🐰☕"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 font-semibold transition"
                            id="upload-vid-title"
                          />
                        </div>

                        <div>
                          <label className="block text-[#ccaaff] font-semibold mb-1 uppercase text-[10px]">SELECT FILE (MP4, WEBM, AVI, FLV, SWF)</label>
                          <input
                            type="file"
                            required
                            accept="video/*"
                            onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                            className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 cursor-pointer text-purple-300 font-semibold focus:border-purple-500 transition"
                            id="upload-vid-file"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-gray-300 font-semibold mb-1 uppercase text-[10px]">Video Category Type</label>
                          <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value as any)}
                            className="w-full bg-[#1e172a] border border-purple-900 /60 text-purple-300 rounded-xl p-2 outline-none"
                            id="upload-vid-category"
                          >
                            <option value="normal">🎥 Standard Normal Upload</option>
                            <option value="movie">🎬 Long-Format Cinema Movie</option>
                            <option value="rental">📽️ Rent Exclusive Release</option>
                          </select>
                        </div>

                        {uploadCategory === "rental" && (
                          <>
                            <div>
                              <label className="block text-gray-300 font-semibold mb-1 uppercase text-[10px]">RENT PRICE (Min 3$ or 150 Php)</label>
                              <input
                                type="number"
                                min={3}
                                max={100}
                                value={uploadRentalPrice}
                                onChange={(e) => setUploadRentalPrice(parseInt(e.target.value))}
                                className="w-full bg-[#1e172a] border border-purple-900/60 text-white rounded-xl p-2 outline-none font-bold"
                                id="upload-vid-rent-price"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-300 font-semibold mb-1 uppercase text-[10px]">Rental Duration Period</label>
                              <select
                                value={uploadRentalPeriod}
                                onChange={(e) => setUploadRentalPeriod(e.target.value)}
                                className="w-full bg-[#1e172a] border border-purple-900/60 text-purple-300 rounded-xl p-2 outline-none"
                                id="upload-vid-rent-period"
                              >
                                <option value="month">per month</option>
                                <option value="year">per year</option>
                              </select>
                            </div>
                          </>
                        )}

                        <div className={uploadCategory !== "rental" ? "sm:col-span-2 text-left py-2" : "text-left py-2"}>
                          <label className="flex items-center gap-1.5 font-semibold text-gray-300 cursor-pointer mt-3">
                            <input
                              type="checkbox"
                              checked={uploadIs360}
                              onChange={(e) => setUploadIs360(e.target.checked)}
                              className="accent-purple-500 rounded"
                              id="upload-vid-is-360"
                            />
                            <span>360° Immersive VR Video Playback</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1 uppercase text-[10px]">Video Description text</label>
                        <textarea
                          rows={3}
                          placeholder="Provide details about your content journey..."
                          value={uploadDesc}
                          onChange={(e) => setUploadDesc(e.target.value)}
                          className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3.5 text-gray-200 outline-none focus:border-purple-500 transition whitespace-pre-wrap"
                          id="upload-vid-desc"
                        />
                      </div>

                      <div className="pt-2 border-t border-purple-950 flex justify-end">
                        <button
                          type="submit"
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-xl transition duration-200 cursor-pointer"
                          id="submit-video-upload-btn"
                        >
                          Submit Content Release
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Right creator stream console key */}
                  <div className="space-y-4">
                    <Livestream />
                  </div>

                </div>
              ) : (
                /* Watcher Mode dashboard tabs */
                <div className="space-y-6">
                  
                  {activeTab === "home" && (
                    <div className="space-y-6 animate-fade-in">
                      
                      {/* Active Player Row (rendered above list if play icon clicked) */}
                      {currentVideo ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Rich Player node */}
                          <div className="lg:col-span-2">
                            <VideoPlayer
                              video={currentVideo}
                              onDownload={handleDownloadVideo}
                              isDownloaded={downloadedIds.includes(currentVideo.id)}
                            />
                          </div>

                          {/* Companion games launcher widget beside player */}
                          <div className="space-y-4">
                            <Games />
                            
                            <div className="bg-[#121214] border border-white/10 p-5 rounded-2xl shadow-xl text-xs select-none">
                              <h3 className="font-bold text-white uppercase text-[10px] tracking-wide mb-1 flex items-center gap-1.5 text-purple-400">
                                🛸 PICTURE IN PICTURE BROADCASTER
                              </h3>
                              <p className="text-slate-300 leading-relaxed">
                                Feel free to scroll down to explore more movies or play casual retro games! The PiP overlay falling window keeps synchronizing background play smoothly.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Welcome Showcase Banner */
                        <div className="bg-gradient-to-br from-[#1C1C1F] via-[#121214] to-black border border-white/10 rounded-3xl p-6 relative overflow-hidden select-none">
                          <div className="absolute right-6 top-1/2 transform -translate-y-1/2 text-8xl opacity-[0.03]">🐰</div>
                          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                            <span>Welcome to Midyeah Platform Room!</span>
                            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                          </h2>
                          <p className="text-xs text-slate-300 max-w-lg mt-1.5 leading-relaxed">
                            Discover cinematic streams, listen to retro online frequency radios, generate RTMP livestream keys, or connect public watchrooms immediately!
                          </p>
                          
                          <div className="mt-4 flex items-center gap-3">
                            <a
                              href="https://www.youtube.com/@UsagyuunVtuber"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-rose-400 bg-rose-950/30 border border-rose-900/60 p-2 px-4 rounded-xl hover:bg-rose-950/50 transition flex items-center gap-1.5 cursor-pointer"
                              id="home-subscribe-usagyuun"
                            >
                              🔔 Subscribe to Owner's YT Account
                            </a>
                            <button
                              onClick={() => setShowTutorial(true)}
                              className="text-xs font-bold text-purple-300 hover:underline cursor-pointer"
                              id="trigger-guide-tutorial"
                            >
                              Show Tutorial Walkthrough 📖
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Filter category strip & sorting controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-purple-950/60 pb-3 gap-3">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <button
                            onClick={() => setCategoryFilter("all")}
                            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${categoryFilter === "all" ? "bg-purple-600 text-white shadow" : "bg-purple-950/40 border border-purple-900/40 text-purple-300"}`}
                            id="filter-cat-all"
                          >
                            All Releases
                          </button>
                          <button
                            onClick={() => setCategoryFilter("movie")}
                            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${categoryFilter === "movie" ? "bg-purple-600 text-white shadow" : "bg-purple-950/40 border border-purple-900/40 text-purple-300"}`}
                            id="filter-cat-movies"
                          >
                            🎬 Cinema Movies
                          </button>
                          <button
                            onClick={() => setCategoryFilter("rental")}
                            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${categoryFilter === "rental" ? "bg-purple-600 text-white shadow" : "bg-purple-950/40 border border-purple-900/40 text-purple-300"}`}
                            id="filter-cat-rentals"
                          >
                            📽️ Premium Rentals (min 3$)
                          </button>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-gray-400">
                          <span>Sort by:</span>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-purple-950/50 border border-purple-900/60 text-purple-300 rounded-lg p-1 px-2.5 outline-none font-semibold cursor-pointer"
                            id="sort-videos-selector"
                          >
                            <option value="date">📅 Release Time first</option>
                            <option value="alphabet">🔤 Alphabet title first</option>
                          </select>
                        </div>
                      </div>

                      {/* Video catalogs list loop */}
                      {getFilteredVideosList().length === 0 ? (
                        <div className="text-center py-12 bg-purple-950/5 border border-purple-950 rounded-2xl select-none">
                          <div className="text-4xl">🐰☕</div>
                          <h3 className="font-bold text-sm text-white mt-3">There are no videos uploaded yet!</h3>
                          <p className="text-[10px] text-purple-300 mt-1 max-w-sm mx-auto leading-relaxed">
                            {offlineMode
                              ? "You are currently playing in Offline viewing mode. Go back online and click save on release items to cache them local!"
                              : "Midyeah starts clean with no streams. Toggle 'Creator view' on the top right header to upload and persist your first MP4!"}
                          </p>
                          {!offlineMode && (
                            <button
                              onClick={() => setIsCreatorMode(true)}
                              className="mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs p-2 px-4 rounded-xl transition duration-200 cursor-pointer shadow"
                              id="empty-home-upload-trigger"
                            >
                              Upload First Video Now
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {getFilteredVideosList().map((vid) => (
                            <div
                              key={vid.id}
                              onClick={() => { setCurrentVideo(vid); window.scrollTo({ top: 120, behavior: "smooth" }); }}
                              className="bg-[#121214] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer hover:border-purple-500/30 transition duration-250 shadow-md hover:shadow-xl hover:-translate-y-0.5 flex flex-col justify-between"
                            >
                              {/* Video thumbnail cover visual */}
                              <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                                {vid.category === "rental" ? (
                                  <span className="absolute top-2 left-2 bg-amber-600/95 font-bold text-[9px] text-amber-50 rounded px-1.5 py-0.5 shadow-md z-10 uppercase tracking-wider">
                                    Rental ${vid.rentalPrice}
                                  </span>
                                ) : vid.category === "movie" ? (
                                  <span className="absolute top-2 left-2 bg-blue-600/95 font-bold text-[9px] text-blue-50 rounded px-1.5 py-0.5 shadow-md z-10 uppercase tracking-wider">
                                    Cinema Movie
                                  </span>
                                ) : null}

                                {vid.is360 && (
                                  <span className="absolute top-2 right-2 bg-purple-600/95 font-bold text-[9px] text-white rounded px-1.5 py-0.5 shadow-md z-10">
                                    360° VR
                                  </span>
                                )}

                                {/* Animated play visual overlay */}
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-purple-950/20 transition duration-300 flex items-center justify-center">
                                  <div className="h-10 w-10 bg-purple-600/90 rounded-full flex items-center justify-center border border-purple-400 group-hover:scale-110 transition duration-350 shadow-lg">
                                    <span className="text-white text-xs pl-0.5">▶</span>
                                  </div>
                                </div>
                                <div className="w-full h-full bg-[#1C1C1F] border-b border-white/5"></div>
                              </div>

                              {/* Title description details */}
                              <div className="p-3">
                                <h3 className="font-bold text-xs text-gray-100 line-clamp-1 group-hover:text-purple-300 transition shrink-0">
                                  {vid.title}
                                </h3>
                                <p className="text-[10px] text-purple-400 font-semibold uppercase">
                                  {vid.creator?.channelName}
                                </p>
                                <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1">
                                  <span>{vid.uploadDate}</span>
                                  {vid.isOffline && <span className="text-emerald-400 font-semibold uppercase">Downloaded Offline</span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  )}

                  {activeTab === "rooms" && <WatchRoom />}

                  {activeTab === "radio" && <RadioPlayer />}

                  {activeTab === "community" && <DiscordChat />}

                  {activeTab === "profile" && currUser && (
                    <Profile profile={currUser} onUpdate={handleProfileUpdate} />
                  )}

                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 3. HARDWARE CONSOLE HANDHELD CONTROLLER STYLE SHEETS */}
      {stepAuth === "loggedIn" && (
        <div className="sticky bottom-0 z-30 bg-[#121214] border-t border-white/10 py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          
          {/* Brand branding key triggers toggle */}
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Console Button Brand layout:</span>
            <div className="flex bg-purple-950/30 p-0.5 rounded-xl border border-purple-900/60 text-[10px]">
              <button
                onClick={() => setConsoleBrandInput("touch")}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${consoleBrandInput === "touch" ? "bg-purple-600 text-white" : "text-gray-400"}`}
                id="brand-touch-toggle"
              >
                Touch Control
              </button>
              <button
                onClick={() => setConsoleBrandInput("xbox")}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${consoleBrandInput === "xbox" ? "bg-green-600 text-white" : "text-gray-400"}`}
                id="brand-xbox-toggle"
              >
                Xbox
              </button>
              <button
                onClick={() => setConsoleBrandInput("playstation")}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${consoleBrandInput === "playstation" ? "bg-blue-600 text-white" : "text-gray-400"}`}
                id="brand-playstation-toggle"
              >
                PlayStation
              </button>
              <button
                onClick={() => setConsoleBrandInput("switch")}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${consoleBrandInput === "switch" ? "bg-red-650 text-white" : "text-gray-400"}`}
                id="brand-switch-toggle"
              >
                Nintendo
              </button>
            </div>
          </div>

          {/* Render console layout layout details overlay wrapper */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl border ${brandButtons[consoleBrandInput].stroke} bg-purple-950/10 ${brandButtons[consoleBrandInput].shadow} text-[9px] flex items-center gap-1.5`}>
              <span className="font-extrabold text-white uppercase">{brandButtons[consoleBrandInput].tag} Mappings:</span>
              
              {consoleBrandInput === "xbox" && (
                <span className="text-gray-300 tracking-wide font-mono"><b>[A]</b> Play • <b>[B]</b> Back • <b>[X]</b> Loop • <b>[Y]</b> Cinema Mode</span>
              )}

              {consoleBrandInput === "playstation" && (
                <span className="text-gray-300 tracking-wide font-mono"><b>[✖]</b> Play • <b>[▘]</b> Stop • <b>[▲]</b> Autoplay • <b>[●]</b> Exit</span>
              )}

              {consoleBrandInput === "switch" && (
                <span className="text-gray-300 tracking-wide font-mono"><b>[A]</b> Playback • <b>[B]</b> Mute • <b>[X]</b> Restart • <b>[Y]</b> Subtitles</span>
              )}

              {consoleBrandInput === "touch" && (
                <span className="text-gray-200">Fully compatible with responsive touch screen dragging gestures.</span>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 4. MASCOT SYSTEM CORNER INTEGRATIONS */}
      {stepAuth === "loggedIn" && (
        <Mascot
          showTutorialInitially={showTutorial}
          onCloseTutorial={() => setShowTutorial(false)}
        />
      )}

      {/* Onboarding Presentation Dialog */}
      <AnimatePresence>
        {showTutorial && (
          <Onboarding
            onComplete={() => {
              setShowTutorial(false);
              setStepAuth("loggedIn");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
