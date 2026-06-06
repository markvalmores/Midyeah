/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Video, UserProfile, Comment, DiscordMessage } from "./types";

const DB_NAME = "MidyeahDB";
const DB_VERSION = 1;

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store user profile
      if (!db.objectStoreNames.contains("profiles")) {
        db.createObjectStore("profiles", { keyPath: "email" });
      }

      // Store uploaded videos blobs & metadata
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos", { keyPath: "id" });
      }

      // Store comments
      if (!db.objectStoreNames.contains("comments")) {
        db.createObjectStore("comments", { keyPath: "id" });
      }

      // Store discord messages (joined community chats)
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" });
      }

      // Store play history offsets (to resume watching later)
      if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "videoId" });
      }
    };
  });
}

// Global caching for Object URLs to revoke them correctly
const objectUrlCache = new Map<string, string>();

export async function saveProfile(profile: UserProfile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("profiles", "readwrite");
    const store = tx.objectStore("profiles");
    store.put(profile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProfile(email: string): Promise<UserProfile | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("profiles", "readonly");
    const store = tx.objectStore("profiles");
    const req = store.get(email);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVideo(video: Video, videoBlob?: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readwrite");
    const store = tx.objectStore("videos");
    
    // If there is an existing object url, we can structure it
    const dataToSave = {
      ...video,
      blob: videoBlob || video.blob
    };
    
    store.put(dataToSave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllVideos(): Promise<Video[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readonly");
    const store = tx.objectStore("videos");
    const req = store.getAll();
    req.onsuccess = () => {
      const results: Video[] = req.result || [];
      // Hydrate object URLs for videos that have Blobs
      const hydrated = results.map(v => {
        if (v.blob) {
          // If we already generated an Object URL for this video, reuse it
          const existingUrl = objectUrlCache.get(v.id);
          if (existingUrl) {
            v.videoUrl = existingUrl;
          } else {
            const url = URL.createObjectURL(v.blob);
            objectUrlCache.set(v.id, url);
            v.videoUrl = url;
          }
          v.isOffline = true;
        }
        return v;
      });
      resolve(hydrated);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVideo(id: string): Promise<void> {
  const db = await openDB();
  const existingUrl = objectUrlCache.get(id);
  if (existingUrl) {
    URL.revokeObjectURL(existingUrl);
    objectUrlCache.delete(id);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction("videos", "readwrite");
    const store = tx.objectStore("videos");
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveComment(comment: Comment): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("comments", "readwrite");
    const store = tx.objectStore("comments");
    store.put(comment);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getVideoComments(videoId: string): Promise<Comment[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("comments", "readonly");
    const store = tx.objectStore("comments");
    const req = store.getAll();
    req.onsuccess = () => {
      const all: Comment[] = req.result || [];
      const filtered = all.filter(c => c.videoId === videoId);
      // Sort newest first
      filtered.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
      resolve(filtered);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveDiscordMessage(msg: DiscordMessage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readwrite");
    const store = tx.objectStore("messages");
    store.put(msg);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDiscordMessages(): Promise<DiscordMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readonly");
    const store = tx.objectStore("messages");
    const req = store.getAll();
    req.onsuccess = () => {
      const all: DiscordMessage[] = req.result || [];
      // Sort oldest first
      all.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

// History Resume Offset functions (accidentally closed tab resume logic)
export interface PlayHistory {
  videoId: string;
  time: number;
}

export async function savePlayOffset(videoId: string, time: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("history", "readwrite");
    const store = tx.objectStore("history");
    store.put({ videoId, time });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPlayOffset(videoId: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const req = store.get(videoId);
    req.onsuccess = () => {
      resolve(req.result ? req.result.time : 0);
    };
    req.onerror = () => reject(req.error);
  });
}
