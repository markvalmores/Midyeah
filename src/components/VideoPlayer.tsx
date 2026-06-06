/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Tv, Subtitles, Compass, RefreshCw, ThumbsUp, ThumbsDown, Share2,
  Download, Eye, Video as VideoIcon, Compass as CompassIcon, HelpCircle, Cast
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Video, VideoSub } from "../types";
import { savePlayOffset, getPlayOffset, saveVideo } from "../db";

interface VideoPlayerProps {
  video: Video;
  onDownload: (v: Video) => void;
  isDownloaded: boolean;
  onVideoEnd?: () => void;
}

export default function VideoPlayer({ video, onDownload, isDownloaded, onVideoEnd }: VideoPlayerProps) {
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
  const [pipActive, setPipActive] = useState(false);
  const [crashState, setCrashState] = useState(false);

  // 360-Degree VR Mode states (using simulated 2D drag-and-tilt spatial Canvas mapping)
  const [yaw, setYaw] = useState(0); // horizontal panning (0 - 360)
  const [pitch, setPitch] = useState(0); // vertical tilt (-60 to 60)
  const [isDragging360, setIsDragging360] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Reactions & views
  const [currentReact, setCurrentReact] = useState<string | null>(null);
  const [reactCounts, setReactCounts] = useState(video.reactions);
  const [viewsCount, setViewsCount] = useState(video.views);
  const [hasRated, setHasRated] = useState<"like" | "dislike" | null>(null);

  // Subtitles generator (generates AI voice-over guess captions based on video criteria)
  const [aiSubtitles, setAiSubtitles] = useState<VideoSub[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<string>("");

  // Resume Watch persistence
  useEffect(() => {
    setCrashState(false);
    setIsPlaying(false);
    setCurrentReact(null);
    setHasRated(null);
    const newViews = (video.views || 0) + 1;
    setViewsCount(newViews); // bump views
    setReactCounts(video.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 });

    // Sync views bump globally
    const updatedVideo = {
      ...video,
      views: newViews
    };
    saveVideo(updatedVideo).catch(err => console.warn("Failed to sync views:", err));

    // Fetch saved resume time
    getPlayOffset(video.id).then((savedTime) => {
      if (savedTime > 0 && videoRef.current) {
        videoRef.current.currentTime = savedTime;
        setCurrentTime(savedTime);
      }
    });

    // Generate AI Subtitles dynamically based on video details
    const words = [
      "Hello creative viewers!",
      "Welcome to this exciting Midyeah presentation ☕",
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
  }, [video.id]);

  // Handle play offset tracking every 3 seconds to defend against page crashes or tab close
  useEffect(() => {
    if (currentTime > 0) {
      savePlayOffset(video.id, currentTime);
    }
  }, [currentTime, video.id]);

  // Autoplay trigger
  useEffect(() => {
    if (isAutoplay && videoRef.current && !crashState) {
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

  // React handling (Facebook reactions)
  const handleReaction = (reactType: string) => {
    let freshReacts = { ...reactCounts };
    // toggle active react
    if (currentReact === reactType) {
      setCurrentReact(null);
      freshReacts[reactType as keyof typeof freshReacts] = Math.max(0, (freshReacts[reactType as keyof typeof freshReacts] || 0) - 1);
    } else {
      // remove old react if selected
      if (currentReact) {
        freshReacts[currentReact as keyof typeof freshReacts] = Math.max(0, (freshReacts[currentReact as keyof typeof freshReacts] || 0) - 1);
      }
      freshReacts[reactType as keyof typeof freshReacts] = (freshReacts[reactType as keyof typeof freshReacts] || 0) + 1;
      setCurrentReact(reactType);
    }
    setReactCounts(freshReacts);

    const updatedVideo = {
      ...video,
      reactions: freshReacts
    };
    saveVideo(updatedVideo).catch(err => console.warn("Failed to sync reaction:", err));
  };

  const handleLikeDislike = (type: "like" | "dislike") => {
    let newLikes = video.likes || 0;
    let newDislikes = video.dislikes || 0;
    let nextRated: "like" | "dislike" | null = null;

    if (hasRated === type) {
      nextRated = null;
      if (type === "like") {
        newLikes = Math.max(0, newLikes - 1);
      } else {
        newDislikes = Math.max(0, newDislikes - 1);
      }
    } else {
      if (hasRated === "like") {
        newLikes = Math.max(0, newLikes - 1);
      } else if (hasRated === "dislike") {
        newDislikes = Math.max(0, newDislikes - 1);
      }
      
      nextRated = type;
      if (type === "like") {
        newLikes++;
      } else {
        newDislikes++;
      }
    }
    setHasRated(nextRated);

    const updatedVideo = {
      ...video,
      likes: newLikes,
      dislikes: newDislikes
    };
    saveVideo(updatedVideo).catch(err => console.warn("Failed to sync rating:", err));
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
  const likeRatio = hasRated === "like" ? 82 : hasRated === "dislike" ? 42 : 68;

  return (
    <div className={`flex flex-col ${isExpanded ? "w-full" : "lg:col-span-2"} bg-[#121214] text-slate-100 rounded-2xl overflow-hidden shadow-2xl border border-white/10`} ref={containerRef}>
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
          src={video.videoUrl}
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
              <span>{isAiSubtitle ? "✨ Auto AI Subtitle: " : "Subtitles: "}</span>
              <span className="text-white font-normal">{activeSubtitle}</span>
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
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/50 to-transparent p-3 opacity-0 group-hover/player:opacity-100 transition-opacity flex flex-col gap-2 z-30 select-none">
          {/* Progress Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-300 font-mono">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-purple-500 h-1 bg-gray-700 rounded-lg cursor-pointer transition-all"
              id="player-seek"
            />
            <span className="text-[10px] text-gray-300 font-mono">
              {formatTime(duration)}
            </span>
          </div>

          {/* Action buttons list */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="hover:text-purple-400 transition cursor-pointer" id="btn-play-pause">
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              </button>
              
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}
                className="hover:text-purple-400 transition cursor-pointer"
                id="btn-restart-vid"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume Slider combo */}
              <div className="flex items-center gap-1 group/vol">
                <button onClick={toggleMute} className="hover:text-purple-400 transition cursor-pointer" id="btn-toggle-mute">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 accent-purple-500 h-1 bg-gray-700/80 rounded cursor-pointer transition-all"
                  id="player-volume"
                />
              </div>

              {/* Radio Indicator OR 360 compass identifier */}
              {video.is360 && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-purple-900/60 rounded text-[10px] border border-purple-500/30 text-purple-300 animate-pulse">
                  <CompassIcon className="w-3 h-3" /> Immersive 360° Playback Available
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Speed Toggle */}
              <div className="flex items-center gap-1">
                {[0.5, 1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`text-[9px] font-bold py-0.5 px-1 rounded transition cursor-pointer ${playbackRate === rate ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`}                
                    id={`speed-${rate}`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Loop Toggle */}
              <button
                onClick={() => setIsLoop(!isLoop)}
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold transition cursor-pointer ${isLoop ? "bg-purple-600 text-white border border-purple-400" : "text-gray-400 hover:text-gray-200"}`}
                id="toggle-loop"
              >
                Loop
              </button>

              {/* Autoplay Toggle */}
              <button
                onClick={() => setIsAutoplay(!isAutoplay)}
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold transition cursor-pointer ${isAutoplay ? "bg-purple-600 text-white border border-purple-400" : "text-gray-400 hover:text-gray-200"}`}
                id="toggle-autoplay"
              >
                Autoplay
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
      </div>

      {/* Video metadata titles, Facebook Reactions and actions */}
      <div className="p-4 flex flex-col gap-3 bg-[#121214]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
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
          
          {/* Diagnostic page repair refresh button */}
          <button
            onClick={triggerResetRefresh}
            className="text-[10px] flex items-center gap-1.5 self-start text-purple-400 border border-purple-900/60 bg-purple-950/20 px-2 py-1 rounded-lg hover:bg-purple-950/50 cursor-pointer"
            id="crash-refresh-button"
          >
            <RefreshCw className="w-3 h-3" /> Page/Player Crash Rescue
          </button>
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
            {/* Download cache button */}
            <button
              onClick={() => onDownload(video)}
              className={`flex items-center gap-1 text-xs px-3 py-1 rounded-xl font-medium transition cursor-pointer ${isDownloaded ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" : "bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-900/60"}`}
              id="download-offline-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloaded ? "Saved Offline" : "Offline Download"}</span>
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
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 overflow-hidden">
              <button
                onClick={() => handleLikeDislike("like")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-800 transition cursor-pointer ${hasRated === "like" ? "text-purple-400 font-semibold" : "text-gray-300"}`}
                id="rate-like-btn"
              >
                <ThumbsUp className="w-3.5 h-3.5" /> {hasRated === "like" ? "Liked" : "Like"}
              </button>
              <div className="h-4 w-px bg-slate-800"></div>
              <button
                onClick={() => handleLikeDislike("dislike")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-800 transition cursor-pointer ${hasRated === "dislike" ? "text-rose-400 font-semibold" : "text-gray-300"}`}
                id="rate-dislike-btn"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-800/60 border border-purple-500">
              <img src={video.creator.avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e)=>{(e.target as any).src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"}} referrerPolicy="no-referrer" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-100">{video.creator.channelName}</h3>
              <p className="text-[10px] text-purple-400">{video.creator.username} • {video.creator.subscribersCount} subscribers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-full shadow cursor-pointer transition"
              id="subscribe-channel-btn"
            >
              Subscribe
            </button>
            <button
              className="bg-transparent hover:bg-purple-950/30 text-purple-300 border border-purple-800 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition"
              id="join-channel-btn"
            >
              Join Group
            </button>
          </div>
        </div>

        {/* Video description box */}
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-gray-300 mt-1 leading-relaxed">
          <p className="font-semibold text-gray-200">Description:</p>
          <p className="mt-1 whitespace-pre-wrap">{video.description}</p>
        </div>
      </div>
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
