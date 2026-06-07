/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  ArrowLeft, CheckCircle, Share2, Globe, Heart, Play, 
  Tv, Sparkles, Flame, UserCheck, Calendar, ShieldCheck 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, Video } from "../types";
import Profile from "./Profile";

interface DedicatedProfilePageProps {
  ownerProfile: UserProfile;
  currentUser: UserProfile | null;
  creatorVideos: Video[];
  onPlayVideo: (video: Video) => void;
  onUpdateProfile: (updated: UserProfile) => void;
  onBack: () => void;
  onLogOut?: () => void;
  onDeleteAccount?: () => void;
}

export default function DedicatedProfilePage({
  ownerProfile,
  currentUser,
  creatorVideos,
  onPlayVideo,
  onUpdateProfile,
  onBack,
  onLogOut,
  onDeleteAccount
}: DedicatedProfilePageProps) {
  const [showEditMode, setShowEditMode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);

  const isOwnProfile = currentUser && currentUser.email === ownerProfile.email;

  // Real-time calculation based on videos
  const creatorLikes = creatorVideos.reduce((acc, v) => acc + (v.likes || 0), 0);
  const creatorViews = creatorVideos.reduce((acc, v) => acc + (v.views || 0), 0);
  const watchHrs = creatorVideos.reduce((acc, v) => acc + (((v.duration || 0) * (v.views || 0)) / 3600), 0);
  const isVerified = (ownerProfile.subscribersCount || 0) >= 777 || isOwnProfile;

  const profileUrl = `${window.location.origin}/profile/${ownerProfile.username || "usagyuunvtuber"}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Dynamic Header Toolbar */}
      <div className="flex items-center justify-between bg-[#121214] p-4 rounded-2xl border border-white/10 shadow-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black uppercase text-purple-400 bg-purple-950/40 hover:bg-purple-900/60 p-2.5 px-4 rounded-xl border border-purple-800/20 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Lobby</span>
        </button>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <button
              onClick={() => setShowEditMode(!showEditMode)}
              className={`text-xs font-bold uppercase p-2.5 px-4 rounded-xl transition cursor-pointer border ${
                showEditMode 
                  ? "bg-purple-600 text-white border-purple-500" 
                  : "bg-[#1C1C1F] hover:bg-[#252528] text-purple-300 border-white/10"
              }`}
            >
              {showEditMode ? "View Public Page" : "Edit Profile Settings"}
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-200 bg-[#1C1C1F] hover:bg-[#252528] p-2.5 px-4 rounded-xl border border-white/10 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            <span>{copiedLink ? "Copied!" : "Share Profile"}</span>
          </button>
        </div>
      </div>

      {showEditMode && isOwnProfile ? (
        <div className="animate-fade-in">
          <div className="mb-4 bg-purple-950/20 border border-purple-800/40 p-4 rounded-2xl text-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-purple-300">Profile Customizer Active</h3>
            <p className="text-[10px] text-purple-400 mt-1">Changes are saved instantly to multiple redundant local layers & Firebase servers.</p>
          </div>
          <Profile 
            profile={ownerProfile}
            userVideos={creatorVideos}
            onUpdate={onUpdateProfile}
            onLogOut={onLogOut}
            onDeleteAccount={onDeleteAccount}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Full Cover and Hero Unit Card */}
          <div className="bg-[#121214] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
            <div className="h-56 relative overflow-hidden bg-gradient-to-r from-purple-904 to-fuchsia-950">
              <img
                src={ownerProfile.coverUrl}
                alt="Profile Backdrop"
                className="w-full h-full object-cover opacity-80"
                onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80" }}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            {/* Profile Info Overlay Row */}
            <div className="relative px-6 pb-6 -mt-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-purple-800 border-4 border-[#121214] shadow-2xl">
                  <img
                    src={ownerProfile.avatarUrl}
                    alt="Channel Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=150&q=80" }}
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-1.5 mb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-white tracking-tight">{ownerProfile.channelName || "My Channel"}</h1>
                    {isVerified && <CheckCircle className="w-5 h-5 text-purple-400 fill-[#121214]" />}
                  </div>
                  <p className="font-mono text-xs text-purple-300">@{ownerProfile.username || "midyeah_user"}</p>
                  
                  {/* Account Type and Creation Status Indicators */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="bg-purple-950/80 border border-purple-800/60 text-[9px] text-purple-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-purple-400" />
                      <span>{isOwnProfile ? "YOUR ACCOUNT" : "MIDYEAH CREATOR"}</span>
                    </span>
                    <span className="bg-pink-950/80 border border-pink-800/40 text-[9px] text-pink-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-pink-400" />
                      <span>Permanent Live</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Subscribe, Support) */}
              <div className="flex items-center gap-3">
                {!isOwnProfile ? (
                  <button
                    onClick={() => setHasSubscribed(!hasSubscribed)}
                    className={`p-3 px-5 rounded-2xl font-black text-xs uppercase tracking-wider transition duration-150 cursor-pointer flex items-center gap-2 ${
                      hasSubscribed 
                        ? "bg-slate-800 border border-white/10 text-slate-400" 
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-xl shadow-purple-500/20"
                    }`}
                  >
                    {hasSubscribed ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <Flame className="w-4 h-4 text-amber-300 animate-pulse" />}
                    <span>{hasSubscribed ? "Subscribed" : "Subscribe"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowEditMode(true)}
                    className="p-3 px-5 rounded-2xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/30 text-purple-300 font-bold text-xs uppercase cursor-pointer"
                  >
                    Edit Channel Display
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Bio and Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left sidebar info column */}
            <div className="space-y-4">
              {/* Creator Bio card */}
              <div className="bg-[#121214] border border-white/10 rounded-2xl p-4.5 space-y-3 shadow-lg">
                <h3 className="font-bold text-xs text-white uppercase tracking-wider border-b border-white/10 pb-2 mb-1 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span>Channel Description</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed white-space-pre-wrap">
                  {ownerProfile.bio || "This user has not set a biography yet. Support them by watching and sharing their awesome stream channels!"}
                </p>
                
                <div className="text-[10px] text-gray-500 border-t border-white/5 pt-2 flex flex-col gap-1 font-mono">
                  <div>Public Link: {ownerProfile.channelUrl ? `@${ownerProfile.channelUrl}` : 'Unset'}</div>
                  <div>ID Contact: {ownerProfile.email}</div>
                </div>
              </div>

              {/* Creator Live Statistics card */}
              <div className="bg-[#121214] border border-white/10 rounded-2xl p-4.5 space-y-3.5 shadow-lg">
                <h3 className="font-bold text-xs text-white uppercase tracking-wider border-b border-white/10 pb-2 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Redactor Overview</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-[#1C1C1F] border border-white/5 rounded-xl p-2.5">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold text-[9px] mb-1">Subscribers</div>
                    <div className="font-mono text-base font-black text-white">
                      {(ownerProfile.subscribersCount || 0) + (hasSubscribed ? 1 : 0)}
                    </div>
                  </div>
                  <div className="bg-[#1C1C1F] border border-white/5 rounded-xl p-2.5">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold text-[9px] mb-1">Uploads</div>
                    <div className="font-mono text-base font-black text-white">{creatorVideos.length}</div>
                  </div>
                  <div className="bg-[#1C1C1F] border border-white/5 rounded-xl p-2.5">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold text-[9px] mb-1">Views</div>
                    <div className="font-mono text-base font-black text-white">{creatorViews}</div>
                  </div>
                  <div className="bg-[#1C1C1F] border border-white/5 rounded-xl p-2.5">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold text-[9px] mb-1">Est. Hours</div>
                    <div className="font-mono text-base font-black text-white">{Math.floor(watchHrs)}</div>
                  </div>
                </div>

                <div className="bg-purple-950/20 border border-purple-900/40 p-2.5 rounded-xl flex items-center justify-between text-[9px] text-purple-300">
                  <span className="font-semibold uppercase tracking-wider">Monetization Approved:</span>
                  <span className={`font-mono font-black ${creatorLikes >= 100 ? "text-emerald-400" : "text-yellow-400"}`}>
                    {creatorLikes >= 100 ? "ACTIVE ✓" : "PENDING"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right videos uploaded grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#121214] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Tv className="w-4 h-4 text-purple-400" />
                    <span>Uploaded Content Showcase</span>
                  </h3>
                  <span className="font-mono text-[9px] font-black bg-purple-950/80 border border-purple-800/40 text-purple-300 px-2 py-0.5 rounded-lg">
                    {creatorVideos.length} Releases
                  </span>
                </div>

                {creatorVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-[#1C1C1F] rounded-xl border border-dashed border-white/10 space-y-3">
                    <div className="text-3xl">☕</div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">No uploads found</h4>
                    <p className="text-[10px] text-gray-500 max-w-xs">
                      They have not uploaded any videos yet. Check back later to see their content releases!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {creatorVideos.map((video) => (
                      <div 
                        key={video.id}
                        className="bg-[#1C1C1F] border border-white/5 rounded-xl overflow-hidden hover:border-purple-500/50 hover:shadow-xl transition duration-150 flex flex-col group"
                      >
                        {/* Thumbnail View */}
                        <div className="aspect-video w-full bg-black relative overflow-hidden flex items-center justify-center">
                          {video.thumbnailUrl ? (
                            <img 
                              src={video.thumbnailUrl} 
                              alt="Video Preview" 
                              className="w-[100%] h-[100%] object-cover group-hover:scale-105 transition duration-200" 
                              onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=150&q=80" }}
                            />
                          ) : (
                            <Tv className="w-10 h-10 text-white/20" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => onPlayVideo(video)}
                              className="p-3 bg-purple-600 rounded-full text-white shadow-xl transform scale-90 group-hover:scale-100 transition duration-150 cursor-pointer"
                            >
                              <Play className="w-5 h-5 fill-white" />
                            </button>
                          </div>
                          
                          {/* Duration label */}
                          <span className="absolute bottom-1.5 right-1.5 bg-black/80 font-mono text-[9px] text-white px-1.5 py-0.5 rounded font-semibold select-none z-10">
                            {Math.floor((video.duration || 0) / 60)}:{(video.duration % 60).toString().padStart(2, "0")}
                          </span>
                        </div>

                        {/* Title text & View triggers */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                          <div>
                            <h4 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-purple-300 transition duration-150">{video.title}</h4>
                            <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{video.description || "No description provided."}</p>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono pt-1 border-t border-white/5">
                            <span>{video.views} Views</span>
                            <span className="text-purple-400 font-bold uppercase tracking-wider hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => onPlayVideo(video)}>
                              <Play className="w-2.5 h-2.5" /> Play
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </motion.div>
  );
}
