import React, { useState, useEffect } from "react";
import { Award, Trophy, Medal, Crown } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../db";

interface Ranking {
  userId: string;
  totalSeconds: number;
}

export default function AwardsTab() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRankings() {
      try {
        const q = query(
          collection(db, "usage_trackers"),
          orderBy("totalSeconds", "desc"),
          limit(7)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          userId: doc.id,
          totalSeconds: doc.data().totalSeconds
        }));
        setRankings(data);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRankings();
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}y ${Math.floor((days % 365) / 30)}m active`;
    if (months > 0) return `${months}mo ${Math.floor((days % 30) / 7)}w active`;
    if (weeks > 0) return `${weeks}w ${days % 7}d active`;
    if (days > 0) return `${days}d ${hours % 24}h active`;
    return `${hours}h ${Math.floor((seconds % 3600) / 60)}m active`;
  };

  const getIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 1: return <Trophy className="w-6 h-6 text-gray-300" />;
      case 2: return <Medal className="w-6 h-6 text-amber-700" />;
      default: return <Award className="w-6 h-6 text-slate-500" />;
    }
  };

  return (
    <div className="p-6 bg-[#121214] min-h-full text-white rounded-3xl border border-white/10">
      <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
        <Award className="w-8 h-8 text-purple-400" />
        Global Activity Rankings
      </h2>
      
      {loading ? (
        <div className="text-center py-20 text-slate-500">Loading rankings...</div>
      ) : (
        <div className="space-y-4">
          {rankings.map((user, index) => (
            <div 
              key={user.userId} 
              className={`flex items-center p-4 rounded-xl border ${index < 3 ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5'} transition`}
            >
              <div className="mr-4">{getIcon(index)}</div>
              <div className="flex-grow">
                <div className="font-bold">{user.userId}</div>
                <div className="text-xs text-slate-400 font-mono">{formatTime(user.totalSeconds)}</div>
              </div>
              <div className="text-sm font-bold text-slate-600">#{index + 1}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
