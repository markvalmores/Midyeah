import React, { useState, useEffect } from "react";
import { 
  Search, Sparkles, Filter, Calendar, Tag, Clock, Globe, Trash2, 
  RefreshCw, Play, Video as VideoIcon, Tv, Compass, Eye, Heart, Layers, HelpCircle
} from "lucide-react";
import { Video } from "../types";

interface SearchTabProps {
  videosList: Video[];
  onPlayVideo: (video: Video) => void;
  onSwitchTab: (tab: any) => void;
}

// Highly stylized, hand-picked anime background presets
const ANIME_PRESETS = [
  {
    id: "twilight",
    name: "Cozy Twilight",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80",
    credits: "Pixel Bedroom Art"
  },
  {
    id: "neon-tokyo",
    name: "Cyber Tokyo",
    url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80",
    credits: "Glowing Night scape"
  },
  {
    id: "ramen",
    name: "Sakura Shrine",
    url: "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80",
    credits: "Kyoto Blossoms"
  },
  {
    id: "stars",
    name: "Space Stars Vibe",
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
    credits: "Cosmic Sky"
  }
];

export default function SearchTab({ videosList, onPlayVideo, onSwitchTab }: SearchTabProps) {
  // Query state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters state
  const [filterTimeframe, setFilterTimeframe] = useState<"all" | "day" | "week" | "month" | "year">("all");
  const [filterGenre, setFilterGenre] = useState<"all" | "normal" | "movie" | "rental">("all");
  const [filterLength, setFilterLength] = useState<"all" | "short" | "medium" | "long">("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [isRandomSort, setIsRandomSort] = useState(false);

  // Background customization state
  const [selectedBg, setSelectedBg] = useState<string>(ANIME_PRESETS[0].url);
  const [bgBlur, setBgBlur] = useState<number>(4);
  const [bgOpacity, setBgOpacity] = useState<number>(35);
  const [customBgUrl, setCustomBgUrl] = useState<string>("");
  const [isFetchingAnimeApi, setIsFetchingAnimeApi] = useState(false);
  const [apiError, setApiError] = useState("");

  // Quick state details
  const [filteredResults, setFilteredResults] = useState<Video[]>([]);

  // Random Anime Waifu API trigger
  const fetchRandomAnimeBackground = async () => {
    setIsFetchingAnimeApi(true);
    setApiError("");
    try {
      // Nekos.best is a wonderful public anime image endpoint
      const res = await fetch("https://nekos.best/api/v2/neko");
      if (!res.ok) throw new Error("Server responded with error status");
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].url) {
        setSelectedBg(data.results[0].url);
      } else {
        throw new Error("Invalid schema received");
      }
    } catch (err) {
      console.warn("Failed to contact Nekos.best API, rolling back to fallback", err);
      // Fallback
      const fallbackUrl = `https://picsum.photos/1200/800?sig=${Math.floor(Math.random() * 1000)}`;
      setSelectedBg(fallbackUrl);
    } finally {
      setIsFetchingAnimeApi(false);
    }
  };

  // Custom User BG URL submission
  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customBgUrl.trim().startsWith("http")) {
      setSelectedBg(customBgUrl.trim());
      setCustomBgUrl("");
    }
  };

  // Run complex filters on videosList
  useEffect(() => {
    let result = [...videosList];

    // 1. Text filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(v => 
        v.title.toLowerCase().includes(q) || 
        v.description.toLowerCase().includes(q) ||
        (v.creator?.channelName && v.creator.channelName.toLowerCase().includes(q))
      );
    }

    // 2. Genre Category filter
    if (filterGenre !== "all") {
      result = result.filter(v => v.category === filterGenre);
    }

    // 3. Location/Country filter
    if (filterCountry !== "all") {
      result = result.filter(v => {
        const vCountry = (v.country || "philippines").toLowerCase();
        return vCountry === filterCountry;
      });
    }

    // 4. Length/Duration filter
    if (filterLength !== "all") {
      result = result.filter(v => {
        const dur = v.duration || 120; // seconds
        if (filterLength === "short") return dur <= 60; // 1 min and under
        if (filterLength === "medium") return dur > 60 && dur <= 300; // 1-5 mins
        if (filterLength === "long") return dur > 300; // over 5 mins
        return true;
      });
    }

    // 5. Date timeframe filter
    if (filterTimeframe !== "all") {
      const now = new Date();
      result = result.filter(v => {
        if (!v.uploadDate) return true;
        
        // Parse "MM/DD/YYYY" or "YYYY-MM-DD" style dates
        try {
          const parts = v.uploadDate.split("/");
          let uploadTime = now.getTime();
          if (parts.length === 3) {
            const dateObj = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
            uploadTime = dateObj.getTime();
          } else {
            uploadTime = Date.parse(v.uploadDate);
          }
          
          if (isNaN(uploadTime)) return true;

          const diffMs = now.getTime() - uploadTime;
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (filterTimeframe === "day") return diffDays <= 1.5; // past day
          if (filterTimeframe === "week") return diffDays <= 7.5; // past week
          if (filterTimeframe === "month") return diffDays <= 31.5; // past month
          if (filterTimeframe === "year") return diffDays <= 366; // past year
        } catch {
          return true; // fail gracefully
        }
        return true;
      });
    }

    // 6. Random Sorter choice
    if (isRandomSort) {
      // Fisher-Yates-like simple array shuffle
      result = result.sort(() => Math.random() - 0.5);
    }

    setFilteredResults(result);
  }, [searchQuery, filterGenre, filterCountry, filterLength, filterTimeframe, isRandomSort, videosList]);

  // Clean all filters to default
  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterTimeframe("all");
    setFilterGenre("all");
    setFilterLength("all");
    setFilterCountry("all");
    setIsRandomSort(false);
  };

  // Choose a random match for instant playback
  const handleShufflePick = () => {
    if (filteredResults.length > 0) {
      const index = Math.floor(Math.random() * filteredResults.length);
      onPlayVideo(filteredResults[index]);
    }
  };

  return (
    <div id="midyeah-search-plat" className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#09090b]">
      
      {/* Dynamic Custom Anime Wallpaper Background Container */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-700 bg-cover bg-center pointer-events-none"
        style={{ 
          backgroundImage: `url(${selectedBg})`,
          opacity: bgOpacity / 100,
          filter: `blur(${bgBlur}px)`
        }}
      />
      
      {/* Top overlay highlight mesh */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/80 via-[#0e0a16]/95 to-[#09090b] z-0 pointer-events-none" />

      {/* Primary Content Grid */}
      <div className="relative z-10 p-6 md:p-8 space-y-8">
        
        {/* Header Title Accent */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="space-y-1">
            <span className="text-[10px] bg-purple-600/30 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-full font-bold font-mono uppercase tracking-wider">
              🍥 Advanced Global Discovery
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Anime Search Space <Sparkles className="w-5 h-5 text-purple-400 animate-spin" style={{ animationDuration: "6s" }} />
            </h2>
            <p className="text-[10px] text-gray-400">Search the entire Midyeah catalog with interactive SFW anime-inspired backing tracks & filters.</p>
          </div>

          {/* Wallpaper Panel controls */}
          <div className="bg-[#121214]/90 border border-white/10 rounded-2xl p-3 flex flex-col gap-2 max-w-sm">
            <div className="flex items-center gap-1.5 justify-between">
              <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">🎭 Canvas Customizer</span>
              <button 
                type="button"
                onClick={fetchRandomAnimeBackground}
                disabled={isFetchingAnimeApi}
                className="bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white font-bold text-[8px] px-2 py-1 rounded-lg transition-transform flex items-center gap-1 cursor-pointer font-mono"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isFetchingAnimeApi ? 'animate-spin' : ''}`} />
                {isFetchingAnimeApi ? "GENERATING..." : "RAMEN API WALLPAPER"}
              </button>
            </div>

            {/* Presets and URL dropdown */}
            <div className="flex flex-wrap gap-1.5 mt-1 border-b border-white/5 pb-2">
              {ANIME_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedBg(p.url)}
                  className={`px-2 py-0.5 rounded text-[8px] font-bold border transition cursor-pointer ${
                    selectedBg === p.url 
                      ? "bg-purple-500/20 border-purple-400 text-purple-200" 
                      : "bg-black/60 border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Slider tuning controls for opacity & blur */}
            <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-gray-400">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>OPACITY:</span>
                  <span className="text-purple-300 font-extrabold">{bgOpacity}%</span>
                </div>
                <input 
                  type="range" min="10" max="80" 
                  value={bgOpacity} 
                  onChange={(e) => setBgOpacity(parseInt(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-black rounded"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>BLUR LEVEL:</span>
                  <span className="text-purple-300 font-extrabold">{bgBlur}px</span>
                </div>
                <input 
                  type="range" min="0" max="12" 
                  value={bgBlur} 
                  onChange={(e) => setBgBlur(parseInt(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-black rounded"
                />
              </div>
            </div>

            {/* Prompt custom wall URL */}
            <form onSubmit={handleApplyCustomUrl} className="flex gap-1 mt-1">
              <input
                type="url"
                placeholder="Paste direct .png/.jpg anime art URL..."
                value={customBgUrl}
                onChange={(e) => setCustomBgUrl(e.target.value)}
                className="flex-1 bg-black/60 border border-white/5 p-1 rounded text-[8px] text-white outline-none focus:border-purple-500 font-mono"
              />
              <button 
                type="submit"
                className="bg-purple-900 border border-purple-700/60 text-white font-bold text-[8px] px-1.5 rounded cursor-pointer"
              >
                APPLY
              </button>
            </form>
          </div>
        </div>

        {/* GLOWING MAIN SEARCH BAR */}
        <div className="relative group max-w-2xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-400 rounded-2xl blur opacity-20 group-hover:opacity-35 transition duration-500" />
          <div className="relative bg-[#121214]/90 border border-white/10 rounded-2xl p-1.5 flex items-center justify-between gap-3 shadow-2xl">
            <div className="flex items-center gap-3 pl-3.5 flex-1">
              <Search className="w-5 h-5 text-purple-400 shrink-0" />
              <input
                type="text"
                placeholder="What cinematic masterpiece are you dreaming of? Search video titles, tags, channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-white text-sm outline-none placeholder-purple-300/30 font-semibold py-1.5"
                id="global-anime-search-input"
              />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="text-[10px] font-bold font-mono text-gray-500 hover:text-white px-2 py-1 rounded"
              >
                ESC CLEAR
              </button>
            )}
          </div>
        </div>

        {/* ADVANCED FILTER SHEETS PANEL */}
        <div className="bg-[#121214]/65 border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <span className="text-[10px] font-extrabold text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> High-Resolution Filter Presets
            </span>

            {/* Quick Actions Panel */}
            <div className="flex items-center gap-2">
              {filteredResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleShufflePick}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-[9px] px-3 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer uppercase shadow-md"
                  title="Pick and play one random matching video instantly!"
                >
                  🎲 Shuffle Play Match ({filteredResults.length})
                </button>
              )}
              
              <button
                type="button"
                onClick={handleResetFilters}
                className="bg-purple-950/40 hover:bg-purple-900 border border-purple-500/20 text-purple-300 font-bold font-mono text-[9px] px-3 py-1 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3" /> CLEAR FILTERS
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Filter Group: Date/Timeframe */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-[#caaaff] font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 text-purple-400" /> By Date Released
              </label>
              <div className="flex flex-col gap-1">
                {[
                  { key: "all", label: "🗓️ All-Time Catalog" },
                  { key: "day", label: "⏳ Today / Past 24h" },
                  { key: "week", label: "📅 This Week" },
                  { key: "month", label: "🌙 This Month" },
                  { key: "year", label: "📆 This Year" }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterTimeframe(item.key as any)}
                    className={`text-left text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                      filterTimeframe === item.key 
                        ? "bg-purple-600/30 border-purple-500 text-white font-extrabold" 
                        : "bg-black/25 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Group: Genre/Category */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-[#caaaff] font-bold uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 text-purple-400" /> By Format & Category
              </label>
              <div className="flex flex-col gap-1">
                {[
                  { key: "all", label: "🎞️ All Categories" },
                  { key: "normal", label: "🎬 Standard Broadcast" },
                  { key: "movie", label: "🎥 Full-Length Cinema" },
                  { key: "rental", label: "📽️ Premium Rental Exclusive" }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterGenre(item.key as any)}
                    className={`text-left text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                      filterGenre === item.key 
                        ? "bg-purple-600/30 border-purple-500 text-white font-extrabold" 
                        : "bg-black/25 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Group: Format / Length */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-[#caaaff] font-bold uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-purple-400" /> By Film Length
              </label>
              <div className="flex flex-col gap-1">
                {[
                  { key: "all", label: "⏱️ Any Stream Length" },
                  { key: "short", label: "⚡ Shorts / Clip (<= 1m)" },
                  { key: "medium", label: "📻 Normal / Music (1-5m)" },
                  { key: "long", label: "🪐 Long Cinema (> 5m)" }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterLength(item.key as any)}
                    className={`text-left text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                      filterLength === item.key 
                        ? "bg-purple-600/30 border-purple-500 text-white font-extrabold" 
                        : "bg-black/25 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Group: Country and Location Source */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-[#caaaff] font-bold uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-2.5 h-2.5 text-purple-400" /> By Production Location
              </label>
              <div className="flex flex-col gap-1">
                {[
                  { key: "all", label: "🗺️ Global / Any Location" },
                  { key: "philippines", label: "🇵🇭 Philippines" },
                  { key: "japan", label: "🇯🇵 Japan / Anime Hub" },
                  { key: "usa", label: "🇺🇸 United States" },
                  { key: "uk", label: "🇬🇧 United Kingdom" },
                  { key: "france", label: "🇫🇷 France" },
                  { key: "germany", label: "🇩🇪 Germany" },
                  { key: "australia", label: "🇦🇺 Australia" }
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterCountry(item.key)}
                    className={`text-left text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                      filterCountry === item.key 
                        ? "bg-purple-600/30 border-purple-500 text-white font-extrabold" 
                        : "bg-black/25 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Random sort matches check */}
              <div className="pt-2 border-t border-white/5 mt-2 text-left">
                <label className="flex items-center gap-1.5 text-[10px] text-gray-300 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRandomSort}
                    onChange={(e) => setIsRandomSort(e.target.checked)}
                    className="accent-purple-500 rounded"
                  />
                  <span>🎲 Randomize Matches Sorter</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* RESULTS OVERVIEW TITLE */}
        <div className="flex items-center justify-between text-xs font-mono font-bold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">
          <span>🎥 Broadcast Search Outcomes:</span>
          <span className="text-purple-300 bg-purple-950/45 px-2.5 py-0.5 rounded-full text-[10px]">
            {filteredResults.length} {filteredResults.length === 1 ? "Video" : "Videos"} Synced
          </span>
        </div>

        {/* SEARCH OUTCOMES GRID */}
        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResults.map((vid) => {
              const countryEmojis: Record<string, string> = {
                philippines: "🇵🇭",
                japan: "🇯🇵",
                usa: "🇺🇸",
                uk: "🇬🇧",
                france: "🇫🇷",
                germany: "🇩🇪",
                australia: "🇦🇺"
              };
              const countryLabel = vid.country ? vid.country.substring(0, 1).toUpperCase() + vid.country.substring(1) : "Global";
              const emoji = vid.country ? countryEmojis[vid.country.toLowerCase()] || "🌐" : "🌐";

              return (
                <div
                  key={vid.id}
                  onClick={() => onPlayVideo(vid)}
                  className="bg-[#121214]/90 border border-white/10 rounded-2xl overflow-hidden group cursor-pointer hover:border-purple-500/30 transition duration-250 shadow-md hover:shadow-xl hover:-translate-y-0.5 flex flex-col justify-between"
                >
                  {/* Video thumbnail cover visual */}
                  <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                    {vid.category === "rental" ? (
                      <span className="absolute top-2 left-2 bg-amber-600/95 font-bold text-[9px] text-amber-50 rounded px-1.5 py-0.5 shadow-md z-10 uppercase tracking-wider">
                        Rental ${vid.rentalPrice}
                      </span>
                    ) : vid.category === "movie" ? (
                      <span className="absolute top-2 left-2 bg-purple-600/90 font-bold text-[9px] text-white rounded px-1.5 py-0.5 shadow-md z-10 uppercase tracking-wider">
                        🎬 Cinema Movie
                      </span>
                    ) : null}

                    {vid.is360 && (
                      <span className="absolute top-2 right-2 bg-purple-950/90 text-purple-300 font-bold text-[8px] font-mono rounded px-1.5 py-0.5 border border-purple-500/40 z-10 flex items-center gap-1">
                        🌀 360° VR
                      </span>
                    )}

                    <span className="absolute bottom-2 left-2 bg-black/80 text-[8px] text-gray-300 font-bold rounded px-1.5 py-0.5 z-10 flex items-center gap-1 border border-white/5">
                      <span>{emoji}</span>
                      <span className="font-mono uppercase">{countryLabel}</span>
                    </span>

                    {/* Wave elements when hover */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-purple-950/10 z-[5] transition duration-300" />
                    
                    <div className="absolute opacity-0 group-hover:opacity-100 transition duration-300 bg-purple-600/80 p-3.5 rounded-full z-10 scale-90 group-hover:scale-100 flex items-center justify-center">
                      <Play className="text-white fill-white w-5 h-5 ml-0.5" />
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
                        <VideoIcon className="w-6 h-6" />
                        <span className="text-[8px] font-mono font-bold tracking-wider uppercase">Loading Stream</span>
                      </div>
                    )}
                  </div>

                  {/* Title description details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="font-extrabold text-[#ccaaff] text-xs leading-snug tracking-wide line-clamp-1 group-hover:text-white transition duration-200">
                          {vid.title}
                        </h4>
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                        {vid.description || "No broadcast synopsis provided."}
                      </p>
                    </div>

                    <div className="pt-3.5 border-t border-white/5 flex items-center justify-between gap-2 mt-3 text-[9px] font-semibold text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <img 
                          src={vid.creator?.avatarUrl} 
                          className="w-4 h-4 rounded-full border border-purple-500/20" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-purple-300 truncate max-w-[80px] hover:underline">
                          {vid.creator?.channelName || "Midyeah Host"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-mono">
                        <Eye className="w-3 h-3 text-gray-500" />
                        <span>{vid.views || 0}</span>
                        <Heart className="w-3 h-3 text-purple-500 ml-1" />
                        <span>{vid.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Gomenasai - empty state */
          <div className="bg-[#121214]/80 border border-white/5 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-2xl backdrop-blur-md">
            <span className="text-4xl animate-bounce inline-block">🍥</span>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-purple-300 uppercase tracking-widest">Gomenasai! No Broadcasts Match</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Could not find any videos matching your selected filters or search text. No worries! Try clearing the filters below to browse our standard collections.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider py-2 px-5 rounded-xl transition shadow-md cursor-pointer"
            >
              🔄 RESET ALL FILTERS
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
