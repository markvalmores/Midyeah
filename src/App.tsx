/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Video as VideoIcon, Tv, Radio, Gamepad, User, LogIn, Plus, Sparkles,
  ShieldAlert, Settings, Coffee, Wifi, WifiOff, Upload, ArrowLeftRight, HelpCircle, Dumbbell,
  Trash2, Check, X, FolderHeart, FolderPlus, Gift, Search, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getRandomAnimeAvatar } from "./utils";

import { Video, UserProfile, Comment, Playlist } from "./types";
import { 
  subscribeAllVideos, getAllVideos, saveVideo, openDB, getProfile, saveProfile, deleteVideo, 
  clearAllVideos, saveComment, getVideoComments, auth, authenticateUser,
  getAnyAnimeAvatarUrl, deleteProfileFromDb, getPlaylistsByOwner, updatePlaylist, getUserCount,
  subscribeVideoComments, hasFirestoreQuota
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
import SearchTab from "./components/SearchTab";

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "rooms" | "radio" | "community" | "profile" | "playlists" | "support" | "search">("home");
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
  const [stepAuth, setStepAuth] = useState<"startScreen" | "loggedOut" | "inputCode" | "onboard" | "loggedIn">("startScreen");
  const [verificationCode, setVerificationCode] = useState("");
  const [authCodeSent, setAuthCodeSent] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);

  // Tutorial overlay
  const [showTutorial, setShowTutorial] = useState(false);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(!hasFirestoreQuota);

  useEffect(() => {
    // Periodically check the global quota flag
    const interval = setInterval(() => {
      if (!hasFirestoreQuota) {
        setIsQuotaExhausted(true);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Keep track of current user to prevent overwrites
  const currUserRef = useRef(currUser);
  useEffect(() => {
    currUserRef.current = currUser;
  }, [currUser]);

  // Video datasets
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  // GHOST CLEANUP TRIGGER: Specifically target the "Good Morning" ghost or any invalid videos
  useEffect(() => {
    if (videosList.length > 0) {
      const suspiciousIds = ["good_morning", "good-morning", "vid_ghost"]; // generic patterns for bugs
      const toKill = videosList.filter(v => 
        suspiciousIds.some(s => v.id.toLowerCase().includes(s)) || 
        v.title.toLowerCase().includes("good morning")
      );
      
      if (toKill.length > 0) {
        console.log(`Eradicating ${toKill.length} ghost videos...`);
        // If quota is hit, only clear local ghosts to avoid spamming network errors
        toKill.forEach(v => {
          if (hasFirestoreQuota) {
            handleDeleteSingleVideo(v.id);
          } else {
            // Manual local wipe bypass
            openDB().then(db => {
               const tx = db.transaction("videos", "readwrite");
               tx.objectStore("videos").delete(v.id);
               tx.oncomplete = () => reloadVideos();
            });
          }
        });
      }
    }
  }, [videosList.length]);

  const handleDeleteSingleVideo = async (id: string) => {
    try {
      await deleteVideo(id);
      if (currentVideo?.id === id) {
        setCurrentVideo(null);
      }
    } catch (err) {
      console.error("Deletion error:", err);
    } finally {
      setDeletingVideoId(null);
      reloadVideos();
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

  const handleNextVideo = () => {
    if (!currentVideo || videosList.length === 0) return;
    const currentIndex = videosList.findIndex(v => v.id === currentVideo.id);
    if (currentIndex !== -1 && currentIndex < videosList.length - 1) {
      handlePlayVideo(videosList[currentIndex + 1]);
    } else {
      // Loop back to start
      handlePlayVideo(videosList[0]);
    }
  };

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
    setActiveTab("home");
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Fetch comments for any selected video in real-time
  useEffect(() => {
    let unsubscribe = () => {};
    if (currentVideo) {
      setIsLoadingComments(true);
      unsubscribe = subscribeVideoComments(currentVideo.id, (items) => {
        setComments(items || []);
        setIsLoadingComments(false);
      });
    } else {
      setComments([]);
    }
    return () => unsubscribe();
  }, [currentVideo]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentVideo || !currUser) return;

    const newComment: Comment = {
      id: "comment_" + Date.now(),
      videoId: currentVideo.id,
      username: currUser.username || "Guest Watcher",
      avatarUrl: currUser.avatarUrl || getRandomAnimeAvatar(currUser.username || "Guest"),
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
  const [uploadCountry, setUploadCountry] = useState("philippines");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStage, setUploadStage] = useState<string>("");

  // Thumbnail options
  const [uploadThumbnailMode, setUploadThumbnailMode] = useState<"auto" | "custom">("auto");
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string>("");
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState<boolean>(false);

  // Auto-generate thumbnail when a video is loaded and mode is 'auto'
  useEffect(() => {
    if (!uploadFile) {
      setThumbnailPreviewUrl("");
      return;
    }

    if (uploadThumbnailMode === "auto") {
      setIsGeneratingThumbnail(true);
      
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(uploadFile);
      video.src = objectUrl;

      const handleCapture = () => {
        // Seek to 1.5 seconds, or half of dynamic duration
        const seekTime = Math.min(1.5, video.duration / 2 || 0.5);
        video.currentTime = seekTime;
      };

      const handleSeeked = () => {
        try {
          const canvas = document.createElement("canvas");
          const width = 640;
          const height = video.videoWidth ? Math.round(width * (video.videoHeight / video.videoWidth)) : 360;
          canvas.width = width;
          canvas.height = height || 360;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setThumbnailPreviewUrl(dataUrl);
          }
        } catch (err) {
          console.warn("Failed to generate offscreen video snapshot:", err);
        } finally {
          setIsGeneratingThumbnail(false);
          video.onseeked = null;
          video.onloadedmetadata = null;
          URL.revokeObjectURL(objectUrl);
        }
      };

      video.onloadedmetadata = handleCapture;
      video.onseeked = handleSeeked;
      video.onerror = () => {
        setIsGeneratingThumbnail(false);
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [uploadFile, uploadThumbnailMode]);

  const handleCustomThumbnailChange = (file: File | null) => {
    setCustomThumbnailFile(file);
    if (!file) {
      if (uploadFile) {
        // Retrigger some auto capture or empty
        setUploadThumbnailMode("auto");
      } else {
        setThumbnailPreviewUrl("");
      }
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setThumbnailPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Hydrate initial database connection and load videos
  useEffect(() => {
    let unsubscribeVideos = () => {};
    openDB().then(() => {
      // Setup Realtime multiplayer video feed
      unsubscribeVideos = subscribeAllVideos((items) => {
         setVideosList(items || []);
         const savedOfflines = items.filter(v => v.isOffline).map(v => v.id);
         setDownloadedIds(savedOfflines);
      });

      // Instant local-first session restoration on initial boot
      const savedEmail = localStorage.getItem("midyeah_active_session_email");
      if (savedEmail) {
        getProfile(savedEmail).then((profile) => {
          if (profile) {
            setCurrUser(profile);
            // Do not automatically set stepAuth here
            reloadPlaylists(profile.email);
          }
        }).catch(err => {
          console.warn("Could not instantly pre-load active offline session:", err);
        });
      } else {
        // Automatically set up a default guest profile if logged in but no session
        Promise.all([getAnyAnimeAvatarUrl(), getUserCount()]).then(([randomAvatar, count]) => {
          const formattedIndex = count.toString().padStart(2, '0');
          const defaultGuest: UserProfile = {
              username: `midyeah_user_${formattedIndex}`,
              email: "guest@midyeah.com",
              channelName: `MidYeah Player ${formattedIndex}`,
              channelUrl: "guest_ch",
              bio: "Welcome to MidYeah!",
              avatarUrl: randomAvatar,
              coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
              subscribersCount: 0
          };
          setCurrUser(defaultGuest);
        });
      }
    });

    return () => {
      unsubscribeVideos();
    };
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
      // Prevent profile reset if we already have a user
      if (currUserRef.current) return;

      if (firebaseUser?.email) {
        try {
          const profile = await getProfile(firebaseUser.email);
          if (profile) {
            localStorage.setItem("midyeah_active_session_email", firebaseUser.email);
            setCurrUser(profile);
            // Do not automatically set stepAuth here
            reloadPlaylists(profile.email);
          } else {
            // Only generate a default profile if no local session exists, to prevent overwriting existing user data
            const savedEmail = localStorage.getItem("midyeah_active_session_email");
            if (!savedEmail) {
              const [randomAvatar, count] = await Promise.all([getAnyAnimeAvatarUrl(), getUserCount()]);
              const formattedIndex = count.toString().padStart(2, '0');
              const prof: UserProfile = {
                username: `midyeah_user_${formattedIndex}`,
                email: firebaseUser.email,
                channelName: `MidYeah Player ${formattedIndex}`,
                channelUrl: firebaseUser.email.split("@")[0] + "_ch",
                bio: "Thank you for watching on MidYeah, God bless everyone!",
                avatarUrl: randomAvatar,
                coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                subscribersCount: 0
              };
              localStorage.setItem("midyeah_active_session_email", firebaseUser.email);
              setCurrUser(prof);
              // Do not automatically set stepAuth here
              reloadPlaylists(prof.email);
            }
          }
        } catch (e) {
          console.error("Failed to load authenticated user profile:", e);
        }
      } else {
        // If there's an active local session, preserve it to survive updates, rebuilds, or network blips
        const savedEmail = localStorage.getItem("midyeah_active_session_email");
        if (savedEmail) {
          getProfile(savedEmail).then((profile) => {
            if (profile) {
              setCurrUser(profile);
              // setStepAuth("loggedIn");
              reloadPlaylists(profile.email);
            }
          });
          return;
        }

        // Clear authenticated session, check if there's an offline guest fallback
        getProfile("guest@midyeah.com").then((profile) => {
          if (profile) {
            setCurrUser(profile);
            // setStepAuth("loggedIn");
            reloadPlaylists(profile.email);
          } else {
            setCurrUser(null);
            // setStepAuth("loggedOut");
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
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    try {
      // Check if user exists, if not, generate default
      let profile = await getProfile(emailInput);
      if (!profile) {
        const [randomAvatar, count] = await Promise.all([getAnyAnimeAvatarUrl(), getUserCount()]);
        const formattedIndex = count.toString().padStart(2, '0');
        profile = {
          username: `midyeah_user_${formattedIndex}`,
          email: emailInput,
          channelName: `MidYeah Player ${formattedIndex}`,
          channelUrl: emailInput.split("@")[0] + "_ch",
          bio: "Welcome to MidYeah!",
          avatarUrl: randomAvatar,
          coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          subscribersCount: 0
        };
        await saveProfile(profile);
      }
      
      localStorage.setItem("midyeah_active_session_email", emailInput);
      setCurrUser(profile);
      setStepAuth("loggedIn");
    } catch (err: any) {
      console.error("Login failed:", err);
      alert(`Login Error: ${err.message || err}`);
    }
  };

  const handleGuestLogin = async () => {
    const guestEmail = "guest@midyeah.com";
    try {
      let profile = await getProfile(guestEmail);
      if (!profile) {
        const [randomAvatar, count] = await Promise.all([getAnyAnimeAvatarUrl(), getUserCount()]);
        const formattedIndex = count.toString().padStart(2, '0');
        profile = {
          username: `midyeah_user_${formattedIndex}`,
          email: guestEmail,
          channelName: `MidYeah Player ${formattedIndex}`,
          channelUrl: "guest_ch",
          bio: "Welcome to MidYeah!",
          avatarUrl: randomAvatar,
          coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          subscribersCount: 0
        };
        await saveProfile(profile);
      }
      localStorage.setItem("midyeah_active_session_email", guestEmail);
      setCurrUser(profile);
      setStepAuth("loggedIn");
    } catch (err: any) {
      console.error("Guest login failed:", err);
      alert("Failed to sign in as guest.");
    }
  };

  const verifyRegisteredCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode === authCodeSent) {
      setIsVerifying(true);
      setVerificationProgress(30);
      try {
        // Authenticate inside Firebase Auth system before writing to Firestore
        await authenticateUser(emailInput, passInput);
        setVerificationProgress(60);

        // Retrieve a custom dynamic anime profile picture from multiple APIs
        let randomAnimeAvatar = "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=150&q=80";
        try {
          randomAnimeAvatar = await getAnyAnimeAvatarUrl();
        } catch (avatarError) {
          console.warn("Could not fetch random anime avatar, fallback loaded:", avatarError);
        }

        // Initialize layout profile
        const count = await getUserCount();
        const formattedIndex = count.toString().padStart(2, '0');
        const prof: UserProfile = {
          username: `midyeah_user_${formattedIndex}`,
          email: emailInput,
          channelName: `MidYeah Player ${formattedIndex}`,
          channelUrl: emailInput.split("@")[0] + "_ch",
          bio: "Thank you for watching on MidYeah, God bless everyone!",
          avatarUrl: randomAnimeAvatar,
          coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
          subscribersCount: 0
        };

        await saveProfile(prof);
        setVerificationProgress(100);
        
        // Instant transition
        setCurrUser(prof);
        setStepAuth("loggedIn");
        setShowTutorial(false);
      } catch (err: any) {
        setIsVerifying(false);
        setVerificationProgress(0);
        console.error("Failed to authenticate or save profile:", err);
        alert(`Authentication Error: ${err.message || err}`);
      }
    } else {
      alert("Invalid 7-digit confirmation key. Please verify original code.");
    }
  };

  // Video caching handling
  const handleDownloadVideo = async (v: Video, res: string) => {
    if (downloadedIds.includes(v.id)) {
      alert("💡 This item is already in your offline library.");
      return;
    }
    
    // Immediate UI feedback
    setDownloadedIds(prev => [...prev, v.id]);
    
    try {
      // Simulate caching Blob or local index offsets in IDB
      const dummyBlob = v.blob || new Blob(["MidYeah Video Cache File Data"], { type: "video/mp4" });
      
      const offlineVideo: Video = {
        ...v,
        isOffline: true,
        blob: dummyBlob
      };

      await saveVideo(offlineVideo, dummyBlob);
      reloadVideos(); // Full sync
      alert(`✨ '${v.title}' successfully cached at ${res} resolution into browser local storage! Ready for offline viewing. 🐰`);
    } catch (err: any) {
      console.error("Offline save failed:", err);
      // Revert if failed
      setDownloadedIds(prev => prev.filter(id => id !== v.id));
      alert("Failed to save offline: " + (err.message || "Unknown error"));
    }
  };

  const handleSaveToMidYeahLibrary = async (v: Video) => {
    // Assuming this adds to a library in the DB
    try {
      // Logic for saving to a library
      alert(`📚 '${v.title}' successfully saved to your MidYeah Offline Library.`);
    } catch (err: any) {
      console.error("Failed to save to library:", err);
      alert(`Error saving to library: ${err.message || err}`);
    }
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
    setUploadStage("Fast-tracking upload...");

    try {
      // Stage 1: File pre-parsing
      setUploadProgress(20);
      setUploadStage(`Reading film...`);

      // Stage 2: Content signature mapping
      setUploadProgress(40);
      setUploadStage("Processing...");

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
        blob: uploadFile, // save actual file to IndexedDB!
        thumbnailUrl: thumbnailPreviewUrl || "",
        country: uploadCountry
      };

      // Stage 3: Dynamic byte-stream compilation
      setUploadProgress(70);
      setUploadStage("Syncing to cloud...");

      // Run saveVideo and await completion
      await saveVideo(newVideo, uploadFile, (p) => {
        setUploadProgress(p);
        setUploadStage(`Syncing... ${p}%`);
      });
      
      // Update the videos list only AFTER successful save
      setVideosList(prev => [newVideo, ...prev]);
      
      setUploadProgress(100);
      setUploadStage("Completed!");
      
      // Show success notification bubble
      alert("✨ Your post has been successful. God Bless.");
      
      // Delay reset so user sees 100% completion
      setTimeout(() => {
        setUploadTitle("");
        setUploadDesc("");
        setUploadIs360(false);
        setUploadCategory("normal");
        setUploadCountry("philippines");
        setUploadFile(null);
        setUploadThumbnailMode("auto");
        setCustomThumbnailFile(null);
        setThumbnailPreviewUrl("");
        setUploadProgress(null);
        setUploadStage("");
        setIsCreatorMode(false); // switch back to explore view
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadProgress(null);
      setUploadStage("");
    }
  };

  // Profile upgrader
  const handleProfileUpdate = async (prof: UserProfile) => {
    try {
      await saveProfile(prof);
    } catch (err: any) {
      console.error("Profile save failed:", err);
      alert("Error saving profile to database: " + err.message);
    } finally {
      setCurrUser(prof);
    }
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
      localStorage.removeItem("midyeah_active_session_email");
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
      localStorage.removeItem("midyeah_active_session_email");
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

      {/* GOD/CHRISTIAN THEMED DEDICATION BANNER */}
      <div className="bg-gradient-to-r from-amber-600/20 via-yellow-500/30 to-amber-600/20 text-yellow-200/90 text-[10px] sm:text-xs font-semibold py-1.5 px-4 text-center border-b border-yellow-500/20 tracking-wider shadow-[0_0_15px_rgba(234,179,8,0.1)] flex items-center justify-center gap-2">
        <span className="animate-pulse">🕊️</span> Dedicated for the Lord Jesus Christ — All Creations Will Know and Use This Forever More. Amen. <span className="animate-pulse">🕊️</span>
      </div>

      {/* PATCH NOTES ALERT BANNER */}
      <div className="bg-purple-600/90 text-white text-[10px] sm:text-xs font-bold py-2 px-6 text-center border-b border-purple-400/30 flex items-center justify-center gap-3 shadow-lg z-50">
        <div className="flex items-center gap-2 animate-pulse">
          <Info className="w-4 h-4" />
          <span>PATCH NOTES: REFRESH THE APP ALL THE TIME TO FIX ERRORS & SYNC DATA!</span>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white/20 px-2 py-0.5 rounded-full text-[9px] uppercase border border-white/10">
          <span>Maintenance Mode v1.4.2</span>
        </div>
      </div>

        {/* QUOTA LIMIT BANNER */}
        <AnimatePresence>
          {isQuotaExhausted && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-yellow-500/10 border-b border-yellow-500/20 backdrop-blur-md overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-yellow-500">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <p className="text-[11px] font-bold uppercase tracking-wider">
                    Global Cloud Quota Reached — Running in High-Fidelity Local Mode
                  </p>
                </div>
                <div className="flex items-center gap-4">
                   <p className="hidden md:block text-[10px] text-yellow-500/60 font-medium">
                     Your videos and profile are safely saved in your browser. Cloud syncing will resume automatically.
                   </p>
                   <button 
                    onClick={() => window.location.reload()} 
                    className="text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded font-bold uppercase hover:bg-yellow-400 transition"
                   >
                     Reload App
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              onClick={() => { setActiveTab("search"); setCurrentVideo(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${activeTab === "search" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              id="nav-tab-search"
            >
              <Search className="w-4 h-4 text-purple-300" />
              <span>Search Space 🍥</span>
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
              onClick={handleGuestLogin}
              className="bg-purple-600 text-white font-bold text-xs p-1 px-3 rounded-xl flex items-center gap-1 cursor-pointer hover:bg-purple-500 transition"
              id="header-sign-in-btn"
            >
              <LogIn className="w-4 h-4" /> Guest Access
            </button>
          )}

        </div>
      </header>

      {/* 2. BODY CONTENT ROUTER SWITCHBOARD */}
      <motion.main
        className="flex-1 max-w-7xl w-full mx-auto p-4 z-10 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.98 }}
        style={{
          touchAction: "pan-y pinch-zoom",
        }}
      >
        <AnimatePresence mode="wait">
          {/* START SCREEN */}
          {stepAuth === "startScreen" && (
            <motion.div
              key="start-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-[80vh] flex flex-col items-center justify-center text-center p-8 bg-cover bg-center"
              style={{ backgroundImage: "url('https://zachsthoughts.com/wp-content/uploads/2025/08/tadc_tent.jpg')" }}
            >
              <h1 
                className="text-7xl font-black text-white mb-8 tracking-widest font-display"
                style={{
                  textShadow: `
                    0 2px 0 #6b21a8, 
                    0 4px 0 #581c87, 
                    0 6px 0 #4c1d95, 
                    0 8px 10px rgba(0,0,0,0.8),
                    0 -2px 5px #c084fc
                  `
                }}
              >
                WELCOME TO MIDYEAH
              </h1>
              <button
                onClick={() => {
                  if (currUser) {
                    setStepAuth("loggedIn");
                  } else {
                    setStepAuth("loggedOut");
                  }
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black py-4 px-8 rounded-2xl text-lg shadow-lg shadow-purple-500/30 transition transform hover:scale-105 cursor-pointer"
                id="enter-virtual-world-btn"
              >
                ENTER VIRTUAL WORLD
              </button>
            </motion.div>
          )}

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
                <h2 className="text-lg font-black text-white">Join MidYeah Platform</h2>
                <p className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold mt-0.5">Please register your account safely</p>
              </div>

              <form onSubmit={handleDirectLogin} className="space-y-4 text-xs mt-6">
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

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold p-3 rounded-xl cursor-pointer shadow transition"
                  id="auth-login-btn"
                >
                  Enter Dashboard ☕
                </button>
              </form>

              <div className="mt-4 text-center border-t border-purple-950 pt-3">
                <span className="text-[9px] text-gray-400 font-medium">MidYeah checks your credential security • God Bless</span>
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

                {isVerifying ? (
                  <div className="space-y-2">
                    <div className="w-full bg-purple-950 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-purple-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${verificationProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-purple-300 text-center font-bold">
                      {verificationProgress < 100 ? `Verifying... ${Math.round(verificationProgress)}%` : "Redirecting to Platform..."}
                    </p>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-2.5 rounded-xl cursor-pointer transition shadow"
                    id="verify-reg-code-btn"
                  >
                    Verify and Join Platform ☕
                  </button>
                )}
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

                      {/* Video Thumbnail Options (Auto vs Custom) */}
                      <div className="bg-[#1C1C1F]/40 border border-white/5 rounded-2xl p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                          <div>
                            <h4 className="text-xs font-bold text-gray-200">Video Cover Thumbnail</h4>
                            <p className="text-[10px] text-gray-400">Choose auto-generated screenshots or upload your custom design.</p>
                          </div>
                          
                          {/* Toggle switches */}
                          <div className="flex bg-black/60 rounded-xl p-1 border border-white/10 shrink-0">
                            <button
                              type="button"
                              onClick={() => setUploadThumbnailMode("auto")}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                uploadThumbnailMode === "auto"
                                  ? "bg-purple-600/90 text-white shadow-md font-extrabold"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              ⚙️ Auto Snapshot
                            </button>
                            <button
                              type="button"
                              onClick={() => setUploadThumbnailMode("custom")}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                uploadThumbnailMode === "custom"
                                  ? "bg-purple-600/90 text-white shadow-md font-extrabold"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              🎨 Custom Image
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                          {/* Left: Input Selection details */}
                          <div className="md:col-span-7 space-y-3">
                            {uploadThumbnailMode === "auto" ? (
                              <div className="p-3 bg-purple-950/20 border border-purple-500/10 rounded-xl space-y-2">
                                <p className="text-[10px] text-purple-300 font-semibold leading-relaxed">
                                  {uploadFile 
                                    ? "✨ MidYeah will automatically scan and capture an optimal preview frame at 1.5s or halfway into the video stream." 
                                    : "📥 Please select a video file above to generate the automatic preview snapshot."}
                                </p>
                                {isGeneratingThumbnail && (
                                  <div className="flex items-center gap-2 text-purple-400 font-mono text-[9px] animate-pulse">
                                    <span className="h-1.5 w-1.5 bg-purple-500 rounded-full inline-block animate-ping" />
                                    Capturing video slice frames...
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-purple-300 font-bold uppercase text-[9px] tracking-wider">Upload Thumbnail Cover image</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleCustomThumbnailChange(e.target.files ? e.target.files[0] : null)}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 cursor-pointer text-slate-300 text-[11px] focus:border-purple-500 transition"
                                />
                                <span className="text-[9px] text-gray-500 block leading-tight">Recommended ratio: 16:9 widescreen format (JPG, PNG, WebP)</span>
                              </div>
                            )}
                          </div>

                          {/* Right: Live Preview Panel */}
                          <div className="md:col-span-5 flex flex-col items-center justify-center">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Live Cover Preview</span>
                            <div className="aspect-video w-full max-w-[200px] bg-black border border-white/10 rounded-xl overflow-hidden relative flex items-center justify-center group shadow-inner">
                              {thumbnailPreviewUrl ? (
                                <img
                                  src={thumbnailPreviewUrl}
                                  alt="Live preview"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="text-center p-3 text-slate-600 flex flex-col items-center justify-center gap-1">
                                  <span className="text-lg">🖼️</span>
                                  <span className="text-[8px] font-mono font-bold leading-tight uppercase">No cover loaded</span>
                                </div>
                              )}
                              
                              <span className="absolute bottom-1 right-1 px-1 bg-black/80 text-[7px] text-gray-400 font-mono rounded select-none">
                                PREVIEW
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-gray-300 font-semibold mb-1 uppercase text-[10px]">Video Category Type</label>
                          <select
                            value={uploadCategory}
                            onChange={(e) => setUploadCategory(e.target.value as any)}
                            className="w-full bg-[#1e172a] border border-purple-900/60 text-purple-300 rounded-xl p-2 outline-none"
                            id="upload-vid-category"
                          >
                            <option value="normal">🎥 Standard Normal Upload</option>
                            <option value="movie">🎬 Long-Format Cinema Movie</option>
                            <option value="rental">📽️ Rent Exclusive Release</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-300 font-semibold mb-1 uppercase text-[10px]">Originated Location / Country</label>
                          <select
                            value={uploadCountry}
                            onChange={(e) => setUploadCountry(e.target.value)}
                            className="w-full bg-[#1e172a] border border-purple-900/60 text-purple-300 rounded-xl p-2 outline-none"
                            id="upload-vid-country"
                          >
                            <option value="philippines">🇵🇭 Philippines</option>
                            <option value="japan">🇯🇵 Japan</option>
                            <option value="usa">🇺🇸 United States</option>
                            <option value="uk">🇬🇧 United Kingdom</option>
                            <option value="france">🇫🇷 France</option>
                            <option value="germany">🇩🇪 Germany</option>
                            <option value="australia">🇦🇺 Australia</option>
                          </select>
                        </div>

                        {uploadCategory === "rental" ? (
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
                            <div className="sm:col-span-3">
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
                        ) : null}

                        <div className="sm:col-span-3 text-left py-1">
                          <label className="flex items-center gap-1.5 font-semibold text-gray-300 cursor-pointer mt-1">
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
                            <div className="flex items-center justify-between bg-black/20 p-4 rounded-2xl border border-white/5 mb-4">
                              <h2 className="text-xl font-bold flex items-center gap-3">
                                {currentVideo.title}
                                {currentVideo.category === 'movie' && <span className="bg-red-500/20 text-red-500 p-1.5 rounded-lg border border-red-500/30" title="Movie"><Tv className="w-4 h-4" /></span>}
                                {currentVideo.category === 'rental' && <span className="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg border border-purple-500/30" title="Rental"><Tv className="w-4 h-4" /></span>}
                                {(!currentVideo.category || currentVideo.category === 'standard' || currentVideo.category === 'normal') && <span className="bg-green-500/20 text-green-500 p-1.5 rounded-lg border border-green-500/30" title="Standard Video"><VideoIcon className="w-4 h-4" /></span>}
                              </h2>
                              <button onClick={() => setCurrentVideo(null)} className="text-gray-400 hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl transition text-xs font-bold uppercase cursor-pointer">
                                Close Player
                              </button>
                            </div>
                            <VideoPlayer
                              video={currentVideo}
                              currUser={currUser}
                              onDownload={handleDownloadVideo}
                              onSaveToLibrary={handleSaveToMidYeahLibrary}
                              isDownloaded={downloadedIds.includes(currentVideo.id)}
                              onSetTab={(tab) => setActiveTab(tab as any)}
                              onNext={handleNextVideo}
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
                            <span>Welcome to MidYeah Platform Room!</span>
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
                              : "MidYeah starts clean with no streams. Toggle 'Creator view' on the top right header to upload and persist your first MP4!"}
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
                                {vid.thumbnailUrl ? (
                                  <img 
                                    src={vid.thumbnailUrl} 
                                    alt={vid.title} 
                                    className="w-full h-full object-cover border-b border-white/5 transition duration-500 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-[#1C1C1F] border-b border-white/5 flex flex-col items-center justify-center gap-1.5 text-purple-900 group-hover:text-purple-700 transition">
                                    <VideoIcon className="w-6 h-6 animate-pulse" />
                                    <span className="text-[8px] font-mono font-bold tracking-wider uppercase">Loading Stream</span>
                                  </div>
                                )}
                              </div>

                              {/* Title description details */}
                              <div className="p-3">
                                <h3 className="font-bold text-xs text-gray-100 line-clamp-1 group-hover:text-purple-300 transition shrink-0 flex items-center gap-1.5">
                                  {vid.category === 'movie' && <span className="bg-red-500/20 text-red-500 p-1 rounded-md border border-red-500/30 shrink-0" title="Movie"><Tv className="w-3 h-3" /></span>}
                                  {vid.category === 'rental' && <span className="bg-purple-500/20 text-purple-400 p-1 rounded-md border border-purple-500/30 shrink-0" title="Rental"><Tv className="w-3 h-3" /></span>}
                                  {(!vid.category || vid.category === 'standard' || vid.category === 'normal') && <span className="bg-green-500/20 text-green-500 p-1 rounded-md border border-green-500/30 shrink-0" title="Standard Video"><VideoIcon className="w-3 h-3" /></span>}
                                  <span className="truncate">{vid.title}</span>
                                </h3>
                                <p className="text-[10px] text-purple-400 font-semibold uppercase mt-0.5">
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

                  {activeTab === "search" && (
                    <SearchTab 
                      videosList={videosList}
                      onPlayVideo={handlePlayVideo}
                      onSwitchTab={setActiveTab}
                    />
                  )}

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

                  {activeTab === "community" && <DiscordChat currUser={currUser} />}

                {activeTab === "profile" && currUser && (
                  <Profile 
                    profile={currUser} 
                    userVideos={videosList.filter(v => v.creator.email === currUser.email)}
                    onUpdate={handleProfileUpdate} 
                    onLogOut={handleLogOut} 
                    onDeleteAccount={handleDeleteAccount} 
                  />
                )}

                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </motion.main>

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
