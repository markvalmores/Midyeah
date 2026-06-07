/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  FastForward, SkipForward, SkipBack, Square, Settings2,
  Tv, Subtitles, Compass, RefreshCw, ThumbsUp, ThumbsDown, Share2,
  Download, Eye, Video as VideoIcon, Compass as CompassIcon, HelpCircle, Cast, FolderHeart, WifiOff,
  Award, Sparkles, Check, X, CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Video, VideoSub, UserProfile } from "../types";
import { 
  savePlayOffset, getPlayOffset, saveVideo, toggleSubscription, 
  checkSubscriptionStatus, toggleGroupMembership, checkGroupStatus, 
  saveLikeDislikeStatus, getLikeDislikeStatus, saveVideoReactionStatus, 
  getVideoReactionStatus, isGuestAccount, atomicIncrementVideoView,
  db
} from "../db";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface VideoPlayerProps {
  video: Video;
  currUser: UserProfile | null;
  onDownload: (v: Video, res: string) => void;
  onSaveToLibrary: (v: Video) => void;
  isDownloaded: boolean;
  onVideoEnd?: () => void;
  onNext?: () => void;
  onSetTab?: (tab: string) => void;
  onViewCreator?: (creator: UserProfile) => void;
  onJoinGroupChat?: (creator: UserProfile) => void;
}

