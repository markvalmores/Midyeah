/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Tv, ExternalLink, Sparkles, Play, RefreshCw, Info, Heart, Gift, MonitorPlay, Film, ArrowUpRight
} from "lucide-react";
import { motion } from "motion/react";

interface AnimeServer {
  id: string;
  name: string;
  url: string;
  description: string;
  tags: string[];
  recommendedStyle: string;
  avatarPlaceholder: string;
}

export default function WatchSection() {
  const [activeServer, setActiveServer] = useState<string | null>(null);

  const animeServers: AnimeServer[] = [
    {
      id: "server1",
      name: "Server 1",
      url: "https://animepahe.ch/",
      description: "Fast-loading, high-quality anime database featuring the latest series and subbed releases. One of the cleanest streaming directories.",
      tags: ["High Quality", "Fast Load", "Subbed"],
      recommendedStyle: "from-indigo-600 to-cyan-500 shadow-indigo-500/20",
      avatarPlaceholder: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "server2",
      name: "Server 2",
      url: "https://animepahe.pw/",
      description: "Alternative fast delivery server node optimized for smooth bandwidth and seamless playback experience. Packed with library archives.",
      tags: ["Alt Node", "Optimized", "Huge Library"],
      recommendedStyle: "from-purple-600 to-pink-500 shadow-purple-500/20",
      avatarPlaceholder: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: "server3",
      name: "Server 3",
      url: "https://www.youtube.com/@MuseAsia",
      description: "Official Muse Asia YouTube Channel. Enjoy fully license-cleared anime streams, free of ads (with YT Premium) and completely legal!",
      tags: ["Official YouTube", "100% Legal", "Community"],
      recommendedStyle: "from-red-600 to-rose-500 shadow-rose-500/20",
      avatarPlaceholder: "https://images.unsplash.com/photo-1541562232579-512a21360020?auto=format&fit=crop&w=400&q=80"
    }
  ];

  const handleLaunchServer = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6" id="watch-section-container">
      {/* Anime Section Header Banner */}
      <motion.div 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/60 via-[#1e1136]/80 to-indigo-900/50 border border-purple-500/30 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-3 max-w-2xl text-center md:text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-purple-400/20">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Watch Anime Hub 🍙</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#e8d5ff] to-cyan-200 tracking-tight leading-none uppercase">
            Anime Broadcasting Zone
          </h2>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
            Explore premium selected nodes to watch your favorite anime streams. Supported with ultra-fast mirrors, official channels, and premium index files.
          </p>
        </div>

        {/* Dynamic visual indicator badge */}
        <div className="flex flex-col items-center gap-2 bg-[#10091d]/80 border border-purple-500/20 rounded-2xl p-4 min-w-[200px] shadow-inner z-10">
          <span className="text-[10px] font-mono text-purple-400 tracking-widest uppercase">System Standby</span>
          <div className="flex items-center gap-1.5 text-base font-extrabold text-emerald-400 animate-pulse">
            <MonitorPlay className="w-5 h-5 text-emerald-400" />
            <span>3 Active Servers</span>
          </div>
          <p className="text-[9px] text-gray-500 text-center uppercase font-mono mt-1">Ready for redirect</p>
        </div>
      </motion.div>

      {/* Main Server Selection & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {animeServers.map((server, idx) => (
          <motion.div
            key={server.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
            className={`group bg-[#16161e]/90 border border-white/5 rounded-2xl p-5 hover:border-purple-500/30 transition-all duration-300 flex flex-col justify-between shadow-lg relative overflow-hidden`}
            id={`server-card-${server.id}`}
          >
            {/* Ambient subtle backglow hover background */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 via-purple-500/0 to-purple-500/5 group-hover:to-purple-500/10 pointer-events-none transition-all duration-300" />
            
            <div className="space-y-4">
              {/* Cover Art Image Header */}
              <div className="relative h-40 w-full rounded-xl overflow-hidden border border-white/10 group-hover:border-purple-500/20 transition-all">
                <img 
                  src={server.avatarPlaceholder} 
                  alt={server.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3">
                  <div className="flex items-center gap-2">
                    {server.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[8px] sm:text-[9px] font-extrabold tracking-wider text-purple-300 bg-purple-950/80 border border-purple-500/40 px-1.5 py-0.5 rounded-full uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Server title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition duration-150 uppercase tracking-tight">
                    {server.name}
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">SERVER STATE: ONLINE</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed min-h-[48px]">
                  {server.description}
                </p>
              </div>
            </div>

            {/* Launch Options */}
            <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-2">
              <button
                onClick={() => handleLaunchServer(server.url)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 border border-purple-400/30 group-hover:shadow-purple-500/10 cursor-pointer transition-all active:scale-[0.98]"
                id={`launch-btn-${server.id}`}
              >
                <Play className="w-4 h-4 text-white fill-white" />
                <span>Launch {server.name}</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>

              <div className="text-center">
                <span className="text-[9px] font-mono text-gray-500 select-none uppercase tracking-widest break-all">
                  {server.url}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Required Note Display Banner styling */}
      <motion.div 
        className="relative overflow-hidden rounded-2xl bg-amber-950/20 border border-amber-500/30 p-5 shadow-lg flex flex-col md:flex-row items-center gap-4 mt-4"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        id="anime-note-banner"
      >
        <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
          <Tv className="w-6 h-6 text-amber-400 animate-pulse" />
        </div>
        <div className="space-y-1 text-center md:text-left flex-1">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Important Announcement & Notes</span>
          </p>
          {/* Note content required explicitly by prompt constraint */}
          <h4 className="text-xs sm:text-xs md:text-sm font-black text-amber-300 uppercase tracking-wide leading-relaxed font-mono">
            &quot;MORE ANIME SERVER TO WATCH SOON KEEP REFRESHING WHEN YOU HAVE TIME MAY GOD BLESSES US AMEN&quot;
          </h4>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-extrabold uppercase rounded-full border border-amber-500/20 select-none">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "50s" }} />
          <span>Keep Refreshing!</span>
        </div>
      </motion.div>

      {/* Guide/Faq for watching comfort */}
      <div className="bg-[#121214]/60 border border-white/5 rounded-2xl p-6 sm:p-7 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-purple-400" />
          <span>How to watch on MidYeah Server Mirrors?</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
            <span className="font-extrabold text-purple-300">1. Click Launch Button</span>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Launch server elements to access standard dynamic streams safely. Links open in premium dedicated sandbox browser tabs.
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
            <span className="font-extrabold text-purple-300">2. Adblock Advisories</span>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              Servers 1 and 2 pack lots of episodes under mirror catalogs. We recommend you run on modern browser profiles to isolate pop-up elements.
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
            <span className="font-extrabold text-[#ddaaff]">3. God Blessings Note</span>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              More high fidelity anime indexes will sync automatically to memory over standard updates. Enjoy standard entertainment!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
