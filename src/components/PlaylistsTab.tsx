/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, FolderHeart, Trash2, Video as VideoIcon, Play, Folder, 
  Clock, LogIn, ChevronRight, Check, X, Sparkles, FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Playlist, Video, UserProfile } from "../types";
import { 
  getPlaylistsByOwner, createPlaylist, updatePlaylist, deletePlaylist 
} from "../db";

interface PlaylistsTabProps {
  currUser: UserProfile | null;
  videosList: Video[];
  onPlayVideo: (video: Video) => void;
  onSwitchTab: (tab: "home" | "rooms" | "radio" | "community" | "profile" | "playlists") => void;
}

export default function PlaylistsTab({ currUser, videosList, onPlayVideo, onSwitchTab }: PlaylistsTabProps) {
  console.log("PlaylistsTab rendering, currUser:", currUser);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadUserPlaylists();
  }, [currUser]);

  const loadUserPlaylists = async () => {
    if (!currUser?.email) return;
    setLoading(true);
    try {
      const data = await getPlaylistsByOwner(currUser.email);
      setPlaylists(data);
      if (data.length > 0 && !selectedPlaylistId) {
        setSelectedPlaylistId(data[0].id);
      }
    } catch (err) {
      console.error("Error loading playlists:", err);
      setErrorMsg("Failed to load your custom playlists. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currUser?.email || !newPlaylistName.trim()) return;

    try {
      setErrorMsg(null);
      const created = await createPlaylist(newPlaylistName.trim(), currUser.email);
      setPlaylists(prev => [created, ...prev]);
      setSelectedPlaylistId(created.id);
      setNewPlaylistName("");
      setIsCreating(false);
    } catch (err) {
      console.error("Failed creating playlist:", err);
      setErrorMsg("Could not create playlist. Please verify permission settings.");
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!window.confirm("Permanently delete this playlist? This action cannot be undone.")) return;
    try {
      await deletePlaylist(id);
      setPlaylists(prev => prev.filter(p => p.id !== id));
      if (selectedPlaylistId === id) {
        const remaining = playlists.filter(p => p.id !== id);
        setSelectedPlaylistId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error("Failed deleting playlist:", err);
    }
  };

  const handleRemoveVideo = async (playlistId: string, videoId: string) => {
    const list = playlists.find(p => p.id === playlistId);
    if (!list) return;

    const updatedVideoIds = list.videoIds.filter(id => id !== videoId);
    const updatedList = { ...list, videoIds: updatedVideoIds };

    try {
      await updatePlaylist(updatedList);
      setPlaylists(prev => prev.map(p => p.id === playlistId ? updatedList : p));
    } catch (err) {
      console.error("Failed removing video from playlist:", err);
    }
  };

  const activePlaylist = playlists.find(p => p.id === selectedPlaylistId) || null;

  // Resolve matching videos for the current active list
  const activeVideos = activePlaylist
    ? activePlaylist.videoIds
        .map(id => videosList.find(v => v.id === id))
        .filter((v): v is Video => !!v)
    : [];

  if (!currUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto space-y-6">
        <div className="h-16 w-16 bg-purple-950/40 border border-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-2xl shadow-lg">
          🔒
        </div>
        <div>
          <h3 className="font-extrabold text-lg text-white">Join the Community</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Please log in or sign up above to create, personalize, and synchronize custom playlists on the global watchtower grid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[450px]">
      {/* 2. LEFT SIDEBAR/DRAWER: Playlists Listing */}
      <div className="md:col-span-1 bg-[#121214] border border-white/15 rounded-3xl p-4 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-100 flex items-center gap-2">
              <FolderHeart className="w-4 h-4 text-purple-400" /> Playlists
            </h3>
            
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="p-1.5 hover:bg-white/10 rounded-xl transition text-purple-400 hover:text-purple-300"
              title="Create new Playlist"
            >
              {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {/* Inline input creator form */}
          <AnimatePresence>
            {isCreating && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreatePlaylist}
                className="mt-3 space-y-2 overflow-hidden"
              >
                <input
                  type="text"
                  required
                  placeholder="E.g., Chill J-Pop Mix ☕"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-white/10 text-xs px-3 py-2 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-600 font-medium"
                />
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Main Selectors list */}
          <div className="mt-4 space-y-1">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {!loading && playlists.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Folder className="w-8 h-8 mx-auto stroke-[1.5] text-slate-600 mb-2" />
                <p className="text-[10px] leading-relaxed">No playlists found. Create one to curate your favorites!</p>
              </div>
            )}

            {!loading && playlists.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlaylistId(p.id)}
                className={`w-full flex items-center justify-between text-left p-2.5 rounded-xl text-xs cursor-pointer transition ${
                  p.id === selectedPlaylistId 
                    ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/10" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white font-medium"
                }`}
              >
                <span className="truncate flex items-center gap-2">
                  {p.id === selectedPlaylistId ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
                  {p.name}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                  p.id === selectedPlaylistId ? "bg-white/20 text-white" : "bg-[#1C1C1F] text-slate-400"
                }`}>
                  {p.videoIds.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1C1C1F]/40 p-3 rounded-2xl border border-white/5 space-y-1">
          <p className="text-[9px] text-[#ccaaff] font-mono leading-tight flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-pulse" /> CLOUD STORAGE SYNCED
          </p>
          <p className="text-[8px] text-slate-500 leading-normal">
            Lists are linked to {currUser.email || "account"}. Take them offline anytime with Local IndexedDB.
          </p>
        </div>
      </div>

      {/* 3. RIGHT PANEL: Active Selected Playlist videos details */}
      <div className="md:col-span-3 bg-[#121214] border border-white/15 rounded-3xl p-6 flex flex-col justify-between space-y-6">
        <div>
          {activePlaylist ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <span className="text-[9px] font-bold text-purple-400 tracking-wider font-mono">ACTIVE CURATED MIX</span>
                <h2 className="text-lg font-black text-white leading-tight mt-0.5">{activePlaylist.name}</h2>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                  <Clock className="w-3 h-3" /> Created {new Date(activePlaylist.createdAt).toLocaleDateString()} • {activeVideos.length} videos list
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeVideos.length > 0 && (
                  <button
                    onClick={() => onPlayVideo(activeVideos[0])}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-1.5 px-4 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" /> Play Mix
                  </button>
                )}
                
                <button
                  onClick={() => handleDeletePlaylist(activePlaylist.id)}
                  className="bg-transparent border border-red-500/20 hover:border-red-500 hover:bg-red-950/20 text-red-400 p-1.5 rounded-xl transition cursor-pointer"
                  title="Delete playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-4xl">📂🥤</div>
              <h3 className="font-bold text-slate-300 mt-4">Select or Create a Playlist</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                Organize and queue up dynamic presentation videos. Start customizing your cozy theater stream space!
              </p>
            </div>
          )}

          {/* Validation issue notification */}
          {errorMsg && (
            <div className="bg-red-950/25 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs mt-4">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Playlist content loop */}
          {activePlaylist && (
            <div className="mt-6">
              {activeVideos.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/5 bg-[#1C1C1F]/20 rounded-2xl">
                  <VideoIcon className="w-10 h-10 stroke-[1.2] text-slate-600 mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-bold">This playlist is completely empty</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Browse other creator videos and click the "Add to Playlist" folder icons to save them here!
                  </p>
                  <button
                    onClick={() => onSwitchTab("home")}
                    className="mt-4 bg-[#1C1C1F] hover:bg-purple-600 hover:text-white border border-white/10 text-slate-300 text-xs p-1.5 px-4 rounded-xl transition duration-200 cursor-pointer"
                  >
                    Browse Videos
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {activeVideos.map((vid, idx) => (
                    <div
                      key={`${vid.id}-${idx}`}
                      className="bg-[#1C1C1F]/40 border border-white/5 rounded-2xl p-2.5 hover:bg-[#1C1C1F] hover:border-white/10 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="text-[10px] font-mono text-slate-500 w-4 text-center">
                          {idx + 1}
                        </div>
                        
                        {/* Play button indicator trigger */}
                        <div 
                          onClick={() => onPlayVideo(vid)}
                          className="h-10 w-16 bg-black rounded-lg relative overflow-hidden flex items-center justify-center border border-white/5 group-hover:border-purple-500/20 transition cursor-pointer"
                        >
                          <Play className="opacity-0 group-hover:opacity-100 w-4 h-4 text-white hover:scale-110 transition absolute z-10 fill-white" />
                          {vid.thumbnailUrl ? (
                            <img 
                              src={vid.thumbnailUrl} 
                              alt="" 
                              className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-purple-950/20" />
                          )}
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-purple-950/20 z-[5] transition duration-300"></div>
                        </div>

                        <div className="truncate">
                          <h4 
                            onClick={() => onPlayVideo(vid)}
                            className="text-xs font-bold text-gray-200 truncate group-hover:text-purple-400 transition cursor-pointer"
                          >
                            {vid.title}
                          </h4>
                          <p className="text-[9px] text-purple-400 font-semibold uppercase">{vid.creator?.channelName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPlayVideo(vid)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/5 text-purple-400 rounded-xl transition cursor-pointer"
                          title="Stream Now"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveVideo(activePlaylist.id, vid.id)}
                          className="p-1.5 hover:bg-red-950/20 text-slate-500 hover:text-red-400 rounded-xl transition cursor-pointer"
                          title="Remove from list"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {activePlaylist && activePlaylist.videoIds.length > 0 && (
          <div className="border-t border-white/5 pt-4 text-[10px] text-slate-500 flex items-center justify-between">
            <span>💡 Click a video row block to start seamless, ad-free watching.</span>
            <span>Total: {activeVideos.length} Streams</span>
          </div>
        )}
      </div>
    </div>
  );
}
