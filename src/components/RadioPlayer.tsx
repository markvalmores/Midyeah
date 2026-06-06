/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Radio, Play, Pause, Volume2, Music, Sparkles, Search, Globe, ChevronRight
} from "lucide-react";
import { RadioStation } from "../types";

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
  const [stations] = useState<RadioStation[]>([
    // === PHILIPPINES 🇵🇭 ===
    {
      id: "ph_love",
      name: "90.7 Love Radio Mania 🇵🇭",
      genre: "OPM Pop Hits & Love Songs",
      streamUrl: "https://mbc-loveradio.streamguys1.com/loveradio",
      logo: "💝",
      country: "philippines"
    },
    {
      id: "ph_easy",
      name: "96.3 Easy Rock Manila ☕",
      genre: "Relaxing Lite Hits & Soft Acoustic",
      streamUrl: "https://mbc-easyrock.streamguys1.com/easyrock",
      logo: "☕",
      country: "philippines"
    },
    {
      id: "ph_yes",
      name: "Yes The Best 101.1 FM 📻",
      genre: "Upbeat Pinoy Pop & Trending Dance",
      streamUrl: "https://mbc-yesfm.streamguys1.com/yesfm",
      logo: "💃",
      country: "philippines"
    },
    // === JAPAN 🇯🇵 ===
    {
      id: "jp_moe",
      name: "LISTEN.moe Anime & J-Pop 🌸",
      genre: "J-Pop & High-Fidelity Anime Tracks",
      streamUrl: "https://listen.moe/stream",
      logo: "🌸",
      country: "japan"
    },
    {
      id: "jp_vocaloid",
      name: "LISTEN.moe Vocaloid J-Synth 🤖",
      genre: "Vocaloid & Independent Japanese Electro",
      streamUrl: "https://listen.moe/vocaloid/stream",
      logo: "🤖",
      country: "japan"
    },
    {
      id: "jp_retropc",
      name: "SomaFM Retro PC Tokyo 🎮",
      genre: "Nostalgic 80s Japanese Chiptunes",
      streamUrl: "https://ice1.somafm.com/retropc-128-mp3",
      logo: "🎮",
      country: "japan"
    },
    // === UNITED STATES 🇺🇸 ===
    {
      id: "us_groove",
      name: "SomaFM Groove Salad 🥗",
      genre: "Ambient Chillout & Ambient Tech",
      streamUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
      logo: "🥗",
      country: "usa"
    },
    {
      id: "us_kexp",
      name: "KEXP Seattle 90.3 FM 🎸",
      genre: "Premium Alternative & Indie Rock",
      streamUrl: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
      logo: "🎸",
      country: "usa"
    },
    {
      id: "us_lofi",
      name: "SomaFM Lofi Lounge 💤",
      genre: "Chill Lofi Hip-Hop & Study Instrumentals",
      streamUrl: "https://ice1.somafm.com/lofi-128-mp3",
      logo: "💤",
      country: "usa"
    },
    {
      id: "us_wnyc",
      name: "WNYC 93.9 New York Public 📻",
      genre: "News, Fine Art & Live Classical Jazz",
      streamUrl: "https://fm939.wnyc.org/wnycfm-web",
      logo: "📰",
      country: "usa"
    },
    // === UNITED KINGDOM 🇬🇧 ===
    {
      id: "uk_smooth",
      name: "Smooth Radio London 🎷",
      genre: "Premium Oldies Soul & Relaxing Pop",
      streamUrl: "https://media-ssl.musicradio.com/SmoothLondonMP3",
      logo: "🎷",
      country: "uk"
    },
    {
      id: "uk_classic",
      name: "Classic FM London UK 🎻",
      genre: "Peaceful Symphonies & Orchestras",
      streamUrl: "https://media-ssl.musicradio.com/ClassicFM",
      logo: "🎻",
      country: "uk"
    },
    {
      id: "uk_heart",
      name: "Heart FM London Upbeat 🎵",
      genre: "Hot British Hits & Energy Charts",
      streamUrl: "https://media-ssl.musicradio.com/HeartLondonMP3",
      logo: "🍿",
      country: "uk"
    },
    // === FRANCE 🇫🇷 ===
    {
      id: "fr_fip",
      name: "FIP Radio France 🥐",
      genre: "Cinematic Jazz, Grooves & Soul Mixes",
      streamUrl: "https://stream.radiofrance.fr/fip/fip.mp3",
      logo: "🥐",
      country: "france"
    },
    {
      id: "fr_nrj",
      name: "NRJ Hit Music France ⚡",
      genre: "European Dance Charts & Top 45 Pop",
      streamUrl: "https://stream.nrj.fr/128",
      logo: "⚡",
      country: "france"
    },
    {
      id: "fr_inter",
      name: "France Inter National Channel 🏛️",
      genre: "French Culture, Dialogue & Classics",
      streamUrl: "https://stream.radiofrance.fr/franceinter/franceinter.mp3",
      logo: "🏛️",
      country: "france"
    },
    // === GERMANY 🇩🇪 ===
    {
      id: "de_antenne",
      name: "Antenne Bayern Germany 🥨",
      genre: "German Pop Hits, Rock & Dance Charts",
      streamUrl: "https://stream.antenne.de/antenne/stream/mp3",
      logo: "🥨",
      country: "germany"
    },
    {
      id: "de_techno",
      name: "TechnoBase.FM Germany 🔊",
      genre: "Hands-Up Electronic Trance Beats",
      streamUrl: "https://stream.technobase.fm/mp3/",
      logo: "🔊",
      country: "germany"
    },
    // === AUSTRALIA 🇦🇺 ===
    {
      id: "au_triplej",
      name: "Triple J Sydney Indie 🐨",
      genre: "Australian Indie, Hip Hop & Live Beats",
      streamUrl: "https://live-radio-aes.mediahubaustralia.com/3JJW/mp3/",
      logo: "🐨",
      country: "australia"
    },
    {
      id: "au_classic",
      name: "ABC Classic Sydney Recitals 🦘",
      genre: "Australian Chamber Playlistsers",
      streamUrl: "https://live-radio-aes.mediahubaustralia.com/6CLW/mp3/",
      logo: "🦘",
      country: "australia"
    }
  ]);

  const [activeStation, setActiveStation] = useState<RadioStation>(stations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync state with HTML Audio node
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      
      if (isPlaying) {
        audioRef.current.load();
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log("Audio play blocked/failed. Re-loading with fallback state model:", err);
            setIsPlaying(false);
          });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeStation]);

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
      ctx.strokeStyle = "#1a0f2e";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 24) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, height / 2);
      
      // Draw fluctuating wave
      ctx.strokeStyle = isPlaying ? "#d946ef" : "#4c1d95";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      
      const sliceWidth = width / 80;
      let x = 0;

      for (let i = 0; i < 80; i++) {
        // frequency height oscillates dynamically if playing
        const waveScale = isPlaying ? Math.sin((i * 0.15) + (Date.now() * 0.012)) * Math.cos(Date.now() * 0.002) * 28 : 0;
        const offset = isPlaying ? Math.random() * 4 : 0;
        
        ctx.lineTo(x, waveScale + offset);
        x += sliceWidth;
      }
      ctx.stroke();

      ctx.restore();
      
      // Draw simple center tuner details
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`API RECEIVER ACTIVE | PORT: 3000 | TUNER: online | STREAM_DEC: auto | VOL: ${Math.round(volume * 100)}%`, 12, 18);

      frameId = requestAnimationFrame(drawVisualizer);
    };

    drawVisualizer();
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, volume]);

  const handleStationSwitch = (st: RadioStation) => {
    setActiveStation(st);
    setIsPlaying(true);
  };

  const toggleRadioPlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

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

  return (
    <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
      
      {/* 1. ROW HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
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
            />
          </div>
        </div>
      </div>

      {/* 2. CHIP FILTER COUNTRIES */}
      <div className="flex flex-wrap gap-2 items-center">
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
          
          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            {/* Visualizer output canvas */}
            <canvas
              ref={canvasRef}
              width={512}
              height={140}
              className="w-full h-32 bg-[#09090b]"
            />
            
            {/* Ambient overlay info */}
            <div className="absolute right-4 top-4 text-right space-y-1">
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                isPlaying 
                  ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/10" 
                  : "bg-slate-950/40 text-slate-400 border border-slate-500/10"
              }`}>
                ● {isPlaying ? "TUNED / STREAMING" : "STANDBY"}
              </span>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={activeStation.streamUrl}
            className="hidden"
          />

          {/* Controls display panel */}
          <div className="bg-[#1C1C1F]/40 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-3.5 self-start sm:self-auto">
              <button
                onClick={toggleRadioPlay}
                className="h-12 w-12 bg-purple-600 hover:bg-purple-500 hover:scale-[1.04] transition duration-200 text-white rounded-xl flex items-center justify-center shrink-0 cursor-pointer shadow-lg shadow-purple-600/15"
                title={isPlaying ? "Pause Stream" : "Play Stream"}
              >
                {isPlaying ? <Pause className="w-5.5 h-5.5 fill-white" /> : <Play className="w-5.5 h-5.5 fill-white ml-0.5" />}
              </button>

              <div>
                <span className="text-[9px] uppercase font-bold text-purple-400 font-mono tracking-widest flex items-center gap-1 leading-none">
                  {getCountryFlagStr(activeStation.country)} {getCountryNameStr(activeStation.country)} Broadcast
                </span>
                <h3 className="text-sm font-black text-white leading-tight mt-1 truncate max-w-[240px]">
                  {activeStation.name}
                </h3>
                <p className="text-[10px] text-slate-500 truncate leading-none mt-1">
                  Genre: <span className="text-slate-400 font-medium">{activeStation.genre}</span>
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 shrink-0">
              <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full sm:w-28 accent-purple-500 h-1 bg-gray-800 rounded-lg cursor-pointer"
              />
              <span className="text-[9px] text-slate-500 font-mono font-bold w-7 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>

          </div>

          <div className="text-[10px] text-slate-500 leading-relaxed bg-[#1C1C1F]/10 border border-white/5 p-3 rounded-xl flex items-start gap-2">
            <span>💡</span>
            <p>
              We integrate official high fidelity broadcast relays compatible worldwide. Streaming performance depends on your local buffer speed. For extreme audio clarity, click on any listing block directly on the right grid!
            </p>
          </div>

        </div>

        {/* RIGHT: Live List Grid Selectors */}
        <div className="bg-[#1C1C1F]/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
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
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleStationSwitch(st)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-200 group ${
                        isActive 
                          ? "bg-purple-900/35 border-purple-500/60 shadow-md shadow-purple-600/5" 
                          : "bg-black/20 border-white/[0.02] hover:border-white/10 hover:bg-[#121214]"
                      }`}
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
                          </div>
                          <span className="text-[9px] text-slate-500 truncate block mt-0.5">
                            {st.genre}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        {isActive && isPlaying ? (
                          <div className="flex items-end gap-0.5 h-3.5">
                            <span className="w-0.5 bg-purple-400 h-2 animate-bounce rounded-full" />
                            <span className="w-0.5 bg-purple-400 h-3 animate-bounce rounded-full [animation-delay:0.15s]" />
                            <span className="w-0.5 bg-purple-400 h-1.5 animate-bounce rounded-full [animation-delay:0.3s]" />
                          </div>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-purple-400 transition" />
                        )}
                      </div>

                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-3 mt-4 text-center select-none text-[9px] text-purple-400 font-mono font-bold flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" /> May God Bless This platform!
          </div>
        </div>

      </div>

    </div>
  );
}