export default function VideoPlayer({ video, currUser, onDownload, onSaveToLibrary, isDownloaded, onVideoEnd, onNext, onSetTab, onViewCreator, onJoinGroupChat }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Playback Control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Wide theatre mode
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [isAiSubtitle, setIsAiSubtitle] = useState(false);
  const [downloadResolution, setDownloadResolution] = useState("1080p");
  const [pipActive, setPipActive] = useState(false);
  const [crashState, setCrashState] = useState(false);

  // 360-Degree VR Mode states (using simulated 2D drag-and-tilt spatial Canvas mapping)
  const [yaw, setYaw] = useState(0); // horizontal panning (0 - 360)
  const [pitch, setPitch] = useState(0); // vertical tilt (-60 to 60)
  const [isDragging360, setIsDragging360] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Reactions & views
  const [currentReact, setCurrentReact] = useState<string | null>(null);
  const [reactCounts, setReactCounts] = useState(video.reactions || {});
  const [viewsCount, setViewsCount] = useState(video.views || 0);
  const [likesCount, setLikesCount] = useState(video.likes || 0);
  const [dislikesCount, setDislikesCount] = useState(video.dislikes || 0);
  const [hasRated, setHasRated] = useState<"like" | "dislike" | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isGroupMember, setIsGroupMember] = useState(false);
  
  // Premium Creator Memberships states (Membership+)
  const [isMemberPlus, setIsMemberPlus] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
  const [activePaymentMethod, setActivePaymentMethod] = useState<"gcash" | "paypal">("gcash");
  const [paymentGcashRef, setPaymentGcashRef] = useState("");
  const [paymentPaypalEmail, setPaymentPaypalEmail] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Keep reactions and views counts in sync when the video prop is updated in real-time
  useEffect(() => {
    if (video.reactions) {
      setReactCounts(video.reactions);
    }
    if (video.views !== undefined) {
      setViewsCount(video.views);
    }
    if (video.likes !== undefined) {
      setLikesCount(video.likes);
    }
    if (video.dislikes !== undefined) {
      setDislikesCount(video.dislikes);
    }
  }, [video]);

  // Sync all user-specific status (Subscription, Group, Likes, Reactions)
  useEffect(() => {
    let isMounted = true;
    async function syncAllStatus() {
      // Resolve persistent user or client guest identifier
      const savedEmail = localStorage.getItem("midyeah_active_session_email");
      const userIdentifier = currUser?.email || savedEmail || (() => {
        let localAnon = localStorage.getItem("midyeah_anon_user_id");
        if (!localAnon) {
          localAnon = "client_anon_" + Math.random().toString(36).substring(2, 11);
          localStorage.setItem("midyeah_anon_user_id", localAnon);
        }
        return localAnon;
      })();

      if (video && video.id) {
        try {
          // Fetch like/dislike status
          const rating = await getLikeDislikeStatus(userIdentifier, video.id);
          if (isMounted) setHasRated(rating);

          // Fetch video reactions
          const reactType = await getVideoReactionStatus(userIdentifier, video.id);
          if (isMounted) setCurrentReact(reactType);

          // If logged in, fetch creator-related status
          const effectiveEmail = currUser?.email || savedEmail;
          if (effectiveEmail && video.creator) {
            const subbed = await checkSubscriptionStatus(effectiveEmail, video.creator.email);
            if (isMounted) setIsSubscribed(subbed);
            
            const groupId = video.creator.channelUrl || "midyeah_group";
            const joined = await checkGroupStatus(effectiveEmail, groupId);
            if (isMounted) setIsGroupMember(joined);

            // Fetch live membership status
            try {
              const mDocId = `${effectiveEmail}_to_${video.creator.email}`;
              const docRef = doc(db, "memberships", mDocId);
              const docSnap = await getDoc(docRef);
              if (docSnap.exists() && docSnap.data().status === "active" && isMounted) {
                setIsMemberPlus(true);
              } else if (isMounted) {
                setIsMemberPlus(false);
              }
            } catch (err) {
              console.warn("Could not check real-time membership status:", err);
            }

            // Fetch latest real-time creator profile with true bindings
            try {
              const creatorRef = doc(db, "profiles", video.creator.email);
              const creatorSnap = await getDoc(creatorRef);
              if (creatorSnap.exists() && isMounted) {
                const cData = creatorSnap.data() as UserProfile;
                setCreatorProfile(cData);
                // Also update the active payment tab automatically based on what is available
                if (!cData.gcash && cData.paypal && isMounted) {
                  setActivePaymentMethod("paypal");
                }
              } else if (isMounted) {
                setCreatorProfile(video.creator);
              }
            } catch (err) {
              console.warn("Could not load latest creator profile:", err);
              if (isMounted) setCreatorProfile(video.creator);
            }
          }
        } catch (e) {
          console.warn("Status synchronization failed:", e);
        }
      }
    }

    syncAllStatus();
    return () => { isMounted = false; };
  }, [currUser, video.id]);

  const [aiSubtitles, setAiSubtitles] = useState<VideoSub[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(true);
    // If paused, keep controls visible indefinitely
    if (!isPlaying) return;
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettings) {
        setControlsVisible(false);
      }
    }, 5000); // 5 seconds visibility
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettings]);

  useEffect(() => {
    setCrashState(false);
    setIsPlaying(false);
    // Do NOT reset hasRated or currentReact here to avoid flickering logic

    const updatedViews = (video.views || 0) + 1;
    setViewsCount(updatedViews); // Bump local UI view count optimistically
    atomicIncrementVideoView(video.id).catch(err => console.warn("Failed to sync views:", err));

    setReactCounts(video.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 });

    // Fetch saved resume time
    if (video.source !== "youtube") {
      getPlayOffset(video.id).then((savedTime) => {
        if (savedTime > 0 && videoRef.current) {
          videoRef.current.currentTime = savedTime;
          setCurrentTime(savedTime);
        }
      });
    }

    // Generate AI Subtitles dynamically based on video details
    const words = [
      "Hello creative viewers!",
      "Welcome to this exciting MidYeah presentation ☕",
      "We strictly ensure a joyful and safe platform for watching.",
      "The Purpe Bunny mascot Midy is holding coffee right now!",
      "Be comfortable, lay back and let's explore.",
      "God bless Mark David Valmores for making this journey amazing!",
      "You can subscribe to @UsagyuunVtuber on YouTube for wonderful content.",
      "Remember to link your PayPal or GCash and withdraw your earnings smoothly.",
      "Enjoy this movie section and don't forget to play games under the video!",
      "Keep streaming, keep dreaming, and stay joyful!"
    ];

    const generatedSubs: VideoSub[] = [];
    const step = 8; // caption duration
    for (let i = 0; i < 20; i++) {
      generatedSubs.push({
        time: i * step,
        text: words[i % words.length]
      });
    }
    setAiSubtitles(generatedSubs);
  }, [video.id, currUser]);

  // Handle play offset tracking every 3 seconds to defend against page crashes or tab close
  useEffect(() => {
    if (currentTime > 0) {
      savePlayOffset(video.id, currentTime);
    }
  }, [currentTime, video.id]);

  // Autoplay trigger
  useEffect(() => {
    if (video.source !== "youtube" && isAutoplay && videoRef.current && !crashState) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked by browser policy, keep paused
      });
    }
  }, [video.id, isAutoplay]);

  // Playback rate sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Frame simulation render for 360-degree Canvas
  useEffect(() => {
    if (!video.is360) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;

    const render360Canvas = () => {
      if (crashState) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = "#0c0a0f";
      ctx.fillRect(0, 0, width, height);

      // Draw immersive panoramic spatial background (Stars, Nebula & Navigation Lines)
      ctx.save();
      // Translate to center
      ctx.translate(width / 2, height / 2);

      // Draw horizon reference grid matching pitch & yaw
      ctx.strokeStyle = "#491069";
      ctx.lineWidth = 1.5;
      
      // Draw 360 grid rings
      for (let i = -3; i <= 3; i++) {
        const yOffset = i * 40 + pitch * 1.5;
        ctx.beginPath();
        ctx.arc(yaw * 1.2, yOffset, width / 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw spherical constellations
      ctx.fillStyle = "#e0aaff";
      for (let s = 0; s < 40; s++) {
        const starX = ((s * 150 + yaw * 2) % (width * 2)) - width;
        const starY = ((s * 80 + pitch * 2) % (height * 2)) - height;
        ctx.beginPath();
        ctx.arc(starX, starY, Math.sin(currentTime + s) * 1.5 + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw active player core video frames projected onto sphere perspective
      if (videoRef.current && isPlaying) {
        try {
          ctx.globalAlpha = 0.85;
          // Projected coordinate center point shifts on dragging yaw & pitch
          const videoWidth = 420;
          const videoHeight = 240;
          const mapX = (yaw * 3) % (width * 1.5) - videoWidth / 2;
          const mapY = pitch * 1.5 - videoHeight / 2;
          ctx.drawImage(videoRef.current, mapX, mapY, videoWidth, videoHeight);
        } catch (e) {
          // Avoid drawImage error if video is not loaded yet
        }
      }

      // Draw compass overlay
      ctx.restore();
      
      // Border indicator
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, width, height);

      // Draw 360° Compass text
      ctx.fillStyle = "#e879f9";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`360° VR VIEW - Yaw: ${Math.round(yaw)}° | Pitch: ${Math.round(pitch)}°`, 16, 26);
      ctx.fillText("✨ CLICK AND DRAG TO PAN SPACE", 16, 42);

      frameId = requestAnimationFrame(render360Canvas);
    };

    render360Canvas();
    return () => cancelAnimationFrame(frameId);
  }, [video.is360, yaw, pitch, isPlaying, currentTime, crashState]);

  // Sync state with HTML Video tag
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Pick appropriate subtitles
      const cur = videoRef.current.currentTime;
      let activeText = "";
      
      // Look for custom text
      const matchingSub = aiSubtitles.find(
        (sub, index) => cur >= sub.time && (index === aiSubtitles.length - 1 || cur < aiSubtitles[index + 1].time)
      );
      if (matchingSub) {
        activeText = matchingSub.text;
      }
      setActiveSubtitle(activeText);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || video.duration || 60);
    }
  };

  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    if (video.blob) {
      url = URL.createObjectURL(video.blob);
      setVideoBlobUrl(url);
    } else {
      setVideoBlobUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [video]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const togglePlay = () => {
    if (crashState) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setCrashState(true);
        });
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const skipTime = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + amount));
    }
  };

  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const triggerResetRefresh = () => {
    setCrashState(false);
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  // React handling (Facebook reactions) - ATOMIC
  const handleReaction = (reactType: string) => {
    if (isGuestAccount(currUser?.email)) {
      alert("Guess account are for watching only! Log in to react and interact with creators.");
      return;
    }
    
    // Optimistic UI update
    let freshReacts = { ...reactCounts };
    const savedEmail = localStorage.getItem("midyeah_active_session_email");
    const userIdentifier = currUser?.email || savedEmail || (() => {
      let localAnon = localStorage.getItem("midyeah_anon_user_id");
      if (!localAnon) {
        localAnon = "client_anon_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("midyeah_anon_user_id", localAnon);
      }
      return localAnon;
    })();

    let nextRating: string | null = null;
    if (currentReact === reactType) {
      setCurrentReact(null);
      freshReacts[reactType as keyof typeof freshReacts] = Math.max(0, (freshReacts[reactType as keyof typeof freshReacts] || 0) - 1);
      nextRating = null;
    } else {
      if (currentReact) {
        freshReacts[currentReact as keyof typeof freshReacts] = Math.max(0, (freshReacts[currentReact as keyof typeof freshReacts] || 0) - 1);
      }
      freshReacts[reactType as keyof typeof freshReacts] = (freshReacts[reactType as keyof typeof freshReacts] || 0) + 1;
      setCurrentReact(reactType);
      nextRating = reactType;
    }
    setReactCounts(freshReacts);

    // Call atomic DB update
    saveVideoReactionStatus(userIdentifier, video.id, nextRating).catch(err => {
      console.warn("Failed to save reaction status:", err);
      // Revert local state if needed (skipped for simplicity/speed)
    });
  };

  const handleLikeDislike = (type: "like" | "dislike") => {
    if (isGuestAccount(currUser?.email)) {
      alert("Watching-only mode enabled for guest accounts. Sign in to rate this content!");
      return;
    }

    // Optimistic UI update
    let newLikes = video.likes || 0;
    let newDislikes = video.dislikes || 0;
    let nextRated: "like" | "dislike" | null = null;
    const savedEmail = localStorage.getItem("midyeah_active_session_email");
    const userIdentifier = currUser?.email || savedEmail || (() => {
      let localAnon = localStorage.getItem("midyeah_anon_user_id");
      if (!localAnon) {
        localAnon = "client_anon_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("midyeah_anon_user_id", localAnon);
      }
      return localAnon;
    })();

    if (hasRated === type) {
      nextRated = null;
      if (type === "like") {
        newLikes = Math.max(0, newLikes - 1);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else {
        newDislikes = Math.max(0, newDislikes - 1);
        setDislikesCount(prev => Math.max(0, prev - 1));
      }
    } else {
      if (hasRated === "like") {
        newLikes = Math.max(0, newLikes - 1);
        setLikesCount(prev => Math.max(0, prev - 1));
      } else if (hasRated === "dislike") {
        newDislikes = Math.max(0, newDislikes - 1);
        setDislikesCount(prev => Math.max(0, prev - 1));
      }
      
      nextRated = type;
      if (type === "like") {
        newLikes++;
        setLikesCount(prev => prev + 1);
      } else {
        newDislikes++;
        setDislikesCount(prev => prev + 1);
      }
    }
    
    setHasRated(nextRated);
    
    // Call atomic DB update
    saveLikeDislikeStatus(userIdentifier, video.id, nextRated).catch(err => {
      console.warn("Failed to save rating status:", err);
    });
  };

  // Subtitle custom guess generator toggle
  const toggleSubtitleType = () => {
    setIsAiSubtitle(!isAiSubtitle);
  };

  // Live localized metadata
  const localTimeString = new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  
  // Facebook Reactions mapping
  const reactionsList = [
    { type: "like", emoji: "👍", label: "Like", color: "text-blue-400" },
    { type: "love", emoji: "❤️", label: "Love", color: "text-rose-500" },
    { type: "haha", emoji: "😂", label: "Haha", color: "text-amber-400" },
    { type: "wow", emoji: "😮", label: "Wow", color: "text-purple-400" },
    { type: "sad", emoji: "😢", label: "Sad", color: "text-cyan-400" },
    { type: "angry", emoji: "😡", label: "Angry", color: "text-red-500" }
  ];

  // Drag 360-space physics emulation
  const handleMouseDown360 = (e: React.MouseEvent) => {
    setIsDragging360(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove360 = (e: React.MouseEvent) => {
    if (!isDragging360) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    setYaw(prev => (prev + dx * 0.4) % 360);
    setPitch(prev => Math.max(-60, Math.min(60, prev - dy * 0.4)));

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp360 = () => {
    setIsDragging360(false);
  };

  // Picture in Picture mode toggle
  const togglePip = async () => {
    if (pipActive) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      setPipActive(false);
    } else {
      if (videoRef.current && videoRef.current !== document.pictureInPictureElement) {
        try {
          await videoRef.current.requestPictureInPicture();
          setPipActive(true);
        } catch (error) {
          // Fallback UI-based PIP emulation
          setPipActive(true);
        }
      }
    }
  };

  // Progress Percentage for like vs dislike indicators
  const totalLikesDislikes = (video.likes || 0) + (video.dislikes || 0);
  const likeRatio = totalLikesDislikes > 0 
    ? Math.round(((video.likes || 0) / totalLikesDislikes) * 100) 
    : 100;

  // Double Tap Seek for Mobile/Desktop Simulation
  const handleOverlayClick = (e: React.MouseEvent) => {
    // If user clicked a real button, don't trigger seek
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;

    resetControlsTimeout();
    
    // Check for double click/tap
    if (e.detail === 2) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) {
          skipTime(-10);
        } else {
          skipTime(10);
        }
      }
    } else if (e.detail === 1) {
      togglePlay();
    }
  };

  return (
    <div className={`flex flex-col ${isExpanded ? "w-full" : "lg:col-span-2"} bg-[#121214] text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-white/10`} ref={containerRef} 
      onClick={handleOverlayClick}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={resetControlsTimeout}
    >
      {/* Play/Pause Large Center Overlay for Mobile */}
      <AnimatePresence>
        {!isPlaying && controlsVisible && !crashState && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="absolute inset-0 m-auto w-16 h-16 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center z-40 border border-white/20"
          >
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Dynamic Player Screen Container */}
      <div className="relative group/player bg-black/90 aspect-video w-full flex items-center justify-center overflow-hidden">
        {crashState ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-purple-950/40 p-6 z-20 backdrop-blur-md">
            <span className="text-rose-500 text-6xl animate-bounce">⚠️</span>
            <h3 className="text-xl font-bold mt-4 text-white">Interactive Player Encountered a Glitch</h3>
            <p className="text-xs text-purple-300 mt-1 max-w-sm text-center">No worries! Hit the hardware refresh button to re-calibrate current layout frames safely.</p>
            <button
              onClick={triggerResetRefresh}
              className="mt-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-4 py-2 rounded-xl transition shadow-lg cursor-pointer"
              id="refresh-player-btn"
            >
              <RefreshCw className="w-4 h-4" /> Refresh Renderer
            </button>
          </div>
        ) : video.source === "youtube" ? (
          /* YouTube Embed Player */
          isOnline ? (
            <iframe
              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full z-10"
              onLoad={() => setIsPlaying(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0c] z-10 p-6 text-center">
              <WifiOff className="w-12 h-12 text-rose-500 mb-4 opacity-80" />
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">You are Offline</h2>
              <p className="text-sm text-gray-400 max-w-md bg-white/5 p-4 rounded-xl border border-white/10">
                You're trying to watch a YouTube video, but you are not connected to the internet. 
                <br /><br />
                <span className="text-rose-400 font-semibold">Note:</span> Because YouTube blocks external video downloading to protect creators, their videos cannot be physically stored onto your device for offline playback.
                <br /><br />
                To watch offline without internet, you or the creator must upload the actual video file natively to MidYeah.
              </p>
            </div>
          )
        ) : video.is360 ? (
          /* 360 VR Canvas Sphere Projector */
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            onMouseDown={handleMouseDown360}
            onMouseMove={handleMouseMove360}
            onMouseUp={handleMouseUp360}
            onMouseLeave={handleMouseUp360}
            className="w-full h-full cursor-grab active:cursor-grabbing object-cover z-10"
          />
        ) : null}

        {/* Underlying Core Video Node (Hidden if is360 is true and Canvas is active overlay) */}
        <video
          ref={videoRef}
          src={videoBlobUrl || video.videoUrl}
          referrerPolicy="no-referrer"
          preload="auto"
          loop={isLoop}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={onVideoEnd}
          className={`w-full h-full object-contain ${video.is360 ? "hidden" : "block"} z-0`}
        />

        {/* AI Dynamic Synced Subtitles Overlay */}
        {showSubtitles && activeSubtitle && !crashState && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-black/80 px-4 py-1.5 rounded-lg border border-purple-500/20 shadow text-center max-w-[85%] z-20 pointer-events-none transition-all">
            <p className="text-yellow-300 text-xs font-semibold tracking-wide flex items-center gap-1">
              <span>{isAiSubtitle ? "✨ AI Listening & Transcribing: " : "Subtitles: "}</span>
              <span className="text-white font-normal">{activeSubtitle}</span>
              {isAiSubtitle && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full ml-1" />}
            </p>
          </div>
        )}

        {/* Emulated floating PIP window fallback */}
        {pipActive && !document.pictureInPictureElement && (
          <div className="fixed bottom-20 right-8 w-64 h-36 bg-[#16121e] border-2 border-purple-500 rounded-xl shadow-2xl z-40 overflow-hidden flex flex-col justify-between pointer-events-auto">
            <div className="flex justify-between items-center bg-purple-950/80 px-2 py-1 text-[10px] text-purple-300 font-bold">
              <span className="truncate">{video.title}</span>
              <button onClick={() => setPipActive(false)} className="hover:text-white" id="pip-close-inner">✕</button>
            </div>
            <div className="flex-1 flex items-center justify-center bg-black">
              <VideoIcon className="w-8 h-8 text-purple-500 animate-pulse" />
            </div>
            <div className="h-2 bg-purple-600 w-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
          </div>
        )}

        {/* Controls Overlay Panel */}
        {video.source !== "youtube" && (
          <div className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 sm:p-4 transition-all duration-300 flex flex-col gap-2 z-30 select-none ${controlsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none"}`}>
            {/* Progress Slider */}
            <div className="flex items-center gap-2 group/seek">
            <span className="text-[10px] text-gray-300 font-mono w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative flex items-center h-6">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-purple-500 h-1 sm:h-1.5 bg-gray-700/60 rounded-lg cursor-pointer transition-all hover:h-2"
                id="player-seek"
              />
            </div>
            <span className="text-[10px] text-gray-300 font-mono w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Action buttons list */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                className="hover:text-purple-400 transition-all active:scale-95 p-1 cursor-pointer" 
                id="btn-play-pause-controls"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
              </button>

              <div className="hidden sm:flex items-center gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStop(); }}
                  className="hover:text-purple-400 transition cursor-pointer p-1"
                  id="btn-stop-vid"
                  title="Stop & Reset"
                >
                  <Square className="w-4 h-4 fill-white/20" />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); skipTime(-10); }}
                  className="hover:text-purple-400 transition cursor-pointer p-1"
                  id="btn-back-10"
                  title="Back 10s"
                >
                  <SkipBack className="w-4 h-4 fill-white" />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); skipTime(10); }}
                  className="hover:text-purple-400 transition cursor-pointer p-1"
                  id="btn-forward-10"
                  title="Forward 10s"
                >
                  <SkipForward className="w-4 h-4 fill-white" />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onNext && onNext(); }}
                  className="hover:text-purple-400 transition cursor-pointer p-1"
                  id="btn-next-vid"
                  title="Next Video"
                >
                  <FastForward className="w-4 h-4 fill-white" />
                </button>
              </div>
              
              <button
                onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = 0; }}
                className="hover:text-purple-400 transition cursor-pointer p-1"
                id="btn-restart-vid"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume Slider combo */}
              <div className="flex items-center gap-1 group/vol">
                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="hover:text-purple-400 transition cursor-pointer p-1" id="btn-toggle-mute">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-12 sm:w-20 accent-purple-500 h-1 bg-gray-700/80 rounded cursor-pointer transition-all opacity-0 group-hover/vol:opacity-100 sm:opacity-100"
                  id="player-volume"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 relative">
              {/* Settings Dropdown Emulation */}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#1C1C1F] border border-white/10 rounded-xl p-3 shadow-2xl min-w-[160px] flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 z-50">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">Playback Speed</span>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => { setPlaybackRate(rate); setShowSettings(false); }}
                          className={`text-[10px] font-bold py-1 px-2 rounded-lg transition text-center ${playbackRate === rate ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-px bg-white/5 mx-1" />
                  <div className="flex flex-col gap-2 px-1">
                     <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-[10px] text-gray-300 font-medium group-hover:text-white transition">Loop Video</span>
                        <input type="checkbox" checked={isLoop} onChange={() => setIsLoop(!isLoop)} className="w-3 h-3 accent-purple-500 rounded bg-slate-800" />
                     </label>
                     <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-[10px] text-gray-300 font-medium group-hover:text-white transition">Auto-play Next</span>
                        <input type="checkbox" checked={isAutoplay} onChange={() => setIsAutoplay(!isAutoplay)} className="w-3 h-3 accent-purple-500 rounded bg-slate-800" />
                     </label>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`hover:text-purple-400 transition cursor-pointer p-1 rounded-full ${showSettings ? "bg-white/10 text-purple-400" : "text-gray-400"}`}
                id="btn-settings-toggle"
                title="Playback Settings"
              >
                <Settings2 className="w-5 h-5" />
              </button>

              {/* Subtitles (CC) Toggle */}
              <button
                onClick={() => setShowSubtitles(!showSubtitles)}
                className={`hover:text-purple-400 transition cursor-pointer ${showSubtitles ? "text-purple-400" : "text-gray-400"}`}
                id="toggle-captions"
                title="Toggle Subtitles"
              >
                <Subtitles className="w-4 h-4" />
              </button>

              {/* AI Subtitle detector toggle */}
              <button
                onClick={toggleSubtitleType}
                className={`text-[9px] hover:scale-105 border rounded px-1 py-0.5 font-bold transition cursor-pointer ${isAiSubtitle ? "bg-purple-600/95 border-purple-400 text-purple-100" : "border-slate-700 text-slate-400"}`}
                id="toggle-ai-subs"
                title="AI Subtitles Mode"
              >
                AI Voice Guess
              </button>

              {/* Picture-in-picture mode toggle */}
              <button
                onClick={togglePip}
                className="hover:text-purple-400 transition cursor-pointer text-gray-300"
                id="toggle-pip"
                title="Picture-in-Picture"
              >
                <Tv className="w-4 h-4" />
              </button>

              {/* Cast button */}
              <button
                onClick={() => {
                  const video = videoRef.current;
                  if (video && (video as any).remote) {
                    try {
                      (video as any).remote.prompt();
                    } catch (e) {
                      console.error("Cast error", e);
                      alert("Casting failed.");
                    }
                  } else {
                    alert("Casting not supported on this device/browser.");
                  }
                }}
                className="hover:text-purple-400 transition cursor-pointer text-gray-300"
                id="toggle-cast"
                title="Cast to Device"
              >
                <Cast className="w-4 h-4" />
              </button>

              {/* Theatre view toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`text-[10px] font-bold py-0.5 px-1.5 rounded border transition cursor-pointer ${isExpanded ? "bg-purple-950 border-purple-500 text-purple-300" : "border-gray-700 text-gray-300 hover:text-white"}`}
                id="toggle-theatre-wide"
                title="Theatre Mode"
              >
                Cinema Mode
              </button>

              {/* Native screen full */}
              <button
                onClick={() => {
                  if (containerRef.current) {
                    if (isFullscreen) {
                      document.exitFullscreen().catch(() => {});
                      setIsFullscreen(false);
                    } else {
                      containerRef.current.requestFullscreen().catch(() => {});
                      setIsFullscreen(true);
                    }
                  }
                }}
                className="hover:text-purple-400 transition cursor-pointer text-gray-300"
                id="toggle-fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
            </div>
          </div>
        )}
      </div>

      {/* Video metadata titles, Facebook Reactions and actions */}
      <div className="p-4 flex flex-col gap-3 bg-[#121214]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-1">
            {video.category === "rental" && (
              <span className="bg-amber-600/90 text-amber-50 rounded-md font-bold px-2 py-0.5 text-[10px] tracking-wide mr-2 shadow inline-block">
                📽️ Rental Exclusive: {video.rentalPrice}$ / {video.rentalPeriod}
              </span>
            )}
            {video.category === "movie" && (
              <span className="bg-blue-600/90 text-blue-50 rounded-md font-bold px-2 py-0.5 text-[10px] tracking-wide mr-2 shadow inline-block">
                🎬 Cinema Movie Stream
              </span>
            )}
            <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2 mt-1">
              {video.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={() => {
                const shareData = {
                  title: video.title,
                  text: video.description,
                  url: window.location.href
                };
                if (navigator.share) {
                  navigator.share(shareData).catch(console.error);
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard! 📋");
                }
              }}
              className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-xl border border-white/10 transition cursor-pointer"
              id="share-video-button"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>

            {/* Diagnostic page repair refresh button */}
            <button
              onClick={triggerResetRefresh}
              className="text-[10px] flex items-center gap-1.5 self-start text-purple-400 border border-purple-900/60 bg-purple-950/20 px-2 py-1.5 rounded-xl hover:bg-purple-950/50 cursor-pointer"
              id="crash-refresh-button"
            >
              <RefreshCw className="w-3 h-3" /> Fix Player
            </button>
          </div>
        </div>

        {/* Statistics & location timestamp */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#a1a1aa] border-b border-white/10 pb-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-purple-400" /> {viewsCount} Views (Real-time)
            </span>
            <span>
              🕒 Loc: {localTimeString} (Based on your location)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Resolution picker */}
            <select
              className="bg-purple-950/80 text-purple-300 text-[10px] font-bold p-1 rounded-lg border border-purple-900/60 cursor-pointer outline-none hover:bg-purple-900 transition"
              onChange={(e) => setDownloadResolution(e.target.value)}
              value={downloadResolution}
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="1440p">1440p</option>
              <option value="4K">4K</option>
              <option value="8K">8K</option>
            </select>
            
            {/* Download cache button */}
            <button
              onClick={() => {
                if (isGuestAccount(currUser?.email)) {
                  alert("Restricted: Guests cannot save videos offline.");
                  return;
                }
                onDownload(video, downloadResolution);
              }}
              className={`flex items-center gap-1 text-xs px-3 py-1 rounded-xl font-medium transition cursor-pointer ${isDownloaded ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" : "bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-900/60"}`}
              id="download-offline-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloaded ? "Saved Offline" : "Save to Device"}</span>
            </button>
            
            {/* Save to MidYeah Library button */}
            <button
              onClick={() => {
                if (isGuestAccount(currUser?.email)) {
                  alert("Guests cannot save to personal library.");
                  return;
                }
                onSaveToLibrary(video);
              }}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-xl font-medium bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-900/60 transition cursor-pointer"
              id="save-to-midyeah-lib-btn"
            >
              <FolderHeart className="w-3.5 h-3.5" />
              <span>Save to MidYeah Library</span>
            </button>
          </div>
        </div>

        {/* Custom Reactions, Rating percentage and Social counters */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-1 text-xs text-slate-300 bg-[#1C1C1F] p-3 rounded-xl border border-white/10">
          
          {/* Facebook Reactions Tray */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-gray-400 font-medium mr-1 select-none">Reacts:</span>
            {reactionsList.map((react) => {
              const count = reactCounts[react.type as keyof typeof reactCounts] || 0;
              const isSelected = currentReact === react.type;
              return (
                <button
                  key={react.type}
                  onClick={() => handleReaction(react.type)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition duration-200 cursor-pointer ${isSelected ? "bg-purple-800 border-purple-400 font-bold scale-105" : "bg-slate-900/80 border-slate-800 hover:bg-slate-800/80"}`}
                  title={react.label}
                  id={`react-btn-${react.type}`}
                >
                  <span className="text-sm">{react.emoji}</span>
                  <span className={isSelected ? react.color : "text-gray-300"}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Likes & Dislikes Percentage Grid */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#18181b] border border-white/10 rounded-xl p-0.5 overflow-hidden">
              <button
                onClick={() => handleLikeDislike("like")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition duration-150 cursor-pointer ${hasRated === "like" ? "text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20" : "text-gray-300"}`}
                id="rate-like-btn"
                title={`${likesCount} Likes`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="text-xs">{likesCount}</span>
              </button>
              <div className="h-4 w-px bg-white/10 mx-0.5"></div>
              <button
                onClick={() => handleLikeDislike("dislike")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition duration-150 cursor-pointer ${hasRated === "dislike" ? "text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20" : "text-gray-300"}`}
                id="rate-dislike-btn"
                title={`${dislikesCount} Dislikes`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span className="text-xs">{dislikesCount}</span>
              </button>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${likeRatio}%` }}></div>
              </div>
              <span className="text-[10px] text-gray-400 mt-1">{likeRatio}% Approval rating</span>
            </div>
          </div>

        </div>

        {/* Video Creator Profile Section */}
        <div className="flex items-center justify-between gap-4 bg-purple-950/10 p-3 rounded-xl border border-purple-950/20 mt-1">
          <button 
            onClick={() => onViewCreator && onViewCreator(video.creator)}
            className="flex items-center gap-3 text-left focus:outline-none focus:ring-1 focus:ring-purple-500 rounded-lg p-1 hover:bg-white/5 transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-800/60 border border-purple-500">
              <img src={video.creator.avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e)=>{(e.target as any).src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"}} referrerPolicy="no-referrer" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-100 hover:text-purple-300 transition-colors">{video.creator.channelName}</h3>
              <p className="text-[10px] text-purple-400">{video.creator.username} • {video.creator.subscribersCount} subscribers</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!currUser) {
                  alert("Please sign in to subscribe!");
                  return;
                }
                if (isGuestAccount(currUser.email)) {
                  alert("Restricted: Guests cannot subscribe to channels.");
                  return;
                }
                try {
                  const status = await toggleSubscription(currUser.email, video.creator.email);
                  setIsSubscribed(status);
                  if (status) {
                    alert(`✅ Subscribed to ${video.creator.channelName}!`);
                  } else {
                    alert(`⭕ Unsubscribed from ${video.creator.channelName}.`);
                  }
                } catch (e) {
                  console.error(e);
                  alert("Failed to update subscription.");
                }
              }}
              className={`${isSubscribed ? "bg-slate-700 hover:bg-slate-600" : "bg-purple-600 hover:bg-purple-500"} text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow cursor-pointer transition`}
              id="subscribe-channel-btn"
            >
              {isSubscribed ? "Subscribed" : "Subscribe"}
            </button>
            <button
              onClick={async () => {
                if (!currUser) {
                  alert("Please sign in to join groups!");
                  return;
                }
                if (isGuestAccount(currUser.email)) {
                  alert("Group settings: Guests cannot join channel groups.");
                  return;
                }
                try {
                  const groupId = video.creator.channelUrl || "midyeah_group";
                  const status = await toggleGroupMembership(currUser.email, groupId);
                  setIsGroupMember(status);
                  if (status) {
                    alert(`✨ Joined ${video.creator.channelName}'s group! Redirecting to group chat...`);
                    if (onJoinGroupChat) {
                      onJoinGroupChat(video.creator);
                    } else if (onSetTab) {
                      onSetTab("community");
                    }
                  } else {
                    alert(`⭕ Left ${video.creator.channelName}'s group.`);
                  }
                } catch (e) {
                  console.error(e);
                  alert("Failed to update group membership.");
                }
              }}
              className={`${isGroupMember ? "bg-slate-800 text-slate-300" : "bg-transparent text-purple-300"} hover:bg-purple-950/30 border border-purple-800 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition`}
              id="join-channel-btn"
            >
              {isGroupMember ? "In Group" : "Join Group"}
            </button>
            <button
              onClick={() => {
                if (!currUser) {
                  alert("Please sign in to join Membership+!");
                  return;
                }
                if (isGuestAccount(currUser.email)) {
                  alert("Restricted: Guest accounts cannot buy premium subscriptions.");
                  return;
                }
                setShowMembershipModal(true);
              }}
              className={`${isMemberPlus ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border border-yellow-400 text-white font-bold" : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold"} flex items-center justify-center gap-1 text-xs px-3.5 py-1.5 rounded-full shadow-lg hover:shadow-purple-500/10 cursor-pointer transition`}
              id="membership-plus-btn"
            >
              <Award className={`w-3.5 h-3.5 ${isMemberPlus ? "animate-pulse text-yellow-200" : "text-purple-200"}`} />
              <span>{isMemberPlus ? "Member+ Active" : "Membership+"}</span>
            </button>
          </div>
        </div>

        {/* Video description box */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-gray-300 mt-1 leading-relaxed">
          <p className="font-semibold text-gray-200">Description:</p>
          <p className="mt-1 whitespace-pre-wrap">{video.description}</p>
        </div>
      </div>

      {/* Dynamic Membership+ Payment Modal Prompt */}
      <AnimatePresence>
        {showMembershipModal && (
          <div className="absolute inset-0 z-50 bg-[#000000e0] backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#15161c] border-2 border-yellow-500/30 rounded-2xl w-full max-w-md overflow-hidden text-white shadow-2xl relative"
            >
              <div className="p-4 bg-gradient-to-r from-yellow-700/20 via-slate-900 to-yellow-700/20 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500 animate-bounce" />
                  <span className="font-extrabold text-sm text-yellow-400 tracking-wide uppercase">Membership+ Premium Join</span>
                </div>
                <button 
                  onClick={() => {
                    setShowMembershipModal(false);
                    setPaymentGcashRef("");
                    setPaymentPaypalEmail("");
                  }}
                  className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-left">
                <div className="text-center pb-2 border-b border-white/5">
                  <p className="text-[11px] text-gray-400">Supporting Creator:</p>
                  <h4 className="text-md font-bold text-gray-100">{creatorProfile?.channelName || video.creator.channelName}</h4>
                  <p className="text-[10px] text-purple-400">@{creatorProfile?.username || video.creator.username}</p>
                </div>

                <div className="bg-yellow-950/20 border border-yellow-500/20 rounded-xl p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase text-yellow-500 font-bold tracking-widest block">Monthly Price Contribution</span>
                  <span className="text-2xl font-extrabold text-yellow-300">₱50.00 <span className="text-xs font-normal text-gray-400">PHP / monthly</span></span>
                  <p className="text-[10px] text-gray-300">Unlocks premium exclusive member badges, elite community priority, and live chat sparkle highlights!</p>
                </div>

                {/* Tab switchers: GCash & PayPal */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod("gcash")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activePaymentMethod === "gcash" ? "bg-blue-600 text-white shadow-md font-bold" : "bg-white/5 border border-white/5 text-gray-400 hover:text-white"}`}
                  >
                    <span className="font-mono text-[11px] font-extrabold uppercase italic">G</span>
                    <span>GCash Payment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePaymentMethod("paypal")}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${activePaymentMethod === "paypal" ? "bg-slate-800 text-white shadow-md border border-white/10" : "bg-white/5 border border-white/5 text-gray-400 hover:text-white"}`}
                  >
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>PayPal Address</span>
                  </button>
                </div>

                {/* Sub panels rendering GCash vs PayPal bindings */}
                <div className="space-y-3.5">
                  {activePaymentMethod === "gcash" ? (
                    <div className="space-y-3">
                      {creatorProfile?.gcash ? (
                        <div className="space-y-2 bg-blue-950/10 border border-blue-500/20 p-3.5 rounded-xl">
                          <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">📱 Saved Payout Account Details:</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-gray-400 uppercase block font-semibold">GCash Receiver Number</span>
                              <span className="text-sm font-bold text-white font-mono">{creatorProfile.gcash}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(creatorProfile.gcash || "");
                                alert("📋 GCash number copied to clipboard!");
                              }}
                              className="px-2 py-1 bg-blue-600/30 border border-blue-500/40 hover:bg-blue-600 hover:text-white rounded text-[10px] font-bold text-blue-300 cursor-pointer transition select-none"
                            >
                              Copy
                            </button>
                          </div>
                          
                          <div className="pt-2 border-t border-white/5">
                            <label className="block text-[10px] text-slate-300 font-bold mb-1 font-sans">YOUR GCASH REFERENCE ID / SENDER MOBILE</label>
                            <input 
                              type="text"
                              value={paymentGcashRef}
                              onChange={(e) => setPaymentGcashRef(e.target.value)}
                              placeholder="e.g. Ref No. or Gcash Number"
                              className="w-full bg-[#1c1c24] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                            />
                            <p className="text-[8px] text-gray-400 mt-1 leading-relaxed">Please send exactly 50 pesos directly to GCash first and type reference code above.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-950/30 border border-red-500/20 p-4 rounded-xl text-center space-y-2">
                          <p className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono">⚠️ GCash Unavailable</p>
                          <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                            This user does not have a GCash saved under their binding settings. Please try checking their PayPal option above instead.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creatorProfile?.paypal ? (
                        <div className="space-y-2 bg-slate-900 border border-white/10 p-3.5 rounded-xl">
                          <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">💳 PayPal Payout Email Address:</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[9px] text-gray-400 uppercase block font-semibold">PayPal Registered Email</span>
                              <span className="text-xs font-bold text-white font-mono">{creatorProfile.paypal}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(creatorProfile.paypal || "");
                                alert("📋 PayPal email address copied to clipboard!");
                              }}
                              className="px-2 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded text-[10px] font-bold text-gray-300 cursor-pointer transition select-none"
                            >
                              Copy
                            </button>
                          </div>

                          <div className="pt-2 border-t border-white/5">
                            <label className="block text-[10px] text-slate-300 font-bold mb-1 font-sans">YOUR PAYPAL EMAIL / TRANSACTION ID</label>
                            <input 
                              type="text"
                              value={paymentPaypalEmail}
                              onChange={(e) => setPaymentPaypalEmail(e.target.value)}
                              placeholder="e.g. yourpaypal@email.com"
                              className="w-full bg-[#1c1c24] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                            />
                            <p className="text-[8px] text-gray-400 mt-1 leading-relaxed">Please transfer exactly ₱50.00 to the PayPal address above first and type transaction id.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-950/30 border border-red-500/20 p-4 rounded-xl text-center space-y-2">
                          <p className="text-xs font-bold text-red-400 uppercase tracking-widest font-mono">⚠️ PayPal Unavailable</p>
                          <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                            This user haven't bind their PayPal account yet. Please try checking their GCash option above instead.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action CTA Submission buttons */}
                <div className="pt-3 border-t border-white/5">
                  <button
                    type="button"
                    disabled={
                      isSubmittingPayment ||
                      (activePaymentMethod === "gcash" && !creatorProfile?.gcash) ||
                      (activePaymentMethod === "paypal" && !creatorProfile?.paypal)
                    }
                    onClick={async () => {
                      if (!currUser) return;
                      
                      // Validate entries
                      if (activePaymentMethod === "gcash" && !paymentGcashRef.trim()) {
                        alert("Please enter your GCash mobile number or transaction reference ID!");
                        return;
                      }
                      if (activePaymentMethod === "paypal" && !paymentPaypalEmail.trim()) {
                        alert("Please enter your sender PayPal email or Transaction reference ID!");
                        return;
                      }

                      setIsSubmittingPayment(true);

                      try {
                        const mDocId = `${currUser.email}_to_${video.creator.email}`;
                        const membershipDocRef = doc(db, "memberships", mDocId);
                        
                        // Save directly to the synchronized Firestore DB
                        await setDoc(membershipDocRef, {
                          id: mDocId,
                          subscriberEmail: currUser.email,
                          subscriberName: currUser.username || "Subscriber Member",
                          creatorEmail: video.creator.email,
                          creatorName: video.creator.channelName,
                          paymentMethod: activePaymentMethod === "gcash" ? "GCash" : "PayPal",
                          payoutReference: activePaymentMethod === "gcash" ? paymentGcashRef.trim() : paymentPaypalEmail.trim(),
                          amount: 50,
                          status: "active",
                          timestamp: new Date().toISOString()
                        });

                        setIsMemberPlus(true);
                        alert(`💎 Amen! God Bless! Your monthly Membership+ payment of ₱50 has been successfully synchronized onto ${video.creator.channelName}'s channel via ${activePaymentMethod === "gcash" ? "GCash (" + creatorProfile?.gcash + ")" : "PayPal (" + creatorProfile?.paypal + ")"}!`);
                        
                        setShowMembershipModal(false);
                        setPaymentGcashRef("");
                        setPaymentPaypalEmail("");
                      } catch (err: any) {
                        alert("Database configuration sync issue: " + err.message);
                      } finally {
                        setIsSubmittingPayment(false);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-gray-500 hover:from-yellow-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-yellow-800/10"
                  >
                    {isSubmittingPayment ? "Registering Supporter..." : "Subscribe to Membership+"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Convert seconds into HH:MM:SS / MM:SS formatting helper
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const formattedSecs = secs.toString().padStart(2, "0");
  if (hrs > 0) {
    const formattedMins = mins.toString().padStart(2, "0");
    return `${hrs}:${formattedMins}:${formattedSecs}`;
  }
  return `${mins}:${formattedSecs}`;
}
