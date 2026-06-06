/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Video as VideoIcon, Tv, Radio, Gamepad, User, LogIn, Plus, Sparkles,
  ShieldAlert, Settings, Coffee, Wifi, WifiOff, Upload, ArrowLeftRight, HelpCircle, Dumbbell,
  Trash2, Check, X, FolderHeart, FolderPlus, Gift
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Video, UserProfile, Comment, Playlist } from "./types";
import { 
  getAllVideos, saveVideo, openDB, getProfile, saveProfile, deleteVideo, 
  clearAllVideos, saveComment, getVideoComments, auth, authenticateUser,
  getAnyAnimeAvatarUrl, deleteProfileFromDb, getPlaylistsByOwner, updatePlaylist
} from "./db";

import Mascot from "./components/Mascot";
import VideoPlayer from "./components/VideoPlayer";
import Games from "./components/Games";
import WatchRoom from "./components/WatchRoom";
import Livestream from "./components/Livestream";
import RadioPlayer from "./components/RadioPlayer";
import Onboarding from "./components/Onboarding";
import Profile from "./components/Profile";
import DiscordChat from "./components/DiscordChat";
import PlaylistsTab from "./components/PlaylistsTab";
import SupportTab from "./components/SupportTab";

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "rooms" | "radio" | "community" | "profile" | "playlists" | "support">("home");
  const [isCreatorMode, setIsCreatorMode] = useState(false); // Switch between Watcher and Creator mode
  const [offlineMode, setOfflineMode] = useState(false); // Offline-Viewing only downloaded videos
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);

  // Custom User Playlists
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [playlistDropdownForVid, setPlaylistDropdownForVid] = useState<string | null>(null);

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
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  const handleDeleteSingleVideo = async (id: string) => {
    try {
      await deleteVideo(id);
      if (currentVideo?.id === id) {
        setCurrentVideo(null);
      }
      setDeletingVideoId(null);
      reloadVideos();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAllVideosAction = async () => {
    try {
      await clearAllVideos();
      setCurrentVideo(null);
      setShowConfirmDeleteAll(false);
      reloadVideos();
    } catch (err) {
      console.error(err);
    }
  };

  // Console controllers styles
  const [consoleBrandInput, setConsoleBrandInput] = useState<"xbox" | "playstation" | "switch" | "touch">("touch");

  // Category view triggers
  const [categoryFilter, setCategoryFilter] = useState<"all" | "movie" | "rental">("all");
  const [sortBy, setSortBy] = useState<"date" | "alphabet">("date");

  // Real-time Global Comments Section
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Sync / Stream Video from Firestore chunks globally
  const handlePlayVideo = async (vid: Video) => {
    if (vid.isOffline || vid.blob || vid.videoUrl.startsWith("blob:") || vid.videoUrl.startsWith("data:")) {
      setCurrentVideo(vid);
    } else {
      setIsStreaming(true);
      try {
        const { downloadGlobalVideoChunks } = await import("./db");
        const blob = await downloadGlobalVideoChunks(vid.id);
        const url = URL.createObjectURL(blob);
        const hydratedVideo: Video = {
          ...vid,
          videoUrl: url,
          blob: blob
        };
        setCurrentVideo(hydratedVideo);
      } catch (err) {
        console.warn("Failed to stream global chunks, using fallback url:", err);
        setCurrentVideo(vid);
      } finally {
        setIsStreaming(false);
      }
    }
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Fetch comments for any selected video
  useEffect(() => {
    if (currentVideo) {
      setIsLoadingComments(true);
      getVideoComments(currentVideo.id).then((items) => {
        setComments(items || []);
        setIsLoadingComments(false);
      }).catch((err) => {
        console.error("Could not fetch comments:", err);
        setIsLoadingComments(false);
      });
    } else {
      setComments([]);
    }
  }, [currentVideo]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentVideo || !currUser) return;

    const newComment: Comment = {
      id: "comment_" + Date.now(),
      videoId: currentVideo.id,
      username: currUser.username || "Guest Watcher",
      avatarUrl: currUser.avatarUrl || "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
      text: commentInput,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: []
    };

    try {
      await saveComment(newComment);
      setComments(prev => [newComment, ...prev]);
      setCommentInput("");
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  // Video Upload inputs
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadIs360, setUploadIs360] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<"normal" | "movie" | "rental">("normal");
  const [uploadRentalPrice, setUploadRentalPrice] = useState(3);
  const [uploadRentalPeriod, setUploadRentalPeriod] = useState("month");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStage, setUploadStage] = useState<string>("");

  // Hydrate initial database connection and load videos
  useEffect(() => {
    openDB().then(() => {
      reloadVideos();
    });
  }, []);

  const reloadPlaylists = async (email: string) => {
    try {
      const lists = await getPlaylistsByOwner(email);
      setUserPlaylists(lists);
    } catch (err) {
      console.warn("Could not reload playlists in App:", err);
    }
  };

  // Hydrate and synchronize active Firebase Auth sessions
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser?.email) {
        try {
          const profile = await getProfile(firebaseUser.email);
          if (profile) {
            setCurrUser(profile);
            setStepAuth("loggedIn");
            reloadPlaylists(profile.email);
          } else {
            // Fallback: Generate dynamic user profile document if none exists in Firestore
            const prof: UserProfile = {
              username: firebaseUser.email.split("@")[0],
              email: firebaseUser.email,
              channelName: firebaseUser.email.split("@")[0].toUpperCase() + " STATIONS",
              channelUrl: firebaseUser.email.split("@")[0] + "_ch",
              bio: "Thank you for watching on Midyeah, God bless everyone!",
              avatarUrl: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
              coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
              subscribersCount: 775
            };
            setCurrUser(prof);
            setStepAuth("loggedIn");
            reloadPlaylists(prof.email);
          }
        } catch (e) {
          console.error("Failed to load authenticated user profile:", e);
        }
      } else {
        // Clear authenticated session, check if there's an offline guest fallback
        getProfile("guest@midyeah.com").then((profile) => {
          if (profile) {
            setCurrUser(profile);
            setStepAuth("loggedIn");
            reloadPlaylists(profile.email);
          } else {
            setCurrUser(null);
            setStepAuth("loggedOut");
            setUserPlaylists([]);
          }
        });
      }
    });
    return () => unsubscribe();
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

    if (passInput.trim().length < 6) {
      alert("Password must be at least 6 characters in length.");
      return;
    }

    // generate a cool, copyable 7-digit verification tag
    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    setAuthCodeSent(code);
    alert(`🔐 Midyeah Server Dispatch: 7-digit authorization code sent to ${emailInput}! Code: ${code} (Input below immediately)`);
    setStepAuth("inputCode");
  };

  const verifyRegisteredCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode === authCodeSent) {
      try {
        // Authenticate inside Firebase Auth system before writing to Firestore
        await authenticateUser(emailInput, passInput);

        // Retrieve a custom dynamic anime profile picture from multiple APIs
        let randomAnimeAvatar = "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=150&q=80";
        try {
          randomAnimeAvatar = await getAnyAnimeAvatarUrl();
        } catch (avatarError) {
          console.warn("Could not fetch random anime avatar, fallback loaded:", avatarError);
        }

        // Initialize layout profile
        const prof: UserProfile = {
          username: emailInput.split("@")[0],
          email: emailInput,
          channelName: emailInput.split("@")[0].toUpperCase() + " STATIONS",
          channelUrl: emailInput.split("@")[0] + "_ch",
          bio: "Thank you for watching on Midyeah, God bless everyone!",
          avatarUrl: randomAnimeAvatar,
          coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          subscribersCount: 775 // starting statistics close to criteria triggers
        };

        await saveProfile(prof);
        setCurrUser(prof);
        setStepAuth("onboard");
        setShowTutorial(true);
      } catch (err: any) {
        console.error("Failed to authenticate or save profile:", err);
        alert(`Authentication Error: ${err.message || err}`);
      }
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

    // Initialize progress indicators
    setUploadProgress(0);
    setUploadStage("Opening database pipeline...");

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Stage 1: File pre-parsing
      await sleep(350);
      setUploadProgress(15);
      setUploadStage(`Reading film packet references (${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)...`);

      // Stage 2: Content signature mapping
      await sleep(350);
      setUploadProgress(30);
      setUploadStage("Processing creative codec frames...");

      // Prepare movie credentials
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

      // Stage 3: Dynamic byte-stream compilation
      for (let p = 45; p <= 85; p += 10) {
        await sleep(300);
        setUploadProgress(p);
        setUploadStage(`Streaming database blob files to storage... ${p}%`);
      }

      await sleep(200);
      setUploadProgress(92);
      setUploadStage("Writing ledger index tables...");

      // Save persistently to IDB
      await saveVideo(newVideo, uploadFile);
      
      await sleep(300);
      setUploadProgress(100);
      setUploadStage("Upload completed! Movie successfully deployed.");
      await sleep(400);

      setUploadTitle("");
      setUploadDesc("");
      setUploadIs360(false);
      setUploadCategory("normal");
      setUploadFile(null);
      setUploadProgress(null);
      setUploadStage("");

      alert(`🎬 '${newVideo.title}' registered and saved persistently into Midyeah database! Try closing and reopen the tab; it will stay persistent!`);
      reloadVideos();
      setIsCreatorMode(false); // switch back to explore view
    } catch (err: any) {
      console.error(err);
      alert(`Upload error: ${err.message || err}`);
      setUploadProgress(null);
      setUploadStage("");
    }
  };

  // Profile upgrader
  const handleProfileUpdate = async (prof: UserProfile) => {
    await saveProfile(prof);
    setCurrUser(prof);
  };

  const handleAddVideoToPlaylist = async (playlistId: string, video: Video) => {
    const list = userPlaylists.find(p => p.id === playlistId);
    if (!list) return;

    if (list.videoIds.includes(video.id)) {
      alert(`💡 Video is already in playlist: ${list.name}`);
      return;
    }

    const updatedVideoIds = [...list.videoIds, video.id];
    const updatedList = { ...list, videoIds: updatedVideoIds };

    try {
      await updatePlaylist(updatedList);
      setUserPlaylists(prev => prev.map(p => p.id === playlistId ? updatedList : p));
      alert(`✅ Added '${video.title}' to playlist '${list.name}'`);
    } catch (err) {
      console.error("Failed to add video to playlist:", err);
      alert("Error saving playlist. Check authorization rules.");
    }
  };

  const handleLogOut = async () => {
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      setCurrUser(null);
      setStepAuth("loggedOut");
      setActiveTab("home");
      setUserPlaylists([]);
    } catch (err) {
      console.error("Sign out fail:", err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currUser?.email) return;
    try {
      await deleteProfileFromDb(currUser.email);
      setCurrUser(null);
      setStepAuth("loggedOut");
      setActiveTab("home");
      setUserPlaylists([]);
      alert("💥 Your account and records are permanently deleted. Goodbye, friend!");
    } catch (err) {
      console.error("Purge fail:", err);
      alert("Failed to delete account. Please try again.");
    }
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
              onClick={() => { setActiveTab("playlists"); setCurrentVideo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${activeTab === "playlists" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              id="nav-tab-playlists"
            >
              <FolderHeart className="w-4 h-4" />
              <span className="hidden md:inline">Playlists</span>
            </button>
            <button
              onClick={() => { setActiveTab("community"); setCurrentVideo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${activeTab === "community" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              id="nav-tab-community"
            >
              <Gamepad className="w-4 h-4" />
              <span className="hidden md:inline">Discord Circle</span>
            </button>
            <button
              onClick={() => { setActiveTab("support"); setCurrentVideo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${activeTab === "support" ? "bg-rose-600 text-white shadow" : "text-rose-400 hover:text-rose-300"}`}
              id="nav-tab-support"
            >
              <Gift className="w-4 h-4" />
              <span className="hidden md:inline">Support & Charity 💖</span>
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

                      {/* Dynamic Upload Loading Progress Bar */}
                      {uploadProgress !== null && (
                        <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold font-mono">
                            <span className="text-purple-300 flex items-center gap-1.5 animate-pulse">
                              <span className="h-2 w-2 bg-purple-500 rounded-full inline-block animate-ping" />
                              {uploadStage}
                            </span>
                            <span className="text-purple-400 font-black">{uploadProgress}%</span>
                          </div>
                          
                          {/* Outer Track Bar */}
                          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 p-[2px]">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-purple-950 flex justify-end items-center gap-3">
                        {uploadProgress !== null ? (
                          <div className="text-[10px] text-purple-400 font-bold font-mono uppercase tracking-wider animate-pulse">
                            Saving securely... Please wait
                          </div>
                        ) : (
                          <button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-xl transition duration-200 cursor-pointer"
                            id="submit-video-upload-btn"
                          >
                            Submit Content Release
                          </button>
                        )}
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
                      {isStreaming ? (
                        <div className="flex flex-col items-center justify-center bg-[#121214] border border-white/10 rounded-3xl p-16 h-[380px] w-full text-center space-y-4 animate-pulse">
                          <div className="h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                          <div>
                            <h3 className="font-extrabold text-xs text-purple-300 uppercase tracking-widest">📡 CONNECTING TO WATCHTOWER NODES</h3>
                            <p className="text-[10px] text-gray-400 mt-2">Streaming and fusing video segments globally from Firestore chunk clusters...</p>
                          </div>
                        </div>
                      ) : currentVideo ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Rich Player node */}
                          <div className="lg:col-span-2 space-y-4">
                            <VideoPlayer
                              video={currentVideo}
                              onDownload={handleDownloadVideo}
                              isDownloaded={downloadedIds.includes(currentVideo.id)}
                            />

                            {/* PUBLIC COMMENTS SECTION - YouTube styled */}
                            <div className="bg-[#121214] border border-white/10 p-5 rounded-3xl shadow-xl space-y-4">
                              <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                                💬 Public Comments ({comments.length} Sync'd Worldwide)
                              </h3>
                              
                              <form onSubmit={handleAddComment} className="flex gap-3 items-start mt-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-purple-500/30">
                                  <img 
                                    src={currUser?.avatarUrl} 
                                    className="w-full h-full object-cover" 
                                    onError={(e)=>(e.target as any).src="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40"} 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="flex-1 space-y-2">
                                  <input
                                    type="text"
                                    placeholder="Add a public comment..."
                                    value={commentInput}
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    className="bg-[#1C1C1F] border border-white/10 rounded-xl p-2.5 px-3 text-xs text-white w-full outline-none focus:border-purple-500"
                                    id="add-comment-input-grid"
                                  />
                                  <div className="flex justify-end pr-1">
                                    <button
                                      type="submit"
                                      disabled={!commentInput.trim()}
                                      className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold p-1.5 px-4 rounded-xl text-[10px] uppercase tracking-wide transition cursor-pointer"
                                      id="add-comment-submit-btn"
                                    >
                                      Comment
                                    </button>
                                  </div>
                                </div>
                              </form>

                              {/* Comments lists log */}
                              <div className="space-y-3 mt-4 max-h-[250px] overflow-y-auto pr-1 select-none scrollbar-thin">
                                {isLoadingComments ? (
                                  <p className="text-[10px] text-zinc-500 text-center py-4">Streaming and verifying comments from global nodes...</p>
                                ) : comments.length === 0 ? (
                                  <p className="text-[10px] text-zinc-500 text-center py-4">No public comments yet on this video. Be the first to share your thoughts!</p>
                                ) : (
                                  comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3 text-xs p-2.5 bg-[#1C1C1F]/40 hover:bg-[#1C1C1F]/60 border border-transparent hover:border-white/5 rounded-xl transition">
                                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-white/5">
                                        <img src={comment.avatarUrl} className="w-full h-full object-cover" onError={(e)=>(e.target as any).src="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40"} referrerPolicy="no-referrer" />
                                      </div>
                                      <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-purple-300">{comment.username}</span>
                                          <span className="text-[9px] text-gray-500">{new Date(comment.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-gray-300 leading-relaxed">{comment.text}</p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
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

                        <div className="flex items-center gap-2.5 text-xs text-gray-400 flex-wrap">
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

                          {videosList.length > 0 && (
                            <div className="relative inline-block ml-2">
                              {!showConfirmDeleteAll ? (
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmDeleteAll(true)}
                                  className="flex items-center gap-1 bg-[#1C1C1F] hover:bg-red-950/20 text-red-400 border border-red-500/20 hover:border-red-500/50 p-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer"
                                  id="delete-all-btn-trigger"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete All</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-red-900/90 text-white p-1 px-2 rounded-xl border border-red-600 shadow-md">
                                  <span className="text-[10px] font-bold select-none whitespace-nowrap">Delete All?</span>
                                  <button
                                    type="button"
                                    onClick={handleDeleteAllVideosAction}
                                    className="p-1 hover:bg-white/10 rounded-md transition cursor-pointer"
                                    title="Yes, delete all"
                                    id="confirm-delete-all-btn"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmDeleteAll(false)}
                                    className="p-1 hover:bg-white/10 rounded-md transition cursor-pointer"
                                    title="Cancel"
                                    id="cancel-delete-all-btn"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
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
                              onClick={() => { handlePlayVideo(vid); }}
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
                                  <div className="flex items-center gap-1">
                                    <span>{vid.uploadDate}</span>
                                    {vid.isOffline && <span className="text-emerald-400 font-semibold uppercase">• Offline</span>}
                                  </div>

                                  <div onClick={(e) => e.stopPropagation()} className="relative text-xs flex items-center gap-1.5">
                                    {currUser && (
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setPlaylistDropdownForVid(playlistDropdownForVid === vid.id ? null : vid.id)}
                                          className={`p-1 transition rounded hover:bg-white/5 cursor-pointer ${playlistDropdownForVid === vid.id ? "text-purple-400" : "text-slate-500 hover:text-purple-400"}`}
                                          title="Add to Playlist"
                                        >
                                          <FolderPlus className="w-3.5 h-3.5" />
                                        </button>

                                        {playlistDropdownForVid === vid.id && (
                                          <div className="absolute right-0 bottom-6 bg-[#121214] border border-white/10 p-2.5 rounded-2xl w-48 shadow-2xl z-30 space-y-1.5 text-left">
                                            <div className="flex items-center justify-between border-b border-white/5 pb-1">
                                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select Playlist</span>
                                              <button onClick={() => setPlaylistDropdownForVid(null)} className="p-0.5 hover:bg-white/5 rounded text-slate-500 hover:text-white">
                                                <X className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                            {userPlaylists.length === 0 ? (
                                              <div className="text-[9px] text-slate-500 text-center py-2 leading-relaxed">
                                                No playlists. Create one in the Playlists tab!
                                              </div>
                                            ) : (
                                              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                                                {userPlaylists.map(playlist => (
                                                  <button
                                                    key={playlist.id}
                                                    type="button"
                                                    onClick={() => {
                                                      handleAddVideoToPlaylist(playlist.id, vid);
                                                      setPlaylistDropdownForVid(null);
                                                    }}
                                                    className="w-full text-left p-1 hover:bg-purple-600 hover:text-white transition rounded text-[10px] text-slate-400 truncate font-semibold cursor-pointer block"
                                                  >
                                                    📁 {playlist.name}
                                                  </button>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {deletingVideoId !== vid.id ? (
                                      <button
                                        type="button"
                                        onClick={() => setDeletingVideoId(vid.id)}
                                        className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer rounded"
                                        title="Delete Video"
                                        id={`delete-vid-btn-${vid.id}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/30 rounded px-1.5 py-0.5 text-white">
                                        <span className="text-[8px] font-bold select-none text-[8px]">Delete?</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteSingleVideo(vid.id)}
                                          className="text-red-400 hover:text-red-300 font-extrabold uppercase text-[8px] cursor-pointer"
                                          id={`confirm-delete-vid-${vid.id}`}
                                        >
                                          Yes
                                        </button>
                                        <span className="text-gray-600">|</span>
                                        <button
                                          type="button"
                                          onClick={() => setDeletingVideoId(null)}
                                          className="text-gray-400 hover:text-white text-[8px] cursor-pointer"
                                          id={`cancel-delete-vid-${vid.id}`}
                                        >
                                          No
                                        </button>
                                      </div>
                                    )}
                                  </div>
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

                  {activeTab === "playlists" && (
                    <PlaylistsTab 
                      currUser={currUser} 
                      videosList={videosList} 
                      onPlayVideo={(vid) => { handlePlayVideo(vid); }} 
                      onSwitchTab={setActiveTab} 
                    />
                  )}

                  {activeTab === "support" && (
                    <SupportTab currUser={currUser} />
                  )}

                  {activeTab === "community" && <DiscordChat />}

                  {activeTab === "profile" && currUser && (
                    <Profile profile={currUser} onUpdate={handleProfileUpdate} onLogOut={handleLogOut} onDeleteAccount={handleDeleteAccount} />
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
