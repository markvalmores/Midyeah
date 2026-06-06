/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  username: string;
  email: string;
  channelName: string;
  channelUrl: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  subscribersCount: number;
  isSubscribed?: boolean;
  isJoined?: boolean; // Joined community channel
  gcash?: string;
  paypal?: string;
}

export interface VideoSub {
  time: number; // in seconds
  text: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string; // Object URL or local state file path
  blob?: Blob; // Stored locally in IndexedDB for offline viewing
  category: "normal" | "movie" | "rental";
  rentalPrice?: number; // min $3 to max $100 / min 150 to 5000 Php
  rentalPeriod?: string; // month or year
  is360: boolean;
  uploadDate: string;
  creator: UserProfile;
  views: number;
  likes: number;
  dislikes: number;
  reactions: {
    like: number;
    love: number;
    haha: number;
    wow: number;
    sad: number;
    angry: number;
  };
  duration: number; // in seconds
  isPinned?: boolean;
  isOffline?: boolean; // is cached offline
}

export interface Comment {
  id: string;
  videoId: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: string;
  likes: number;
  replies: Reply[];
}

export interface Reply {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: string;
  likes: number;
}

export interface DiscordMessage {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: string;
}

export interface WatchRoom {
  id: string;
  name: string;
  isPublic: boolean;
  inviteCode: string;
  creator: string;
  currentVideoId?: string;
  currentTime?: number;
  isPlaying?: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  logo: string;
}
