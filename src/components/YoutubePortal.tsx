/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Youtube, Search, ExternalLink, Sparkles, Tv, ArrowUpRight, CheckCircle2, 
  HelpCircle, Monitor, Shield, Zap, RefreshCw, Volume2, Info
} from "lucide-react";
import { motion } from "motion/react";

interface CuratedChannel {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
  subs: string;
  description: string;
}

export default function YoutubePortal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");

  const curatedChannels: CuratedChannel[] = [
    {
      id: "muse-asia",
      name: "Muse Asia",
      url: "https://www.youtube.com/@MuseAsia",
      logo: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=150&q=80",
      category: "Anime",
      subs: "6.5M+ Subscribers",
      description: "Official legal anime streams across Asia. Premium simulcasts completely free and legal."
    },
    {
      id: "lofi-girl",
      name: "Lofi Girl",
      url: "https://www.youtube.com/@LofiGirl",
      logo: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=150&q=80",
      category: "Music",
      subs: "14.3M+ Subscribers",
      description: "The world's most famous radio space for studying, working, or relaxing lofi beats."
    },
    {
      id: "mkbhd",
      name: "Marques Brownlee",
      url: "https://www.youtube.com/@mkbhd",
      logo: "https://images.unsplash.com/photo-1468436139062-f60a71c5c892?auto=format&fit=crop&w=150&q=80",
      category: "Tech & Science",
      subs: "18.8M+ Subscribers",
      description: "Uncompromised, high-fidelity reviews of modern smartphones and consumer tech gadgets."
    },
    {
      id: "ani-one-asia",
      name: "Ani-One Asia",
      url: "https://www.youtube.com/@AniOneAsia",
      logo: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=150&q=80",
      category: "Anime",
      subs: "3.2M+ Subscribers",
      description: "Another powerhouse of official licensed anime distributing incredible action titles in HD quality."
    },
    {
      id: "chillhop",
      name: "Chillhop Music",
      url: "https://www.youtube.com/@ChillhopMusic",
      logo: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?auto=format&fit=crop&w=150&q=80",
      category: "Music",
      subs: "3.3M+ Subscribers",
      description: "Smooth background beats, cozy lounge compilations, and interactive creative vibes."
    },
    {
      id: "veritasium",
      name: "Veritasium",
      url: "https://www.youtube.com/@veritasium",
      logo: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=150&q=80",
      category: "Tech & Science",
      subs: "14.9M+ Subscribers",
      description: "Mind-bending truth elements, science experiments, physics debates, and beautiful space maps."
    }
  ];

  const handleSearchLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const finalQuery = encodeURIComponent(searchQuery.trim());
    window.open(`https://www.youtube.com/results?search_query=${finalQuery}`, "_blank", "noopener,noreferrer");
  };

  const handlePortalLaunch = () => {
    window.open("https://www.youtube.com/", "_blank", "noopener,noreferrer");
  };

  const filteredChannels = searchCategory === "all" 
    ? curatedChannels
    : curatedChannels.filter(c => c.category === searchCategory);

  return (
    <div className="space-y-6 animate-fade-in" id="youtube-portal-container">
      {/* Premium YouTube Portal Header */}
      <motion.div 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950/40 via-[#180a0a]/90 to-purple-950/30 border border-red-500/30 p-6 sm:p-8 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-3 max-w-2xl text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-red-400/20">
            <Youtube className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>YouTube Gateway Portal 📺</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-red-200 to-rose-300 tracking-tight leading-none uppercase">
            Watch On YouTube
          </h2>
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
            Seamless redirection into the YouTube broadcasting ecosystem. Discover original videos, legal anime streaming channels, global music streams, and explore tutorials without blockages.
          </p>
        </div>

        {/* Big Action Red-Button Link Trigger */}
        <div className="flex flex-col items-center gap-3 bg-[#160606]/80 border border-red-500/30 rounded-2xl p-5 min-w-[260px] shadow-2xl z-10 text-center">
          <span className="text-[10px] font-mono text-red-400 tracking-widest uppercase font-black">Official Service Router</span>
          <button
            onClick={handlePortalLaunch}
            className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-950/60 border border-red-400/30 cursor-pointer transition-all active:scale-[0.98] group"
          >
            <Youtube className="w-4 h-4 fill-white text-white" />
            <span>OPEN YOUTUBE PORTAL</span>
            <ArrowUpRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
          <span className="text-[9px] text-gray-500 lowercase font-mono break-all selection:bg-red-950">
            https://www.youtube.com/
          </span>
        </div>
      </motion.div>

      {/* Embedded Quick Search Engine */}
      <motion.div
        className="bg-[#121216]/95 border border-white/5 rounded-2xl p-6 shadow-xl"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-white uppercase tracking-wider">
              Instant YouTube Query Router
            </h3>
            <p className="text-xs text-gray-400">
              Type your query below to automatically bypass standard menus and jump straight to the search results index on YouTube.
            </p>
          </div>

          <form onSubmit={handleSearchLaunch} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                <Search className="w-4 h-4 text-purple-400" />
              </span>
              <input
                type="text"
                placeholder="Search topics, anime simulators, tech, lofi tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1b1b22] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all font-medium"
              />
            </div>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-purple-400/20 active:scale-[0.98]"
            >
              <span>Search YouTube</span>
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Preset searches triggers */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-500 font-mono uppercase mr-1">Trending Tags:</span>
            {["Lofi Chill Live", "Muse Asia Anime", "Official Live Concerts", "ASMR Ambient Soundscape", "Curated Space Maps"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSearchQuery(tag);
                  const encoded = encodeURIComponent(tag);
                  window.open(`https://www.youtube.com/results?search_query=${encoded}`, "_blank", "noopener,noreferrer");
                }}
                className="text-[10px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 py-1 px-2.5 rounded-lg font-medium transition cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Curated YouTube Stations Hub */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-yellow-400 animate-pulse" />
              <span>Recommended Creators & Channels</span>
            </h3>
            <p className="text-xs text-gray-400">
              Hand-picked YouTube destinations offering premium legalized broadcasting.
            </p>
          </div>

          {/* Quick tab filters */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start">
            {["all", "Anime", "Music", "Tech & Science"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSearchCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${searchCategory === cat ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {cat === "all" ? "All Channels" : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => (
            <div 
              key={channel.id}
              className="group bg-[#15151b] border border-white/5 rounded-2xl p-5 hover:border-red-500/20 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-[#202028]">
                    <img 
                      src={channel.logo} 
                      alt={channel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white tracking-tight group-hover:text-red-400 transition">
                      {channel.name}
                    </h4>
                    <span className="text-[10px] text-gray-500 font-mono block">
                      {channel.subs}
                    </span>
                  </div>
                </div>

                <p className="text-gray-400 text-xs leading-relaxed min-h-[36px]">
                  {channel.description}
                </p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between">
                <span className="text-[9px] font-extrabold tracking-wider bg-red-950/60 border border-red-500/35 px-2 py-0.5 rounded-full text-red-300 uppercase">
                  {channel.category}
                </span>

                <button
                  onClick={() => window.open(channel.url, "_blank")}
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 group-hover:text-purple-300 font-extrabold cursor-pointer transition"
                >
                  <span>Forward Channel</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guide Card - How to enjoy ad-free YouTube safely */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#12121c] to-[#0d0d14] border border-white/5 rounded-2xl p-6 space-y-4 shadow-xl">
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-purple-400" />
            <span>Optimal YouTube Performance Practices</span>
          </h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Ensure maximum speed, perfect video delivery, and secure viewing across external video hubs by implementing standard modern tips:
          </p>

          <ul className="space-y-2.5 text-xs">
            <li className="flex items-start gap-2 text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Use localized browser profiles with active pop-up blocks to keep external tracking scripts out of your viewing room.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Sign in with your standard Premium account on external portals to enjoy ad-free seamless anime releases.</span>
            </li>
            <li className="flex items-start gap-2 text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>When streaming under low-bandwidth networks, manually preset YouTube quality setting to 720p or 1080p.</span>
            </li>
          </ul>
        </div>

        {/* Dynamic Spiritual Blessing / Dev Note requested on other channels */}
        <div className="bg-amber-950/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-500">
              <Info className="w-5 h-5" />
              <span className="text-xs font-extrabold uppercase tracking-widest font-mono">Spiritual Blessings Note & Support</span>
            </div>
            
            <p className="text-xs text-amber-100/80 leading-relaxed italic">
              &quot;MidYeah portal links and streaming servers operate with highest fidelity. We aim to construct more interactive video spaces to foster peace, joy, and wonderful entertainment under modern tech paradigms.&quot;
            </p>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/10 rounded-xl p-3.5">
            <p className="text-[11px] sm:text-xs font-black text-amber-300 uppercase leading-relaxed font-mono">
              MAY GOD BLESSES US AMEN. KEEP REFRESHING AND ENJOY AMAZING MEMORIES SOON WITH US!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
