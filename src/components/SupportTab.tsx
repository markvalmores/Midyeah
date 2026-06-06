/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Heart, Gift, DollarSign, Users, Church, Landmark, Link2, 
  Plus, Calendar, MessagesSquare, Award, Sparkles, CheckCircle, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, DonationRecord, DonationStats } from "../types";
import { getAllDonations, createDonationRecord, computeDonationStats } from "../db";

interface SupportTabProps {
  currUser: UserProfile | null;
}

export default function SupportTab({ currUser }: SupportTabProps) {
  const [donations, setLiveDonations] = useState<DonationRecord[]>([]);
  const [stats, setStats] = useState<DonationStats>({
    totalAmountRaised: 0,
    totalDonationCount: 0,
    targetDistribution: { owner: 0, charity: 0, church: 0, people: 0 }
  });

  const [donorName, setDonorName] = useState("");
  const [amount, setAmount] = useState<number>(15);
  const [target, setTarget] = useState<"owner" | "charity" | "church" | "people">("charity");
  const [message, setMessage] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    loadDonationLedger();
  }, []);

  const loadDonationLedger = async () => {
    setLoading(true);
    try {
      const data = await getAllDonations();
      setLiveDonations(data);
      setStats(computeDonationStats(data));
    } catch (err) {
      console.error("Failed fetching ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setStatusMsg("Please input a voluntary support amount greater than $0.");
      setIsSuccess(false);
      return;
    }

    try {
      setStatusMsg(null);
      const actualName = donorName.trim() || (currUser ? currUser.username : "Anonymous Supporter");
      
      const created = await createDonationRecord(
        actualName,
        Number(amount),
        message,
        target
      );

      // Increment live statistics list
      const updatedList = [created, ...donations];
      setLiveDonations(updatedList);
      setStats(computeDonationStats(updatedList));

      // Reset
      setDonorName("");
      setAmount(15);
      setMessage("");
      
      setStatusMsg(`Successfully recorded! Thank you, ${actualName}! Your record is globally updated.`);
      setIsSuccess(true);
      setTimeout(() => setStatusMsg(null), 8000);
    } catch (err) {
      console.error(err);
      setStatusMsg("Failed compiling donation statistics to database.");
      setIsSuccess(false);
    }
  };

  const donationTargets = [
    {
      id: "owner",
      title: "Stream & Server Support",
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      desc: "Helps us support live VTuber operations, server running fees, and maintain cozy, ad-free theater streaming services.",
      allocated: stats.targetDistribution.owner
    },
    {
      id: "charity",
      title: "Global Humanitarian Charity",
      icon: <Heart className="w-5 h-5 text-rose-500 animate-pulse" />,
      desc: "Fund transfers to certified disaster reliefs, Red Cross modules, children shelters, and health organizations.",
      allocated: stats.targetDistribution.charity
    },
    {
      id: "church",
      title: "Local Church Support",
      icon: <Church className="w-5 h-5 text-amber-500" />,
      desc: "Allocates tithes and building reconstruction help to local parish halls, holy activities, and community feed initiatives.",
      allocated: stats.targetDistribution.church
    },
    {
      id: "people",
      title: "Needy People & Local Relief",
      icon: <Users className="w-5 h-5 text-blue-400" />,
      desc: "Direct support to local families, medical support sponsorships, and small micro-grants for aspiring creators.",
      allocated: stats.targetDistribution.people
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. HERO HERO INTRO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-950/40 via-slate-900 to-[#121214] border border-purple-500/15 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-4 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono uppercase tracking-widest">
            <Flame className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20 animate-pulse" /> Community Giving Drive
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
            Keep Us Going! <span className="text-purple-400">Support the Platform & Charity Drives</span>
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            We operate out of love and a pursuit to bring high-fidelity theater experiences. Every voluntary donation is split by the owner to fund servers, local community drives, churches, and needy relief. Support us directly in real-time!
          </p>
          
          <div className="flex flex-wrap gap-3 pt-1">
            <a 
              href="https://streamlabs.com/usagyuunvtuber/tip" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 font-extrabold text-xs text-white px-5 py-3 rounded-2xl transition shadow-lg shadow-purple-600/15 hover:scale-[1.02] cursor-pointer"
            >
              <Gift className="w-4 h-4 fill-white" /> Donate on Streamlabs 💜
              <Link2 className="w-3.5 h-3.5 opacity-70" />
            </a>
            
            <button 
              onClick={() => {
                const formElem = document.getElementById("record-form-section");
                if (formElem) formElem.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 bg-[#1C1C1F] hover:bg-[#252529] border border-white/10 font-bold text-xs text-slate-300 px-4 py-3 rounded-2xl transition cursor-pointer"
            >
              Record Pledge Ledger 📝
            </button>
          </div>
        </div>

        {/* 2. OVERALL CORNER STATS METRICS */}
        <div className="bg-[#1C1C1F]/90 border border-white/10 rounded-2xl p-5 min-w-[240px] md:w-80 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">TOTAL FUNDS RAISED</span>
            <div className="text-3xl font-black text-white leading-tight font-mono tracking-tight flex items-baseline gap-1">
              <span className="text-purple-400 text-2xl font-extrabold">$</span>
              {stats.totalAmountRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" /> Fully distributed across verified drives
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-2 text-left">
            <div>
              <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-wider">TOTAL PLEDGES</span>
              <span className="text-sm font-black text-white font-mono">{stats.totalDonationCount}</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 font-bold uppercase block tracking-wider">CHARITY SHARE</span>
              <span className="text-sm font-black text-rose-400 font-mono">
                {stats.totalAmountRaised > 0 
                  ? `${Math.round(((stats.targetDistribution.charity + stats.targetDistribution.church + stats.targetDistribution.people) / stats.totalAmountRaised) * 100)}%`
                  : "75%"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TARGET ALLOCATION PILLARS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest">Allocated Support Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {donationTargets.map((targetObj) => {
            const percentage = stats.totalAmountRaised > 0 
              ? Math.round((targetObj.allocated / stats.totalAmountRaised) * 100) 
              : 25;
            
            return (
              <div 
                key={targetObj.id} 
                className="bg-[#121214] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-white/15 transition duration-200"
              >
                <div className="space-y-3">
                  <div className="p-2 bg-[#1C1C1F] rounded-xl inline-block border border-white/5">
                    {targetObj.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-200">{targetObj.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{targetObj.desc}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-baseline justify-between">
                  <div>
                    <span className="text-[9px] text-slate-500 block font-bold font-mono">SUM RAISED</span>
                    <span className="text-xs font-bold text-white font-mono">${targetObj.allocated.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block font-bold font-mono">SHARE</span>
                    <span className="text-xs font-bold text-slate-300 font-mono">{percentage}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN INTERACTIVE SPLIT: LEDGER FEED & INPUT PLEDGE FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* COL 1 & 2: Recent Support ledger listings */}
        <div className="lg:col-span-3 bg-[#121214] border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-purple-400" /> Donation Audit Ledger
              </h3>
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">
                {donations.length} total entries
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <div className="h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] text-slate-500 font-semibold font-mono">RETRIEVING LEDGER DATA...</p>
              </div>
            ) : donations.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Gift className="w-10 h-10 mx-auto text-slate-600 animate-pulse mb-3" />
                <p className="text-xs font-bold">Waiting for our very first seed donation!</p>
                <p className="text-[10px] text-slate-500 mt-1">Submit a real-world tip and record it to see it here.</p>
              </div>
            ) : (
              <div className="space-y-3 mt-4 max-h-[380px] overflow-y-auto pr-1">
                {donations.map((don) => (
                  <div 
                    key={don.id}
                    className="p-3.5 bg-[#1C1C1F]/40 hover:bg-[#1C1C1F] rounded-2xl border border-white/5 transition flex flex-col sm:flex-row items-start justify-between gap-4"
                  >
                    <div className="space-y-1 truncate w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-200">{don.donorName}</span>
                        <span className={`text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded-full ${
                          don.target === "charity" ? "bg-rose-950/40 text-rose-300 border border-rose-500/10" :
                          don.target === "church" ? "bg-amber-950/40 text-amber-300 border border-amber-500/10" :
                          don.target === "people" ? "bg-blue-950/40 text-blue-300 border border-blue-500/10" :
                          "bg-purple-950/40 text-purple-300 border border-purple-500/10"
                        }`}>
                          {don.target === "owner" ? "Admin Support" :
                           don.target === "charity" ? "Humanity Charity" :
                           don.target === "church" ? "Parish Chapel" : "Cozy Relief"}
                        </span>
                      </div>
                      
                      {don.message && (
                        <p className="text-[10px] text-slate-400 leading-relaxed italic pr-2 break-words text-wrap whitespace-normal">
                          "{don.message}"
                        </p>
                      )}

                      <span className="text-[8px] text-slate-500 font-mono flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-600" /> Logged on {new Date(don.timestamp).toLocaleDateString()} at {new Date(don.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-right shrink-0 bg-purple-950/10 hover:bg-purple-950/20 border border-purple-500/10 p-2.5 rounded-xl font-mono text-purple-300 font-black text-sm">
                      ${don.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-t border-white/5 pt-3.5 text-[10px] text-slate-500 flex items-center justify-between">
            <span>💡 Real-time global transparency ledger for our donors.</span>
            <span>Verified Streamlabs link synced.</span>
          </div>
        </div>

        {/* COL 3 & 4: Submision/Logging Pledge input form */}
        <div id="record-form-section" className="lg:col-span-2 bg-[#121214] border border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
              <Plus className="w-5 h-5 text-purple-400" /> Log Contribution / Pledge
            </h3>
            
            <p className="text-[10px] text-slate-400 leading-relaxed">
              If you have tip-donated or wish to log a voluntary contribution pledge supporting us or any of our charitable causes, detail your donation below so the global counters compute appropriately!
            </p>

            <form onSubmit={handleRecordDonation} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Display Nickname
                </label>
                <input
                  type="text"
                  placeholder={currUser ? currUser.username : "Enter custom donor name"}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full bg-[#1C1C1F] border border-white/10 text-xs px-3.5 py-2.5 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Voluntary Amount (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-purple-400 pointer-events-none" />
                  <input
                    type="number"
                    required
                    min="1"
                    max="10000"
                    placeholder="15"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-[#1C1C1F] border border-white/10 text-xs pl-9 pr-3.5 py-2.5 rounded-xl text-slate-200 focus:outline-none focus:border-purple-600 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Primary Cause/Target Allocation
                </label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as any)}
                  className="w-full bg-[#1C1C1F] border border-white/10 text-xs px-3 py-2.5 rounded-xl text-slate-200 focus:outline-none focus:border-purple-600 font-semibold"
                >
                  <option value="charity">💖 Global Humanitarian Charity (Disaster Relief, etc.)</option>
                  <option value="church">⛪ Local Church Support (Missions, Feeding Projects)</option>
                  <option value="people">👥 Needy Families & Local Relief</option>
                  <option value="owner">🔮 VTuber Stream & Server Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Cheering Encouragement Message
                </label>
                <textarea
                  placeholder="Leave a lovely word for other viewers or local causes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={400}
                  rows={3}
                  className="w-full bg-[#1C1C1F] border border-white/10 text-xs px-3.5 py-2.5 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-600 font-medium resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-3 rounded-2xl transition shadow-lg shadow-purple-600/10 hover:scale-[1.01] cursor-pointer"
              >
                Log Global Donation Record 🌟
              </button>
            </form>
          </div>

          <div className="mt-4">
            {/* Real-time status update validation indicators */}
            <AnimatePresence>
              {statusMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`text-[10px] leading-relaxed font-semibold p-2.5 rounded-xl text-center border ${
                    isSuccess 
                      ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400" 
                      : "bg-red-950/20 border-red-500/20 text-red-500"
                  }`}
                >
                  {statusMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
