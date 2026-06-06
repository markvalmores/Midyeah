/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  User, Mail, Camera, Link as LinkIcon, BadgePercent, Award,
  Trophy, CheckCircle, ExternalLink, Heart, Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

interface ProfileProps {
  profile: UserProfile;
  onUpdate: (updated: UserProfile) => void;
}

export default function Profile({ profile, onUpdate }: ProfileProps) {
  const [username, setUsername] = useState(profile.username);
  const [channelName, setChannelName] = useState(profile.channelName);
  const [channelUrl, setChannelUrl] = useState(profile.channelUrl);
  const [bio, setBio] = useState(profile.bio);

  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl);

  const [isDragOverAvatar, setIsDragOverAvatar] = useState(false);
  const [isDragOverCover, setIsDragOverCover] = useState(false);

  // GCash & PayPal Withdrawal Setup
  const [gcash, setGcash] = useState(profile.gcash || "");
  const [paypal, setPaypal] = useState(profile.paypal || "");

  // Simulated metrics to trigger Partnership Modal!
  const [subsCount, setSubsCount] = useState(720); // starts close to 777
  const [watchHrs, setWatchHrs] = useState(320); // starts close to 340
  const [totalLikes, setTotalLikes] = useState(3100); // starts close to 3400

  const [showPayoutSaved, setShowPayoutSaved] = useState(false);
  const [showPartnerEmail, setShowPartnerEmail] = useState(false);

  // Synchronize state when target user profile props change
  React.useEffect(() => {
    setUsername(profile.username);
    setChannelName(profile.channelName);
    setChannelUrl(profile.channelUrl);
    setBio(profile.bio);
    setAvatarUrl(profile.avatarUrl);
    setCoverUrl(profile.coverUrl);
    setGcash(profile.gcash || "");
    setPaypal(profile.paypal || "");
  }, [
    profile.username,
    profile.channelName,
    profile.channelUrl,
    profile.bio,
    profile.avatarUrl,
    profile.coverUrl,
    profile.gcash,
    profile.paypal
  ]);

  // Partnership validation checks
  const isPartnerApproved = subsCount >= 777 && watchHrs >= 340 && totalLikes >= 3400;

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarUrl(base64String);
      onUpdate({
        ...profile,
        avatarUrl: base64String,
        username,
        channelName,
        channelUrl,
        bio,
        coverUrl,
        gcash,
        paypal
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCoverFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCoverUrl(base64String);
      onUpdate({
        ...profile,
        coverUrl: base64String,
        username,
        channelName,
        channelUrl,
        bio,
        avatarUrl,
        gcash,
        paypal
      });
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...profile,
      username,
      channelName,
      channelUrl,
      bio,
      avatarUrl,
      coverUrl,
      gcash,
      paypal
    });
    alert("Cozy Profile Settings Saved Successfully! 🐰☕");
  };

  const handleLinkPayout = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...profile,
      gcash,
      paypal
    });
    setShowPayoutSaved(true);
    setTimeout(() => setShowPayoutSaved(false), 3000);
  };

  return (
    <div className="bg-[#121214] text-slate-100 rounded-2xl overflow-hidden border border-white/10 shadow-2xl pb-6">
      
      {/* Cover Photo Backdrop Section */}
      <div 
        className={`h-40 bg-purple-950/30 relative overflow-hidden group border-b border-white/10 transition-colors duration-200 ${isDragOverCover ? "border-purple-500 bg-purple-900/40" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOverCover(true); }}
        onDragLeave={() => setIsDragOverCover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverCover(false);
          if (e.dataTransfer.files?.[0]) {
            handleCoverFile(e.dataTransfer.files[0]);
          }
        }}
      >
        <img
          src={coverUrl}
          alt="Cover Backdrop"
          className="w-full h-full object-cover opacity-80"
          onError={(e)=>{(e.target as any).src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"}}
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <label 
            htmlFor="cover-file-upload-input"
            className="bg-black/75 p-2 rounded-xl border border-white/10 hover:bg-black hover:border-purple-500/50 transition cursor-pointer flex items-center gap-1.5 text-xs text-purple-300"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold">Upload Cover</span>
          </label>
          <input
            type="file"
            id="cover-file-upload-input"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleCoverFile(e.target.files[0]);
              }
            }}
          />

          <div className="bg-black/75 p-2 rounded-xl border border-white/10 hover:bg-black/80 transition flex items-center gap-1.5 text-xs text-purple-300">
            <input
              type="text"
              placeholder="Edit Cover Image URL"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] w-32 focus:w-48 transition-all text-white font-mono"
              id="cover-url-input"
            />
          </div>
        </div>

        {isDragOverCover && (
          <div className="absolute inset-0 bg-purple-900/60 backdrop-blur-xs flex items-center justify-center text-white pointer-events-none">
            <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Drop Image to Update Cover</p>
          </div>
        )}
      </div>

      {/* Avatar Holder and Profile Summary */}
      <div className="relative px-6 -mt-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div 
              className={`w-24 h-24 rounded-2xl overflow-hidden bg-purple-900 border-4 ${isDragOverAvatar ? "border-purple-500 scale-105" : "border-[#121214]"} shadow-xl relative group transition-all duration-250 cursor-pointer`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOverAvatar(true); }}
              onDragLeave={() => setIsDragOverAvatar(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOverAvatar(false);
                if (e.dataTransfer.files?.[0]) {
                  handleAvatarFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                const el = document.getElementById("avatar-file-upload-input");
                if (el) el.click();
              }}
            >
              <img
                src={avatarUrl}
                alt="Avatar Profile"
                className="w-full h-full object-cover"
                onError={(e)=>{(e.target as any).src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"}}
                referrerPolicy="no-referrer"
              />
              <div 
                className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-center p-1"
              >
                <Camera className="w-5 h-5 text-purple-300 mb-1 animate-pulse" />
                <span className="text-[10px] text-purple-200 font-bold select-none leading-none">Upload / Drop</span>
              </div>
              <input
                type="file"
                id="avatar-file-upload-input"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleAvatarFile(e.target.files[0]);
                  }
                }}
              />
            </div>
            
            {/* Explicit Change Photo Trigger for touch and standard mobile devices */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("avatar-file-upload-input");
                if (el) el.click();
              }}
              className="sm:hidden text-[9px] uppercase font-black bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/40 p-1 px-2.5 rounded-lg flex items-center gap-1 select-none cursor-pointer"
            >
              <Camera className="w-3 h-3" />
              <span>Change Photo</span>
            </button>
          </div>
          
          <div className="mb-1 text-center sm:text-left flex flex-col items-center sm:items-start gap-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
              <span>{channelName || "My Channel"}</span>
              {isPartnerApproved && <CheckCircle className="w-4 h-4 text-purple-400 fill-purple-950" />}
            </h1>
            <p className="text-xs text-purple-300 font-mono">@{channelUrl || "midyeah_url"}</p>
            
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("avatar-file-upload-input");
                if (el) el.click();
              }}
              className="hidden sm:flex text-[9px] uppercase font-black bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/40 p-1 px-2.5 rounded-lg items-center gap-1 select-none cursor-pointer mt-1"
            >
              <Camera className="w-3 h-3" />
              <span>Change profile picture</span>
            </button>
          </div>
        </div>

        {/* Live partner goal email trigger */}
        {isPartnerApproved && (
          <button
            onClick={() => setShowPartnerEmail(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow cursor-pointer transition animate-bounce py-2"
            id="claim-partnership-reward"
          >
            📬 Opened congrats partner email!
          </button>
        )}
      </div>

      {/* Dashboard sections Grid */}
      <div className="px-6 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Details Edit Form */}
        <div className="lg:col-span-2 bg-[#121214] rounded-2xl p-5 border border-white/10">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2 mb-3">
            CHANNEL CUSTOMIZATION
          </h2>

          <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase text-[10px]">Your Display Avatar URL</label>
                <input
                  type="text"
                  placeholder="Paste Image URL"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 font-mono transition"
                  id="profile-avatar-url-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase text-[10px]">Your Custom Channel URL</label>
                <input
                  type="text"
                  placeholder="midyeah_ch_handle"
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-purple-400 font-mono font-bold outline-none focus:border-purple-500 transition"
                  id="profile-ch-handle-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase text-[10px]">Username ID</label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition"
                  id="profile-username-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 uppercase text-[10px]">Creative Channel Name</label>
                <input
                  type="text"
                  required
                  placeholder="Showcase channel"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition"
                  id="profile-ch-name-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 uppercase text-[10px]">Channel Bio/Description</label>
              <textarea
                rows={3}
                placeholder="Be comfortable when you watch on Midyeah streaming, God bless everyone..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition"
                id="profile-bio-input"
              />
            </div>

            <div className="pt-2 border-t border-purple-950/30 flex justify-end">
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-xl cursor-pointer shadow transition"
                id="save-profile-btn"
              >
                Save Cozy Settings
              </button>
            </div>
          </form>
        </div>

        {/* Creator Partnership & Monetization track bar */}
        <div className="flex flex-col gap-4">
          
          {/* Creator partner goals sliders tracker (let user simulate reaching goals!) */}
          <div className="bg-[#1C1C1F] border border-white/10 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 mb-1">
              <Award className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-xs text-white uppercase tracking-wider">Midyeah Partner Goals</h3>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed">
              Reach requirements to unlock withdrawals! Use sliders to simulate organic subscriber and viewer growth.
            </p>

            {/* Slider 1: Subscribers (Target 777) */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-gray-300 font-semibold mb-0.5">
                <span>Subscribers (Target 777):</span>
                <span className={subsCount >= 777 ? "text-emerald-400" : "text-purple-300"}>{subsCount} / 777</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                value={subsCount}
                onChange={(e) => setSubsCount(parseInt(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-gray-800 roundedcursor-pointer"
                id="simulate-subs-slider"
              />
            </div>

            {/* Slider 2: Watch Hours (Target 340) */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-gray-300 font-semibold mb-0.5">
                <span>Watch Hours (Target 340):</span>
                <span className={watchHrs >= 340 ? "text-emerald-400" : "text-purple-300"}>{watchHrs} / 340 hrs</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                value={watchHrs}
                onChange={(e) => setWatchHrs(parseInt(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-gray-800 roundedcursor-pointer"
                id="simulate-hours-slider"
              />
            </div>

            {/* Slider 3: Total Likes (Target 3400) */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-gray-300 font-semibold mb-0.5">
                <span>Total Channel Likes (Target 3400):</span>
                <span className={totalLikes >= 3400 ? "text-emerald-400" : "text-purple-300"}>{totalLikes} / 3400</span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                value={totalLikes}
                onChange={(e) => setTotalLikes(parseInt(e.target.value))}
                className="w-full accent-purple-500 h-1 bg-gray-800 roundedcursor-pointer"
                id="simulate-likes-slider"
              />
            </div>

            {/* Partnership Met Status Gauge */}
            <div className="pt-2.5">
              {isPartnerApproved ? (
                <div className="bg-emerald-950/20 border-2 border-emerald-500/30 p-2.5 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-emerald-400 block">✨ ELIGIBILITY CRITERIA MET! ✨</span>
                  <span className="text-[9px] text-gray-300 mt-1 block">Congratulations! Click the email letter on top or link GCash/PayPal withdrawals immediately.</span>
                </div>
              ) : (
                <div className="bg-[#0A0A0B] border border-white/10 p-2.5 rounded-xl text-center text-[10px] text-gray-400">
                  ⚠️ Complete metrics above to trigger Partner congrats dashboard
                </div>
              )}
            </div>
          </div>

          {/* GCash / PayPal Account Linking Sidebar Form */}
          <div className="bg-[#1C1C1F] rounded-2xl p-4 border border-white/10">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider mb-2">Payout Withdrawal Method</h3>
            <form onSubmit={handleLinkPayout} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[9px] text-slate-300 font-medium mb-0.5">GCash Mobile Number</label>
                <input
                  type="text"
                  placeholder="e.g. 09XX-XXX-XXXX"
                  value={gcash}
                  onChange={(e) => setGcash(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-2.5 outline-none focus:border-purple-500 font-mono transition"
                  id="gcash-payout-profile-input"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-300 font-medium mb-0.5">PayPal Account Email</label>
                <input
                  type="email"
                  placeholder="paypal@yourdomain.com"
                  value={paypal}
                  onChange={(e) => setPaypal(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-2.5 outline-none focus:border-purple-500 font-mono transition"
                  id="paypal-payout-profile-input"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 rounded-xl transition cursor-pointer"
                id="link-profile-payouts-btn"
              >
                Link Withdrawal Methods
              </button>
            </form>

            {showPayoutSaved && (
              <p className="text-[10px] text-emerald-400 font-semibold text-center mt-2">Withdrawal credentials updated successfully!</p>
            )}
          </div>

        </div>

      </div>

      {/* Dynamic congratulatory Partnership Email template dialog */}
      <AnimatePresence>
        {showPartnerEmail && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121214] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setShowPartnerEmail(false)}
                className="absolute top-4 right-4 text-purple-300 hover:text-white font-bold text-xs bg-purple-950 px-2.5 py-1 rounded-full border border-purple-500 cursor-pointer"
                id="close-partner-letter"
              >
                ✕ Close
              </button>

              <div className="text-center pb-4 border-b border-purple-950">
                <span className="text-4xl">📧</span>
                <h3 className="text-lg font-black text-yellow-300 mt-2">OFFICIAL CONGRATULATIONS: PARTNER LOG ACTIVE</h3>
                <p className="text-[10px] text-purple-400 uppercase tracking-widest font-mono">From Midyeah Streaming Creator Network</p>
              </div>

              {/* dynamic statistics graphics certificate card */}
              <div className="my-4 bg-gradient-to-br from-[#1C1C1F] to-[#0A0A0B] border border-white/10 rounded-2xl p-6 relative overflow-hidden select-none">
                {/* Background watermarks */}
                <div className="absolute right-0 bottom-0 text-7xl opacity-5">🏆</div>
                
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">MIDYEAH STATISTICS REPORT</h4>
                <div className="grid grid-cols-3 gap-2.5 text-center mt-2 text-white">
                  <div className="bg-[#0c0a0f] p-2 rounded-lg border border-purple-900/50">
                    <span className="text-purple-300 text-[9px] block uppercase font-mono">Members</span>
                    <span className="font-mono text-sm font-bold block">{subsCount}</span>
                  </div>
                  <div className="bg-[#0c0a0f] p-2 rounded-lg border border-purple-900/50">
                    <span className="text-purple-300 text-[9px] block uppercase font-mono">Stream Hours</span>
                    <span className="font-mono text-sm font-bold block">{watchHrs} hrs</span>
                  </div>
                  <div className="bg-[#0c0a0f] p-2 rounded-lg border border-purple-900/50">
                    <span className="text-purple-300 text-[9px] block uppercase font-mono">Favorites</span>
                    <span className="font-mono text-sm font-bold block">{totalLikes}</span>
                  </div>
                </div>

                {/* Mark David Valmores' blessing message */}
                <div className="mt-4 bg-[#0c0a0f]/80 p-3 rounded-lg text-[11px] leading-relaxed italic text-gray-200 border-l-4 border-purple-500">
                  "Thank you so much from our creator Mark David Valmores, i well come you fellow creator to this incredible journey may you find the means to be Big and brighter so that we can share what's next for us in our Amazing Future God Bless hope we help each other out."
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-purple-300">
                  <span>Signatory: Mark David Valmores</span>
                  <span>Mascot: Midy Bunny 🐰</span>
                </div>
              </div>

              {/* Call-to-action sponsor channel */}
              <div className="bg-purple-950/20 border border-purple-950 rounded-xl p-3 text-center space-y-2">
                <p className="text-[10px] text-gray-300">Please help support our development by subscribing to the owner's YouTube Channel:</p>
                
                <a
                  href="https://www.youtube.com/@UsagyuunVtuber"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs p-2 px-4 rounded-xl cursor-pointer shadow transition-all duration-200"
                  id="owner-youtube-link"
                >
                  <span>Subscribe to @UsagyuunVtuber</span>
                  <ExternalLink className="w-3.5 h-3.5 text-white" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
