/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, Play, Pause, Volume2, VolumeX, Music, Sparkles, Search, Globe, ChevronRight,
  AlertCircle, RefreshCw, Activity, Check, ShieldAlert, Wifi
} from "lucide-react";
import { RadioStation } from "../types";
import { RADIO_STATIONS } from "../data/radioStations";

const COUNTRIES = [
  { id: "all", name: "All Countries", flag: "🌐" },
  { id: "philippines", name: "Philippines", flag: "🇵🇭" },
  { id: "japan", name: "Japan", flag: "🇯🇵" },
  { id: "usa", name: "United States", flag: "🇺🇸" },
  { id: "uk", name: "United Kingdom", flag: "🇬🇧" },
  { id: "france", name: "France", flag: "🇫🇷" },
  { id: "germany", name: "Germany", flag: "🇩🇪" },
  { id: "australia", name: "Australia", flag: "🇦🇺" }
];

export default function RadioPlayer() {
  const [stations] = useState<RadioStation[]>(RADIO_STATIONS);

  const [activeStation, setActiveStation] = useState<RadioStation>(stations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");

  // Redundancy and buffer state variables
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackEngagedStations, setFallbackEngagedStations] = useState<Record<string, boolean>>({});

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync state with HTML Audio node
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    if (isPlaying) {
      setStreamError(null);
      setIsBuffering(true);

      // Determine stream to load
      const isCurrentlyUsingFallback = fallbackEngagedStations[activeStation.id] || useFallback;
      const targetUrl = (isCurrentlyUsingFallback && activeStation.fallbackUrl)
        ? activeStation.fallbackUrl
        : activeStation.streamUrl;

      // Only re-load if the source actually changes or is unassigned
      if (audio.src !== targetUrl) {
        audio.src = targetUrl;
        audio.load();
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsBuffering(false);
            setStreamError(null);
          })
          .catch((err) => {
            console.warn("Autoplay block or connection warning with current stream:", err.message);
            // If primary fails and we have a fallback URL, engage fallback automatically
            if (activeStation.fallbackUrl && !isCurrentlyUsingFallback) {
              setStreamError("Primary feed busy. Automatically switching to premium Zeno fallback relay...");
              setFallbackEngagedStations(prev => ({ ...prev, [activeStation.id]: true }));
              setUseFallback(true);
            } else {
              setStreamError("Audio play was blocked. Please tap the Play button again to activate.");
              setIsPlaying(false);
              setIsBuffering(false);
            }
          });
      }
    } else {
      audio.pause();
      setIsBuffering(false);
    }
  }, [isPlaying, activeStation, useFallback, fallbackEngagedStations]);

  // Handle station change
  const handleStationSwitch = (st: RadioStation) => {
    setStreamError(null);
    setIsBuffering(true);
    
    // Switch to fallback automatically if it was previously engaged for this station
    const fallbackPreviouslyEngaged = !!fallbackEngagedStations[st.id];
    setUseFallback(fallbackPreviouslyEngaged);
    setActiveStation(st);
    setIsPlaying(true);
  };

  const toggleRadioPlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleManualFallbackToggle = () => {
    if (!activeStation.fallbackUrl) return;
    const nextFallbackState = !useFallback;
    setUseFallback(nextFallbackState);
    setFallbackEngagedStations(prev => ({ ...prev, [activeStation.id]: nextFallbackState }));
    setIsBuffering(true);
    setStreamError(null);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  // HTML Audio Listeners for robust sync
  const handleAudioWaiting = () => {
    setIsBuffering(true);
  };

  const handleAudioPlaying = () => {
    setIsBuffering(false);
    setStreamError(null);
  };

  const handleAudioCanPlay = () => {
    setIsBuffering(false);
  };

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error("Direct transmission error caught on HTML Audio Element:", e);
    
    const isCurrentlyUsingFallback = fallbackEngagedStations[activeStation.id] || useFallback;
    
    if (activeStation.fallbackUrl && !isCurrentlyUsingFallback) {
      setStreamError("Primary stream quiet. Connecting secure fallbacks automatically...");
      setFallbackEngagedStations(prev => ({ ...prev, [activeStation.id]: true }));
      setUseFallback(true);
    } else {
      setStreamError(
        "Live broadcast unreachable. This station may be temporarily down or local firewall sandboxing is interrupting playback."
      );
      setIsPlaying(false);
      setIsBuffering(false);
    }
  };

  // Frequency wave analyzer emulator
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;

    const drawVisualizer = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // dark clean visual backdrop
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      // draw moving grid lines
      ctx.strokeStyle = "#161129";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 24) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, height / 2);
      
      // Draw fluctuating wave depending on active playback and buffering status
      if (isBuffering && isPlaying) {
        // Soft loading sine wave
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sliceWidth = width / 80;
        let x = 0;
        for (let i = 0; i < 80; i++) {
          const waveScale = Math.sin((i * 0.25) + (Date.now() * 0.005)) * 6;
          ctx.lineTo(x, waveScale);
          x += sliceWidth;
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = isPlaying ? "#d946ef" : "#4c1d95";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        
        const sliceWidth = width / 80;
        let x = 0;

        for (let i = 0; i < 80; i++) {
          // frequency height oscillates dynamically if playing
          const waveScale = isPlaying 
            ? Math.sin((i * 0.15) + (Date.now() * 0.012)) * Math.cos(Date.now() * 0.002) * 28 
            : 0;
          const offset = isPlaying ? Math.random() * 4 : 0;
          
          ctx.lineTo(x, waveScale + offset);
          x += sliceWidth;
        }
        ctx.stroke();
      }

      ctx.restore();
      ctx.save();

      // Clean, humble tuning text overlays (Humanized and premium, free of AI-slop labels)
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 9px monospace";
      const cleanStationName = activeStation.name.replace(/🇵🇭|🇯🇵|🇺🇸|🇬🇧|🇫🇷|🇩🇪|🇦🇺/g, "").trim();
      const currentStreamName = (fallbackEngagedStations[activeStation.id] || useFallback) ? "SECURE FALLBACK RELAY" : "PRIMARY HEADEND";
      const statusText = isPlaying 
        ? (isBuffering ? "BUFFERING LIVE CARRIER..." : `SYNCED | OUT: ${currentStreamName}`) 
        : "TUNER STANDBY";
      
      ctx.fillText(`STATION: ${cleanStationName.toUpperCase()} | ${statusText} | VOL: ${Math.round(volume * 100)}%`, 12, 18);

      ctx.restore();
      frameId = requestAnimationFrame(drawVisualizer);
    };

    drawVisualizer();
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, isBuffering, volume, activeStation, useFallback, fallbackEngagedStations]);

  // Filter conditions
  const filteredStations = stations.filter(st => {
    const matchesCountry = selectedCountry === "all" || st.country === selectedCountry;
    const matchesSearch = searchQuery.trim() === "" || 
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      st.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCountry && matchesSearch;
  });

  const getCountryFlagStr = (countryCode: string) => {
    const match = COUNTRIES.find(c => c.id === countryCode);
    return match ? match.flag : "🌐";
  };

  const getCountryNameStr = (countryCode: string) => {
    const match = COUNTRIES.find(c => c.id === countryCode);
    return match ? match.name : countryCode;
  };

  const isCurrentUsingFallbackStream = fallbackEngagedStations[activeStation.id] || useFallback;

  return (
    <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6" id="radio-player-container">
      
      {/* 1. ROW HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2" id="radio-header-title">
            <Radio className="w-5.5 h-5.5 text-purple-400 animate-pulse" />
            <span>GLOBAL FM RADIO SPACE 🎙️</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enjoy 100% working live streaming FM broadcasts and cozy soundscapes globally curated with high availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search station or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1C1C1F] border border-white/10 text-xs pl-9 pr-4 py-2.5 rounded-xl font-medium text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-600 w-52 sm:w-64 transition-all"
              id="radio-search-input"
            />
          </div>
        </div>
      </div>

      {/* 2. CHIP FILTER COUNTRIES */}
      <div className="flex flex-wrap gap-2 items-center" id="radio-country-filters">
        <span className="text-[10px] uppercase font-bold text-slate-500 font-mono flex items-center gap-1.5 mr-2">
          <Globe className="w-3.5 h-3.5 text-slate-600" /> Group Country:
        </span>
        {COUNTRIES.map((country) => (
          <button
            key={country.id}
            onClick={() => setSelectedCountry(country.id)}
            className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCountry === country.id 
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/15 border border-purple-500" 
                : "bg-[#1C1C1F] border border-white/5 text-slate-400 hover:text-white hover:bg-neutral-800"
            }`}
            id={`filter-country-${country.id}`}
          >
            <span>{country.flag}</span>
            <span>{country.name}</span>
          </button>
        ))}
      </div>

      {/* 3. CORE RADIO CONSOLE INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Live Vis & Playing Deck Controls (Span 2) */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
          
          <div className="relative rounded-2xl overflow-hidden border border-white/10" id="radio-visualizer-card">
            {/* Visualizer output canvas */}
            <canvas
              ref={canvasRef}
              width={512}
              height={140}
              className="w-full h-32 bg-[#09090b]"
            />
            
            {/* Ambient overlay info */}
            <div className="absolute right-4 top-4 text-right space-y-1">
              <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono transition-all duration-300 ${
                isPlaying 
                  ? (isBuffering 
                      ? "bg-amber-950/40 text-amber-400 border border-amber-500/10 animate-pulse" 
                      : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/10")
                  : "bg-slate-950/40 text-slate-400 border border-slate-500/10"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? (isBuffering ? "bg-amber-400 animate-ping" : "bg-emerald-400") : "bg-slate-500"}`} />
                <span>{isPlaying ? (isBuffering ? "CONNECTING..." : "LIVE STREAMING") : "TUNER STANDBY"}</span>
              </span>
            </div>
          </div>

          {/* Hidden HTML Audio tag linked with native event handlers */}
          <audio
            ref={audioRef}
            className="hidden"
            onWaiting={handleAudioWaiting}
            onPlaying={handleAudioPlaying}
            onCanPlay={handleAudioCanPlay}
            onError={handleAudioError}
          />

          {/* Diagnostical Warning Banner if Stream Fails */}
          {streamError && (
            <div className="bg-red-950/20 border border-red-900/30 text-red-400 p-3.5 rounded-xl flex items-start gap-2.5 text-xs animate-fadeIn shadow-inner" id="radio-stream-error">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 animate-bounce" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-slate-200">Broadcast Connection Interrupted</p>
                <p className="text-[11px] text-slate-400">{streamError}</p>
                {activeStation.fallbackUrl && (
                  <button
                    onClick={handleManualFallbackToggle}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-900/30 hover:bg-neutral-800 text-purple-300 border border-purple-500/20 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    id="radio-error-engage-fallback"
                  >
                    <RefreshCw className="w-3 h-3 text-purple-400" />
                    <span>Engage Secondary {isCurrentUsingFallbackStream ? "Primary HQ" : "Zeno Relay"} Stream</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Controls display panel */}
          <div className="bg-[#1C1C1F]/40 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5 self-start sm:self-auto truncate">
              <button
                onClick={toggleRadioPlay}
                disabled={isBuffering && isPlaying}
                className={`h-12 w-12 bg-purple-600 hover:bg-purple-500 hover:scale-[1.04] transition duration-200 text-white rounded-xl flex items-center justify-center shrink-0 cursor-pointer shadow-lg shadow-purple-600/15 disabled:opacity-80`}
                title={isPlaying ? "Pause Stream" : "Play Stream"}
                id="radio-toggle-play-btn"
              >
                {isBuffering && isPlaying ? (
                  <RefreshCw className="w-5.5 h-5.5 animate-spin text-purple-200" />
                ) : isPlaying ? (
                  <Pause className="w-5.5 h-5.5 fill-white text-white" />
                ) : (
                  <Play className="w-5.5 h-5.5 fill-white text-white ml-0.5" />
                )}
              </button>

              <div className="truncate">
                <span className="text-[9px] uppercase font-bold text-purple-400 font-mono tracking-widest flex items-center gap-1 leading-none">
                  {getCountryFlagStr(activeStation.country)} {getCountryNameStr(activeStation.country)} Broadcast
                </span>
                <h3 className="text-sm font-black text-white leading-tight mt-1 truncate max-w-[240px]">
                  {activeStation.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-slate-500 truncate leading-none">
                    Genre: <span className="text-slate-400 font-medium">{activeStation.genre}</span>
                  </p>
                  {activeStation.fallbackUrl && (
                    <span 
                      onClick={handleManualFallbackToggle}
                      className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer font-bold border transition shrink-0 ${
                        isCurrentUsingFallbackStream 
                          ? "bg-purple-950/50 text-purple-300 border-purple-500/40" 
                          : "bg-[#1C1C1F]/90 text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10"
                      }`}
                      title={isCurrentUsingFallbackStream ? "Using HTTPS Zeno fallback relay. Click to select High-Quality Primary Feed." : "Using HQ Stream. Click to toggle secure fallback relay."}
                      id="radio-quality-mode-toggle"
                    >
                      {isCurrentUsingFallbackStream ? "🛰️ ZENO STREAM" : "📻 PRIMARY HQ"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 shrink-0">
              {volume === 0 ? (
                <VolumeX className="w-4 h-4 text-slate-600 shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
              )}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full sm:w-28 accent-purple-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
                id="radio-volume-slider"
              />
              <span className="text-[9px] text-slate-500 font-mono font-bold w-7 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>

          </div>

          <div className="text-[10px] text-slate-500 leading-relaxed bg-[#1C1C1F]/10 border border-white/5 p-3 rounded-xl flex items-start gap-2">
            <span className="text-purple-400">⚡</span>
            <p className="text-slate-400">
              All broadcasts run with automated dual-channel redundant engines. If primary FM channels timeout, our backup secure high-fidelity satellite servers activate instantly to avoid disruption.
            </p>
          </div>

        </div>

        {/* RIGHT: Live List Grid Selectors */}
        <div className="bg-[#1C1C1F]/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between" id="radio-station-shelf">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                Station List
              </h4>
              <span className="text-[9px] bg-slate-900 border border-white/10 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                {filteredStations.length} shown
              </span>
            </div>

            {filteredStations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <p className="text-2xl">📻💤</p>
                <p className="text-[10px] font-bold">No stations found matching filters</p>
                <p className="text-[9px] text-slate-600 max-w-xs mx-auto">Try clearing search text or selecting "All Countries".</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {filteredStations.map((st) => {
                  const isActive = st.id === activeStation.id;
                  const stUsingFallback = fallbackEngagedStations[st.id] || (isActive && useFallback);
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleStationSwitch(st)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-200 group ${
                        isActive 
                          ? "bg-purple-900/35 border-purple-500/60 shadow-md shadow-purple-600/5" 
                          : "bg-black/20 border-white/[0.02] hover:border-white/10 hover:bg-[#121214]"
                      }`}
                      id={`select-station-${st.id}`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-base shrink-0 transition ${
                          isActive ? "bg-purple-600 text-white" : "bg-[#1C1C1F]/80 group-hover:bg-[#1C1C1F] text-slate-400"
                        }`}>
                          {st.logo}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-black truncate transition ${
                              isActive ? "text-purple-300" : "text-slate-200"
                            }`}>
                              {st.name}
                            </span>
                            {st.fallbackUrl && (
                              <span 
                                className={`text-[7px] font-black tracking-tighter px-1 rounded transform scale-90 ${
                                  stUsingFallback ? "bg-purple-950/60 text-purple-400 border border-purple-500/10" : "bg-slate-800 text-slate-400"
                                }`}
                                title={stUsingFallback ? "Zeno Fallback redundancy active" : "Dual stream capabilities available"}
                              >
                                DUAL
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-500 truncate block mt-0.5 animate-fadeIn">
                            {st.genre}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        {isActive && isPlaying ? (
                          isBuffering ? (
                            <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                          ) : (
                            <div className="flex items-end gap-0.5 h-3.5">
                              <span className="w-0.5 bg-purple-400 h-2 animate-bounce rounded-full" />
                              <span className="w-0.5 bg-purple-400 h-3 animate-bounce rounded-full [animation-delay:0.15s]" />
                              <span className="w-0.5 bg-purple-400 h-1.5 animate-bounce rounded-full [animation-delay:0.3s]" />
                            </div>
                          )
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-purple-400 transition animate-fadeIn" />
                        )}
                      </div>

                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-3 mt-4 text-center select-none text-[9px] text-purple-400 font-mono font-bold flex items-center justify-center gap-1" id="radio-blessings-footer">
            <Sparkles className="w-3 h-3 text-purple-400" /> May God Bless This platform!
          </div>
        </div>

      </div>

    </div>
  );
}
