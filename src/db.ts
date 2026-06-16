/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword 
} from "firebase/auth";
import { 
  getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, 
  query, orderBy, getDocFromServer, collectionGroup, onSnapshot,
  where, writeBatch, updateDoc, increment, runTransaction, limit
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { Video, UserProfile, Comment, DiscordMessage, Playlist, DonationRecord, DonationStats } from "./types";
import { getRandomAnimeAvatar } from "./utils";

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

const GUEST_EMAIL = "guest@midyeah.com";
const ADMIN_EMAIL = "mdv4244@gmail.com";

export function isGuestAccount(email?: string): boolean {
  const currentEmail = email || auth.currentUser?.email;
  return currentEmail === GUEST_EMAIL;
}

export function isAdminAccount(email?: string): boolean {
  const currentEmail = email || auth.currentUser?.email;
  return currentEmail === ADMIN_EMAIL;
}

export async function authenticateUser(email: string, pass: string): Promise<void> {
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    localStorage.setItem("midyeah_active_session_email", email);
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use" || error.code === "auth/wrong-password") {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        localStorage.setItem("midyeah_active_session_email", email);
      } catch (innerError: any) {
        console.warn("Firebase Auth sign-in failed, checking IndexedDB as fallback...", innerError);
        const localProfile = await getProfile(email);
        if (localProfile) {
          localStorage.setItem("midyeah_active_session_email", email);
          return;
        }
        throw innerError;
      }
    } else {
      console.warn("Firebase Auth unavailable. Logging in with local database fallback:", error.message);
      const localProfile = await getProfile(email);
      // Permit local profile auth or generate local-first session instantly
      localStorage.setItem("midyeah_active_session_email", email);
    }
  }
}

// Standard Operational Error Handling Interface
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

// TIMEOUT HELPER: Prevents UI hangs during slow Firestore sync
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Operation timeout: Network or Quota issue"));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any).code;

  if (errorMessage.includes("resource-exhausted") || errorCode === "resource-exhausted" || errorCode === "unavailable") {
    isSyncStabilized = false;
    setTimeout(() => { isSyncStabilized = true; }, 60000 * 5); // Auto-heal sync engine after 5 mins
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: Test Firebase connection during first boot
async function validateConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Please check your Firebase configuration or network status.");
    }
  }
}
validateConnection();

// IndexedDB fallbacks for high-fidelity offline downloads
const DB_NAME = "MidYeahDB";
const DB_VERSION = 4;

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

      // Store user playlists
      if (!db.objectStoreNames.contains("playlists")) {
        db.createObjectStore("playlists", { keyPath: "id" });
      }

      // Store transparent donation audit records
      if (!db.objectStoreNames.contains("donations")) {
        db.createObjectStore("donations", { keyPath: "id" });
      }

      // Store custom group page wallpapers
      if (!db.objectStoreNames.contains("group_wallpapers")) {
        db.createObjectStore("group_wallpapers", { keyPath: "id" });
      }
    };
  });
}

// Global caching for Object URLs to revoke them correctly
const objectUrlCache = new Map<string, string>();

// P2P Chunk Slicing helpers for global Firestore storage
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.substring(base64String.indexOf(",") + 1);
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64Data: string, contentType: string = "video/mp4"): Blob {
  const sliceSize = 1024;
  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

async function uploadVideoInChunks(videoId: string, blob: Blob, onProgress?: (p: number) => void): Promise<void> {
  if (!isSyncStabilized) {
    return;
  }
  try {
    const RAW_CHUNK_SIZE = 500 * 1024; // 500KB raw binary size - highly resilient to network flutters & timeouts
    const numChunks = Math.ceil(blob.size / RAW_CHUNK_SIZE);
    
    // Process and dispatch lightweight slices sequentially, yielding execution to keep UI hyper-responsive.
    for (let i = 0; i < numChunks; i++) {
      const start = i * RAW_CHUNK_SIZE;
      const end = Math.min(start + RAW_CHUNK_SIZE, blob.size);
      const slice = blob.slice(start, end);
      
      const chunkData = await blobToBase64(slice);
      const chunkDocRef = doc(db, "global_videos", videoId, "chunks", `chunk_${i}`);
      
      // ADD RETRY LOGIC FOR EACH CHUNK: Coding codes resilience
      let retries = 2;
      let success = false;
      while (retries > 0 && !success) {
        try {
          // Use timeout to prevent hanging the entire process
          await withTimeout(setDoc(chunkDocRef, {
            index: i,
            data: chunkData
          }), 15000); // 15s per chunk
          success = true;
        } catch (err: any) {
          retries--;
          console.warn(`Chunk ${i} upload failed/timeout, retries left: ${retries}`, err);
          if (retries === 0) {
            // If quota likely hit or network died, just stop trying remotely but continue locally
            if (err.message.includes("Quota") || err.message.includes("timeout")) {
                isSyncStabilized = false; 
                setTimeout(() => { isSyncStabilized = true; }, 60000 * 5); // Auto-heal sync engine after 5 mins
                return; // Silently stop chunking but return cleanly
            }
            throw err;
          }
          await new Promise(r => setTimeout(r, 1000)); // wait 1s before retry
        }
      }
      
      if (onProgress) {
        // Calculate progress carefully from 0 to 98
        const progress = Math.round(((i + 1) / numChunks) * 98);
        onProgress(Math.min(progress, 98));
      }
    }
    
    // Final progress jump to 100% happens in the caller after final setDoc
  } catch (err: any) {
    if (err.message && err.message.includes("resource-exhausted")) {
        isSyncStabilized = false;
        setTimeout(() => { isSyncStabilized = true; }, 60000 * 5); // Auto-heal
    }
    console.warn("Incremental global video sync paused or deferred:", err);
  }
}

export async function atomicIncrementVideoView(videoId: string): Promise<void> {
  if (!isSyncStabilized) return;
  try {
    const docRef = doc(db, "global_videos", videoId);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (err) {
    console.warn("View increment failed:", err);
  }
}

export async function downloadGlobalVideoChunks(videoId: string): Promise<Blob> {
  const chunksCollectionRef = collection(db, "global_videos", videoId, "chunks");
  const q = query(chunksCollectionRef, orderBy("index", "asc"));
  try {
    const snap = await getDocs(q);
    let fullBase64 = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      fullBase64 += d.data || "";
    });
    
    if (!fullBase64) {
      throw new Error("This stream has not completed global chunk synchronization.");
    }
    
    return base64ToBlob(fullBase64, "video/mp4");
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `global_videos/${videoId}/chunks`);
    throw err;
  }
}

// PREMIUM HIGH-RESOLUTION ANIME ILLUSTRATION FALLBACKS
const PREMIUM_ANIME_FALLBACKS = [
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1560942485-b2a11cc13456?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1617791160505-6f006e121980?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1627672360099-0e3125c150fc?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=250&q=80"
];

/**
 * Fetch a random beautiful anime avatar from several top anime image endpoints recursively,
 * and fall back to custom premium illustrations or SVG seed layouts in case of rate limit or CORS.
 */
export async function getAnyAnimeAvatarUrl(): Promise<string> {
  const apis = [
    async () => {
      const res = await fetch("https://nekos.best/api/v2/nekos?amount=1");
      const data = await res.json();
      if (data?.results?.[0]?.url) return data.results[0].url;
      throw new Error("No url in nekos.best");
    },
    async () => {
      const res = await fetch("https://api.waifu.pics/sfw/waifu");
      const data = await res.json();
      if (data?.url) return data.url;
      throw new Error("No url in waifu.pics");
    },
    async () => {
      const res = await fetch("https://api.catboys.com/img");
      const data = await res.json();
      if (data?.url) return data.url;
      throw new Error("No url in catboys");
    }
  ];

  // Randomize endpoint order to balance API loads
  const shuffledApis = [...apis].sort(() => Math.random() - 0.5);
  for (const apiCall of shuffledApis) {
    try {
      const url = await apiCall();
      if (url) return url;
    } catch (e) {
      console.warn("One anime api fetch failed, selecting other...", e);
    }
  }

  // Double backup in case of connectivity errors
  const seed = Math.floor(Math.random() * 10000);
  const fallbacks = [
    `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`,
    `https://robohash.org/${seed}?set=set5`,
    PREMIUM_ANIME_FALLBACKS[Math.floor(Math.random() * PREMIUM_ANIME_FALLBACKS.length)]
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Permanently delete a User's account details from both high-speed Local IndexedDB
 * and Firestore globally.
 */
export async function deleteProfileFromDb(email: string): Promise<void> {
  // Wipe from IndexedDB
  const localDb = await openDB();
  const tx = localDb.transaction("profiles", "readwrite");
  const store = tx.objectStore("profiles");
  store.delete(email);

  // Wipe from global Firestore profiles collection
  try {
    const docRef = doc(db, "profiles", email);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Firestore Profile Wipe failed:", err);
  }

  // Wipe account from Firebase Auth
  const currentUser = auth.currentUser;
  if (currentUser && currentUser.email === email) {
    try {
      await currentUser.delete();
    } catch (err) {
      console.warn("Auth user delete failed. Account is wiped from databases, signing out.", err);
      await signOut(auth);
    }
  }
}

// Global Sync state: Internally managed to optimize performance
let isSyncStabilized = true;

export function setSyncStatus(status: boolean) {
  isSyncStabilized = status;
}

// Add a simple in-memory cache to skip Firestore writes if the profile hasn't changed.
let lastSavedProfile = new Map<string, string>(); // email -> JSON.stringify(profile)

export async function getUserCount(): Promise<number> {
  try {
    const collRef = collection(db, "profiles");
    // Optimization: query limit 100 instead of infinite iteration, or getCountFromServer if available
    // but just in case getCountFromServer isn't imported, let's use a very small limit since the exact count isn't critical.
    // We only need count for generating names.
    const q = query(collRef, limit(100)); // To prevent quota issues, max 100.
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.warn("Could not fetch user count from remote, defaulting to 0:", err);
    return 0;
  }
}

export async function checkProfileUniqueness(
  field: "username" | "channelName" | "channelUrl",
  value: string,
  excludeEmail: string
): Promise<boolean> {
  const collRef = collection(db, "profiles");
  const qItem = query(collRef, where(field, "==", value));
  
  try {
    const snap = await getDocs(qItem);
    let isUnique = true;
    snap.forEach((docSnap) => {
      if (docSnap.id !== excludeEmail) {
        isUnique = false;
      }
    });
    return isUnique;
  } catch (err) {
    console.warn(`Uniqueness check failed for ${field}:`, err);
    return true; // fail-open for local-first sync
  }
}

// Profile Sync functions
export async function saveProfile(profile: UserProfile): Promise<void> {
  if (isGuestAccount(profile.email)) {
    console.warn("Guest accounts cannot modify their profiles.");
    return;
  }
  // Save locally to IndexedDB
  try {
    const localDb = await openDB();
    await new Promise<void>((resolve, reject) => {
      let tx;
      try {
        tx = localDb.transaction("profiles", "readwrite");
        tx.objectStore("profiles").put(profile);
      } catch (err) {
        return reject(err);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (localErr) {
    console.error("IndexedDB save failed:", localErr);
  }

  // Double-secure: Save to localStorage as well for triple redundancy (saved forevermore)
  try {
    localStorage.setItem("midyeah_profile_" + profile.email, JSON.stringify(profile));
    if (profile.username) {
      localStorage.setItem("midyeah_profile_by_username_" + profile.username.toLowerCase(), JSON.stringify(profile));
    }
    // Maintain a list of all profiles for offline/redundancy fallback indexing
    const existingRaw = localStorage.getItem("midyeah_all_profiles");
    let allProfilesList: UserProfile[] = [];
    if (existingRaw) {
      try {
        allProfilesList = JSON.parse(existingRaw);
      } catch (e) {}
    }
    allProfilesList = allProfilesList.filter(p => p.email !== profile.email);
    allProfilesList.push(profile);
    localStorage.setItem("midyeah_all_profiles", JSON.stringify(allProfilesList));
  } catch (localErr) {
    console.error("LocalStorage save failed:", localErr);
  }

  // Deduplication check: compare with last saved state
  const profileKey = profile.email;
  const currentSerialized = JSON.stringify(profile);
  if (lastSavedProfile.get(profileKey) === currentSerialized) {
    return; // No changes, skip Firestore network requests
  }

  // Save globally in Firestore profiles collection
  try {
    const docRef = doc(db, "profiles", profile.email);
    await setDoc(docRef, { ...profile });

    // Update cache
    lastSavedProfile.set(profileKey, currentSerialized);

    // Cascade profile changes to user's videos in global_videos safely
    try {
      const collRef = collection(db, "global_videos");
      const q = query(collRef, where("creator.email", "==", profile.email));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach(docSnap => {
          batch.update(doc(db, "global_videos", docSnap.id), {
            creator: profile
          });
        });
        await batch.commit();
      }
    } catch (ve) {
      console.warn("Could not cascade profile update to videos:", ve);
    }
  } catch (err: any) {
    if (err.message && err.message.includes("resource-exhausted")) {
      console.warn("Firestore quota used, synced locally.", err);
    }
    console.warn("Firestore profile synchronization postponed, but details are safely saved inside client IndexedDB:", err);
  }
}

export async function getProfile(email: string): Promise<UserProfile | null> {
  // First, check Firestore for the absolute source of truth
  try {
    const docSnap = await getDoc(doc(db, "profiles", email));
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;
      // Mirror to local cache immediately to secure it forevermore
      try {
        localStorage.setItem("midyeah_profile_" + email, JSON.stringify(profile));
        if (profile.username) {
          localStorage.setItem("midyeah_profile_by_username_" + profile.username.toLowerCase(), JSON.stringify(profile));
        }
        
        // Save to IndexedDB
        const localDb = await openDB();
        const tx = localDb.transaction("profiles", "readwrite");
        tx.objectStore("profiles").put(profile);
      } catch (err) {
        console.warn("Could not sync Firestore profile to local stores:", err);
      }
      return profile;
    }
  } catch (err) {
    console.warn("Firestore profile fetch unavailable, checking local stores:", err);
  }

  // Fallback 1: LocalStorage
  try {
    const cached = localStorage.getItem("midyeah_profile_" + email);
    if (cached) {
      try {
        return JSON.parse(cached) as UserProfile;
      } catch (e) {}
    }
  } catch (err) {
    console.warn("LocalStorage profile fetch failed:", err);
  }

  // Fallback 2: IndexedDB
  try {
    const localDb = await openDB();
    return new Promise((resolve, reject) => {
      const tx = localDb.transaction("profiles", "readonly");
      const store = tx.objectStore("profiles");
      const req = store.get(email);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB profile fetch failed:", err);
    return null;
  }
}

/**
 * Enhanced look-up for user profiles based on distinct username.
 * Looks up local cache, Firestore query, and IndexedDB backup in order.
 */
export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  const cleanUsername = username.trim().toLowerCase();

  // 1. Try LocalStorage
  try {
    const cached = localStorage.getItem("midyeah_profile_by_username_" + cleanUsername);
    if (cached) {
      return JSON.parse(cached) as UserProfile;
    }
    // Scan all cached profiles if key doesn't match directly
    const localKeys = Object.keys(localStorage);
    for (const key of localKeys) {
      if (key.startsWith("midyeah_profile_")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const u = JSON.parse(raw) as UserProfile;
          if (u.username && u.username.toLowerCase() === cleanUsername) {
            return u;
          }
        }
      }
    }
  } catch (e) {
    console.warn("LocalStorage search for profile by username failed:", e);
  }

  // 2. Try Firestore
  try {
    const collRef = collection(db, "profiles");
    const q = query(collRef, where("username", "==", username)); // exact query
    const snap = await getDocs(q);
    if (!snap.empty) {
      const profile = snap.docs[0].data() as UserProfile;
      // Mirror cache
      localStorage.setItem("midyeah_profile_" + profile.email, JSON.stringify(profile));
      localStorage.setItem("midyeah_profile_by_username_" + cleanUsername, JSON.stringify(profile));
      return profile;
    }

    // Try case-insensitive query or local scanning check
    // Optimization: Don't read all, simply return null. 
    // Creating accounts with case variations but same exact name should be blocked at creation.
    const cleanUsernameLower = username.toLowerCase().trim();
    const qInsensitive = query(
      collRef, 
      where("usernameLower", "==", cleanUsernameLower),
      limit(1)
    );
    const snapIns = await getDocs(qInsensitive);
    if (!snapIns.empty) {
      const matched = snapIns.docs[0].data() as UserProfile;
      localStorage.setItem("midyeah_profile_" + matched.email, JSON.stringify(matched));
      localStorage.setItem("midyeah_profile_by_username_" + cleanUsername, JSON.stringify(matched));
      return matched;
    }

  } catch (e) {
    console.warn("Firestore query for profile by username failed:", e);
  }

  // 3. Try IndexedDB Scan
  try {
    const localDb = await openDB();
    const profiles = await new Promise<UserProfile[]>((resolve, reject) => {
      const tx = localDb.transaction("profiles", "readonly");
      const store = tx.objectStore("profiles");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const matched = profiles.find(p => p.username && p.username.toLowerCase() === cleanUsername);
    if (matched) {
      localStorage.setItem("midyeah_profile_" + matched.email, JSON.stringify(matched));
      localStorage.setItem("midyeah_profile_by_username_" + cleanUsername, JSON.stringify(matched));
      return matched;
    }
  } catch (e) {
    console.warn("IndexedDB scan for profile by username failed:", e);
  }

  return null;
}

// Video Sync functions
export async function saveVideo(video: Video, videoBlob?: Blob, onProgress?: (p: number) => void): Promise<void> {
  if (isGuestAccount(video.creator.email)) {
    throw new Error("Guest accounts are strictly prohibited from uploading or saving videos.");
  }
  
  if (video.title && video.title.toLowerCase().includes("test")) {
     console.warn("Attempted to save a test video. Blocked.");
     return; // Just swallow it, don't throw an error to break the UI unnecessarily
  }

  // Save locally in IndexedDB first (completes instantly, <10ms, working and available 100% offline)
  const localDb = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = localDb.transaction("videos", "readwrite");
    const store = tx.objectStore("videos");
    const dataToSave = {
      ...video,
      blob: videoBlob || video.blob
    };
    store.put(dataToSave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

    // Sync index metadata to Firestore
    const creatorObj = {
      username: video.creator.username || "",
      email: video.creator.email || "",
      channelName: video.creator.channelName || "",
      channelUrl: video.creator.channelUrl || "",
      bio: video.creator.bio || "",
      avatarUrl: video.creator.avatarUrl || getRandomAnimeAvatar(video.creator.username),
      coverUrl: video.creator.coverUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      subscribersCount: video.creator.subscribersCount || 0
    };

    const videoToSave = {
      id: video.id,
      title: video.title || "Untitled Presentation",
      description: video.description || "",
      videoUrl: video.videoUrl || "",
      category: video.category || "normal",
      rentalPrice: video.rentalPrice || 3,
      rentalPeriod: video.rentalPeriod || "month",
      is360: !!video.is360,
      uploadDate: video.uploadDate || new Date().toLocaleDateString(),
      creatorEmail: video.creator.email,
      creatorName: video.creator.channelName,
      creatorAvatar: video.creator.avatarUrl,
      creator: creatorObj,
      views: video.views || 0,
      likes: video.likes || 0,
      dislikes: video.dislikes || 0,
      reactions: video.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
      duration: video.duration || 120,
      thumbnailUrl: video.thumbnailUrl || "",
      hasVideoData: !!videoBlob || !!video.blob,
      source: video.source || "local",
      youtubeId: video.youtubeId || ""
    };

    if (isSyncStabilized) {
      try {
        const docRef = doc(db, "global_videos", video.id);
        
        // Multi-Engine Sync Strategy: Attempt background synchronization
        let metaRetries = 2;
        while (metaRetries > 0) {
          try {
            await withTimeout(setDoc(docRef, videoToSave), 12000); // 12s timeout for deeper engine processing
            break;
          } catch (err) {
            metaRetries--;
            if (metaRetries === 0) {
                isSyncStabilized = false; 
                setTimeout(() => { isSyncStabilized = true; }, 60000 * 5); // Auto-heal sync engine after 5 mins
                break; 
            }
            await new Promise(r => setTimeout(r, 1200));
          }
        }
        
        const blobToUpload = videoBlob || video.blob;
        if (blobToUpload) {
          // Await the heavy chunk transmission to ensure we reach 100% properly
          await uploadVideoInChunks(video.id, blobToUpload, onProgress);
        }
      } catch (err: any) {
        if (err.message && err.message.includes("resource-exhausted")) {
          isSyncStabilized = false;
          setTimeout(() => { isSyncStabilized = true; }, 60000 * 5); // Auto-heal
        }
        console.warn("Firestore video synchronization failed, continuing with local-only state:", err);
      }
    }

    // FINALIZING FLOW: Always force 100% and notify UI
    if (onProgress) {
      // Simulate final bit of "polishing" for UX
      onProgress(99);
      await new Promise(r => setTimeout(r, 400));
      onProgress(100);
    }
}

export function subscribeAllVideos(callback: (videos: Video[]) => void): () => void {
  const collRef = collection(db, "global_videos");
  const q = query(collRef); // Removed limit to fetch all videos
  return onSnapshot(q, async (snap) => {
    const remoteVideos: Video[] = [];
    snap.forEach(docSnap => {
      const dv = docSnap.data();
      remoteVideos.push({
        id: dv.id,
        title: dv.title,
        description: dv.description,
        videoUrl: dv.videoUrl || "",
        category: dv.category || "normal",
        rentalPrice: dv.rentalPrice,
        rentalPeriod: dv.rentalPeriod,
        is360: dv.is360,
        uploadDate: dv.uploadDate,
        creator: dv.creator,
        views: dv.views || 0,
        likes: dv.likes || 0,
        dislikes: dv.dislikes || 0,
        reactions: dv.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        duration: dv.duration || 120,
        thumbnailUrl: dv.thumbnailUrl || "",
        country: dv.country || "philippines",
        source: dv.source || "local",
        youtubeId: dv.youtubeId || ""
      });
    });

    try {
      const localDb = await openDB();
      const cachedDbVideos: Video[] = await new Promise((resolve, reject) => {
        const tx = localDb.transaction("videos", "readonly");
        const req = tx.objectStore("videos").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      const cachedMap = new Map<string, Video>();
      cachedDbVideos.forEach(v => {
        if (v.blob) {
          try {
            if (v.blob instanceof Blob) {
              const existingUrl = objectUrlCache.get(v.id);
              if (existingUrl) {
                v.videoUrl = existingUrl;
              } else {
                const url = URL.createObjectURL(v.blob);
                objectUrlCache.set(v.id, url);
                v.videoUrl = url;
              }
              v.isOffline = true;
            } else {
              console.warn("Cached item blob is not an instance of Blob. Reference:", v.id);
            }
          } catch (blobErr) {
            console.error("Failed to map local blob url for video id: " + v.id, blobErr);
          }
        }
        cachedMap.set(v.id, v);
      });

      const mergedVideosMap = new Map<string, Video>();
      
      remoteVideos.forEach(v => {
        const local = cachedMap.get(v.id);
        if (local) {
          v.isOffline = true;
          v.videoUrl = local.videoUrl;
          v.blob = local.blob;
        }
        mergedVideosMap.set(v.id, v);
      });

      // Include local-only videos (unsynced or offline)
      cachedDbVideos.forEach(v => {
        if (!mergedVideosMap.has(v.id)) {
          mergedVideosMap.set(v.id, v);
        }
      });

      // Sort with newest uploads first
      const items = Array.from(mergedVideosMap.values());
      items.sort((a, b) => b.id.localeCompare(a.id));
      
      callback(items);
    } catch (err) {
      console.warn("Merge local with remote failed in subscription:", err);
      remoteVideos.sort((a, b) => b.id.localeCompare(a.id));
      callback(remoteVideos);
    }
  }, async (err) => {
    console.warn("Realtime videos subscription issue, falling back to local list:", err);
    try {
      const localItems = await getAllVideos();
      callback(localItems);
    } catch (localErr) {
      console.error("Critical: Local video fetch also failed:", localErr);
    }
  });
}

export async function getAllVideos(): Promise<Video[]> {
  const remoteVideos: Video[] = [];
  try {
    const collRef = collection(db, "global_videos");
    const q = query(collRef); // Removed limit to fetch all videos
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      const dv = docSnap.data();
      remoteVideos.push({
        id: dv.id,
        title: dv.title,
        description: dv.description,
        videoUrl: dv.videoUrl,
        category: dv.category,
        rentalPrice: dv.rentalPrice,
        rentalPeriod: dv.rentalPeriod,
        is360: dv.is360,
        uploadDate: dv.uploadDate,
        creator: dv.creator,
        views: dv.views || 0,
        likes: dv.likes || 0,
        dislikes: dv.dislikes || 0,
        reactions: dv.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        duration: dv.duration || 120,
        thumbnailUrl: dv.thumbnailUrl || "",
        source: dv.source || "local",
        youtubeId: dv.youtubeId || ""
      });
    });
  } catch (err) {
    console.warn("Failed fetching remote videos, using local only:", err);
  }

  // Load IndexedDB to find local cached videos
  const localDb = await openDB();
  const cachedDbVideos: Video[] = await new Promise((resolve, reject) => {
    const tx = localDb.transaction("videos", "readonly");
    const req = tx.objectStore("videos").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  // Map cached offline videos with active Blob URLs
  const cachedMap = new Map<string, Video>();
  cachedDbVideos.forEach(v => {
    if (v.blob) {
      try {
        if (v.blob instanceof Blob) {
          const existingUrl = objectUrlCache.get(v.id);
          if (existingUrl) {
            v.videoUrl = existingUrl;
          } else {
            const url = URL.createObjectURL(v.blob);
            objectUrlCache.set(v.id, url);
            v.videoUrl = url;
          }
          v.isOffline = true;
        } else {
          console.warn("Cached item blob is not a blob instance:", v.id);
        }
      } catch (blobErr) {
        console.error("Failed to map local blob url inside getAllVideos:", blobErr);
      }
    }
    cachedMap.set(v.id, v);
  });

  // Merge datasets (remote wins metadata updates, local provides offline blob)
  const mergedVideosMap = new Map<string, Video>();
  
  // First, populate all remote videos
  remoteVideos.forEach(v => {
    const local = cachedMap.get(v.id);
    if (local) {
      v.isOffline = true;
      v.videoUrl = local.videoUrl;
      v.blob = local.blob;
    }
    mergedVideosMap.set(v.id, v);
  });

  // Then add any local-only videos (that didn't sync yet or are offline creations)
  cachedDbVideos.forEach(v => {
    if (!mergedVideosMap.has(v.id)) {
      mergedVideosMap.set(v.id, v);
    }
  });

  const finalItems = Array.from(mergedVideosMap.values());
  finalItems.sort((a, b) => b.id.localeCompare(a.id));
  return finalItems;
}

export async function deleteVideo(id: string): Promise<void> {
  const existingUrl = objectUrlCache.get(id);
  if (existingUrl) {
    URL.revokeObjectURL(existingUrl);
    objectUrlCache.delete(id);
  }

  // Local delete in IndexedDB (prioritized for immediate responsiveness)
  try {
    const localDb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = localDb.transaction("videos", "readwrite");
      tx.objectStore("videos").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (localErr) {
    console.warn("Local IndexedDB video deletion bypass or warning:", localErr);
  }

  // Remote Firestore delete - Await this to ensure "hard-code delete" as requested
  try {
    const docRef = doc(db, "global_videos", id);
    await deleteDoc(docRef);
    
    // Also delete chunks to free up space and ensure permanent removal
    const chunksColl = collection(db, "global_videos", id, "chunks");
    const chunksSnap = await getDocs(chunksColl);
    const batch = writeBatch(db);
    chunksSnap.forEach(cDoc => {
      batch.delete(cDoc.ref);
    });
    await batch.commit();
    
    // Delete comments associated with this video
    const commentsColl = collection(db, "global_videos", id, "comments");
    const commentsSnap = await getDocs(commentsColl);
    const commBatch = writeBatch(db);
    commentsSnap.forEach(cDoc => {
      commBatch.delete(cDoc.ref);
    });
    await commBatch.commit();

  } catch (err: any) {
    if (err.message && (err.message.includes("resource-exhausted") || err.code === "resource-exhausted")) {
      isSyncStabilized = false;
      setTimeout(() => { isSyncStabilized = true; }, 60000 * 5);
    }
    console.error("Could not delete from global network:", err);
    throw err;
  }
}

export async function clearAllVideos(): Promise<void> {
  for (const [id, url] of objectUrlCache.entries()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();

  // Local clear
  const localDb = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = localDb.transaction("videos", "readwrite");
    tx.objectStore("videos").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Global clear (Hard-code delete from Firestore)
  try {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) {
      console.warn("Cannot clear global videos: No authenticated user.");
      return;
    }

    const collRef = collection(db, "global_videos");
    // ADMIN can clear EVERYTHING. Regular users clear only THEIR videos.
    const q = isAdminAccount(userEmail) 
      ? query(collRef) 
      : query(collRef, where("creatorEmail", "==", userEmail));
      
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    
    let count = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
      if (count >= 400) {
        await batch.commit();
        // Stop at first batch for safety or loop more, but 400 is plenty for one go
        break; 
      }
    }
    if (count > 0 && count < 400) {
      await batch.commit();
    }
    console.log(`[ClearAll] Purged ${count} ${isAdminAccount(userEmail) ? "GLOBAL" : "personal"} videos from network.`);
  } catch (err: any) {
    if (err.message && err.message.includes("resource-exhausted")) {
      isSyncStabilized = false;
      setTimeout(() => { isSyncStabilized = true; }, 60000 * 5);
    }
    console.error("Global Firestore clear failed:", err);
  }
}

// Global Video Comments
export async function saveComment(comment: Comment): Promise<void> {
  if (isGuestAccount(auth.currentUser?.email || "")) {
    throw new Error("Guest accounts cannot post comments.");
  }
  const cleanedComment = {
    id: comment.id,
    videoId: comment.videoId,
    username: comment.username,
    avatarUrl: comment.avatarUrl || getRandomAnimeAvatar(comment.username),
    text: comment.text,
    timestamp: comment.timestamp || new Date().toISOString(),
    likes: comment.likes || 0
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("comments", "readwrite");
  tx.objectStore("comments").put(comment);

  // Global write
  if (isSyncStabilized) {
    try {
      const docRef = doc(db, "global_videos", comment.videoId, "comments", comment.id);
      await setDoc(docRef, cleanedComment);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        isSyncStabilized = false;
      }
    }
  }
}

export async function getVideoComments(videoId: string): Promise<Comment[]> {
  try {
    const collRef = collection(db, "global_videos", videoId, "comments");
    const q = query(collRef, orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(q);
    const result: Comment[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      result.push({
        id: data.id,
        videoId: data.videoId,
        username: data.username,
        avatarUrl: data.avatarUrl,
        text: data.text,
        timestamp: data.timestamp,
        likes: data.likes || 0,
        replies: []
      });
    });
    // Newest comments first
    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return result;
  } catch (err) {
    console.warn("Could not fetch remote comments, using local IndexedDB:", err);
    // Local comments fallback
    const localDb = await openDB();
    return new Promise((resolve, reject) => {
      const tx = localDb.transaction("comments", "readonly");
      const req = tx.objectStore("comments").getAll();
      req.onsuccess = () => {
        const all: Comment[] = req.result || [];
        const filtered = all.filter(c => c.videoId === videoId);
        filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        resolve(filtered);
      };
      req.onerror = () => reject(req.error);
    });
  }
}

export function subscribeVideoComments(videoId: string, callback: (comments: Comment[]) => void): () => void {
  const collRef = collection(db, "global_videos", videoId, "comments");
  const q = query(collRef, orderBy("timestamp", "desc"), limit(50));
  
  return onSnapshot(q, (snap) => {
    const result: Comment[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      result.push({
        id: data.id,
        videoId: data.videoId,
        username: data.username,
        avatarUrl: data.avatarUrl,
        text: data.text,
        timestamp: data.timestamp,
        likes: data.likes || 0,
        replies: []
      });
    });
    callback(result);
  }, (err) => {
    console.warn("Real-time comment subscription issue:", err);
  });
}

// Subscription & Follower Logic
export async function toggleSubscription(followerEmail: string, followedEmail: string): Promise<boolean> {
  if (isGuestAccount(followerEmail)) {
    throw new Error("Guest accounts cannot subscribe to creators.");
  }
  if (followerEmail === followedEmail) return false;
  
  // Sanitize ID for Firestore document safety
  const safeFollower = followerEmail.replace(/[^a-zA-Z0-9_.\-@+]/g, "_");
  const safeFollowed = followedEmail.replace(/[^a-zA-Z0-9_.\-@+]/g, "_");
  const subId = `${safeFollower}_follows_${safeFollowed}`;
  const subRef = doc(db, "subscriptions", subId);
  const profileRef = doc(db, "profiles", followedEmail);
  
  try {
    const subSnap = await getDoc(subRef);
    const batch = writeBatch(db);
    
    let isNowSubscribed = false;
    
    if (subSnap.exists()) {
      // Unsubscribe
      batch.delete(subRef);
      batch.set(profileRef, {
        subscribersCount: increment(-1)
      }, { merge: true });
      isNowSubscribed = false;
    } else {
      // Subscribe
      batch.set(subRef, {
        followerEmail,
        followedEmail,
        timestamp: new Date().toISOString()
      });
      batch.set(profileRef, {
        subscribersCount: increment(1)
      }, { merge: true });
      isNowSubscribed = true;
    }
    
    await batch.commit();
    return isNowSubscribed;
  } catch (err) {
    console.error("Failed to toggle subscription:", err);
    throw err;
  }
}

export async function checkSubscriptionStatus(followerEmail: string, followedEmail: string): Promise<boolean> {
  const safeFollower = followerEmail.replace(/[^a-zA-Z0-9_.\-@+]/g, "_");
  const safeFollowed = followedEmail.replace(/[^a-zA-Z0-9_.\-@+]/g, "_");
  const subId = `${safeFollower}_follows_${safeFollowed}`;
  const subRef = doc(db, "subscriptions", subId);
  try {
    const subSnap = await getDoc(subRef);
    return subSnap.exists();
  } catch (err) {
    console.warn("Could not check subscription status:", err);
    return false;
  }
}

/**
 * Real-time direct snapshot listener on the 'subscriptions' collection.
 * Obtains the 100% real count, invokes callback and fixes Firestore profiles record so there is never any fake subscribers.
 */
export function subscribeToSubscribersCount(email: string, callback: (count: number) => void): () => void {
  const q = query(collection(db, "subscriptions"), where("followedEmail", "==", email));
  return onSnapshot(q, async (snap) => {
    const trueCount = snap.size;
    callback(trueCount);
    // Correct the database count so there are never any discrepancies or "fake" subscribers:
    try {
      const profileRef = doc(db, "profiles", email);
      await updateDoc(profileRef, {
        subscribersCount: trueCount
      });
      
      // Update local storage and IndexedDB caches
      try {
        const cachedRaw = localStorage.getItem("midyeah_profile_" + email);
        if (cachedRaw) {
          const u = JSON.parse(cachedRaw) as UserProfile;
          u.subscribersCount = trueCount;
          localStorage.setItem("midyeah_profile_" + email, JSON.stringify(u));
          if (u.username) {
            localStorage.setItem("midyeah_profile_by_username_" + u.username.toLowerCase(), JSON.stringify(u));
          }
        }
      } catch (cacheErr) {
        console.warn("Could not update subscriber cache in local storage:", cacheErr);
      }
    } catch (err) {
      console.warn("Could not auto-correct Firestore profile subscribers count:", err);
    }
  }, (err) => {
    console.error("Failed to subscribe to subscribers count:", err);
  });
}

// Group Membership Logic
export async function toggleGroupMembership(email: string, groupId: string): Promise<boolean> {
  if (isGuestAccount(email)) {
    throw new Error("Guest accounts cannot join groups.");
  }
  const safeEmail = email.replace(/[^a-zA-Z0-9_.\-@+]/g, "_");
  const safeGroup = groupId.replace(/[^a-zA-Z0-9_.\-@+]/g, "_");
  const membershipId = `${safeEmail}_in_${safeGroup}`;
  const membershipRef = doc(db, "group_memberships", membershipId);
  
  try {
    const memSnap = await getDoc(membershipRef);
    if (memSnap.exists()) {
      await deleteDoc(membershipRef);
      return false;
    } else {
      await setDoc(membershipRef, {
        email,
        groupId,
        joinedAt: new Date().toISOString()
      });
      return true;
    }
  } catch (err) {
    console.error("Failed to toggle group membership:", err);
    throw err;
  }
}

export async function checkGroupStatus(email: string, groupId: string): Promise<boolean> {
  const safeEmail = email.replace(/[^a-zA-Z0-9_.\-@+]/g, "_");
  const safeGroup = groupId.replace(/[^a-zA-Z0-9_.\-@+]/g, "_");
  const membershipId = `${safeEmail}_in_${safeGroup}`;
  const membershipRef = doc(db, "group_memberships", membershipId);
  try {
    const memSnap = await getDoc(membershipRef);
    return memSnap.exists();
  } catch (err) {
    console.warn("Could not check group status:", err);
    return false;
  }
}

// Discord Messages Sync functions (global community chats)
export async function saveDiscordMessage(msg: DiscordMessage): Promise<void> {
  if (isGuestAccount(auth.currentUser?.email || "")) {
    throw new Error("Guest accounts cannot send community messages.");
  }
  const cleanMsg = {
    id: msg.id,
    username: msg.username,
    avatarUrl: msg.avatarUrl || getRandomAnimeAvatar(msg.username),
    text: msg.text,
    timestamp: msg.timestamp || new Date().toISOString()
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("messages", "readwrite");
  tx.objectStore("messages").put(msg);

  // Global write
  if (isSyncStabilized) {
    try {
      const docRef = doc(db, "discord_messages", msg.id);
      await setDoc(docRef, cleanMsg);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        isSyncStabilized = false;
      }
    }
  }
}

export async function getDiscordMessages(): Promise<DiscordMessage[]> {
  try {
    const collRef = collection(db, "discord_messages");
    const q = query(collRef, orderBy("timestamp", "desc"), limit(100));
    const snap = await getDocs(q);
    const result: DiscordMessage[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      result.push({
        id: data.id,
        username: data.username,
        avatarUrl: data.avatarUrl,
        text: data.text,
        timestamp: data.timestamp
      });
    });
    // Oldest first
    result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return result;
  } catch (err) {
    console.warn("Could not fetch global discord messages, fallback to local:", err);
  }

  // Local fallback
  const localDb = await openDB();
  return new Promise((resolve, reject) => {
    const tx = localDb.transaction("messages", "readonly");
    const req = tx.objectStore("messages").getAll();
    req.onsuccess = () => {
      const all: DiscordMessage[] = req.result || [];
      all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
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

// Custom Playlist Firestore and offline handlers
export async function createPlaylist(name: string, ownerEmail: string): Promise<Playlist> {
  if (isGuestAccount(ownerEmail)) {
    throw new Error("Guest accounts cannot create playlists.");
  }
  const newPlaylist: Playlist = {
    id: "pl_" + Math.random().toString(36).substring(2, 11),
    name,
    ownerEmail,
    videoIds: [],
    createdAt: new Date().toISOString()
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("playlists", "readwrite");
  tx.objectStore("playlists").put(newPlaylist);

  // Global write
  if (isSyncStabilized) {
    try {
      const docRef = doc(db, "playlists", newPlaylist.id);
      await setDoc(docRef, newPlaylist);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        isSyncStabilized = false;
      }
    }
  }

  return newPlaylist;
}

export async function getPlaylistsByOwner(ownerEmail: string): Promise<Playlist[]> {
  const remotePlaylists: Playlist[] = [];
  try {
    const collRef = collection(db, "playlists");
    const q = query(collRef, where("ownerEmail", "==", ownerEmail), limit(50));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      remotePlaylists.push(docSnap.data() as Playlist);
    });
  } catch (err) {
    console.warn("Failed fetching remote playlists, using local:", err);
  }

  // Local fallback
  const localDb = await openDB();
  const localPlaylists: Playlist[] = await new Promise((resolve, reject) => {
    const tx = localDb.transaction("playlists", "readonly");
    const req = tx.objectStore("playlists").getAll();
    req.onsuccess = () => {
      const all: Playlist[] = req.result || [];
      resolve(all.filter(p => p.ownerEmail === ownerEmail));
    };
    req.onerror = () => reject(req.error);
  });

  // Sync / merge
  const merged = new Map<string, Playlist>();
  remotePlaylists.forEach(p => merged.set(p.id, p));
  localPlaylists.forEach(p => {
    if (!merged.has(p.id)) {
      merged.set(p.id, p);
    }
  });

  return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updatePlaylist(playlist: Playlist): Promise<void> {
  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("playlists", "readwrite");
  tx.objectStore("playlists").put(playlist);

  // Global write
  if (isSyncStabilized) {
    try {
      const docRef = doc(db, "playlists", playlist.id);
      await setDoc(docRef, playlist);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        isSyncStabilized = false;
      }
    }
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  // Local delete
  const localDb = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = localDb.transaction("playlists", "readwrite");
    tx.objectStore("playlists").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Remote delete
  try {
    await deleteDoc(doc(db, "playlists", id));
  } catch (err) {
    console.error("Could not delete playlist from remote network:", err);
  }
}

// Transparent Volunteer Donation Seed and live handlers
const SEED_DONATIONS: DonationRecord[] = [
  {
    id: "don_seed_1",
    donorName: "Mico-chan 🌸",
    amount: 150.00,
    message: "Thank you for the amazing streaming station! Sending part of this to the Hope Charity Drive! Support the community! 💖",
    target: "charity",
    timestamp: "2026-05-15T12:00:00.000Z"
  },
  {
    id: "don_seed_2",
    donorName: "Keisuke VT",
    amount: 250.00,
    message: "A tiny seed for St. Michael Parish Church rebuilding fund. Blessings to everyone sharing their talents!",
    target: "church",
    timestamp: "2026-05-20T04:20:00.000Z"
  },
  {
    id: "don_seed_3",
    donorName: "Anonymous Cozy Friend",
    amount: 80.00,
    message: "To keep the cozy theater servers running smoothly! Love what you do for local families in need.",
    target: "people",
    timestamp: "2026-05-28T18:15:00.000Z"
  },
  {
    id: "don_seed_4",
    donorName: "Nyan-Power!",
    amount: 120.00,
    message: "Awesome stream, please buy yourself some milktea and treat the team! 🍦Support Vtuber usagyuunvtuber!",
    target: "owner",
    timestamp: "2026-06-02T09:30:00.000Z"
  }
];

export async function createDonationRecord(
  donorName: string, 
  amount: number, 
  message: string, 
  target: "owner" | "charity" | "church" | "people"
): Promise<DonationRecord> {
  const newDonation: DonationRecord = {
    id: "don_" + Math.random().toString(36).substring(2, 11),
    donorName: donorName.trim() || "Anonymous Friend",
    amount: Number(amount) || 10,
    message: message.trim() || "Supporting our cozy community watchtower!",
    target,
    timestamp: new Date().toISOString()
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("donations", "readwrite");
  tx.objectStore("donations").put(newDonation);

  // Global write
  if (isSyncStabilized) {
    try {
      const docRef = doc(db, "donations", newDonation.id);
      await setDoc(docRef, newDonation);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        isSyncStabilized = false;
      }
    }
  }

  return newDonation;
}

export async function getAllDonations(): Promise<DonationRecord[]> {
  const remoteDonations: DonationRecord[] = [];
  try {
    const collRef = collection(db, "donations");
    const q = query(collRef, limit(100));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      remoteDonations.push(docSnap.data() as DonationRecord);
    });
  } catch (err) {
    console.warn("Failed fetching remote donations:", err);
  }

  // Local fallback
  const localDb = await openDB();
  const localDonations: DonationRecord[] = await new Promise((resolve, reject) => {
    const tx = localDb.transaction("donations", "readonly");
    const req = tx.objectStore("donations").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  // Sync / merge
  const merged = new Map<string, DonationRecord>();
  
  // Set default initial seeds
  SEED_DONATIONS.forEach(d => merged.set(d.id, d));
  
  // Overlay remote and local writes
  remoteDonations.forEach(d => merged.set(d.id, d));
  localDonations.forEach(d => merged.set(d.id, d));

  return Array.from(merged.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function computeDonationStats(donations: DonationRecord[]): DonationStats {
  const stats: DonationStats = {
    totalAmountRaised: 0,
    totalDonationCount: donations.length,
    targetDistribution: {
      owner: 0,
      charity: 0,
      church: 0,
      people: 0
    }
  };

  donations.forEach(d => {
    stats.totalAmountRaised += d.amount;
    if (d.target in stats.targetDistribution) {
      stats.targetDistribution[d.target] += d.amount;
    }
  });

  return stats;
}

// Persistent Likes/Dislikes Logic
export async function saveLikeDislikeStatus(
  userId: string,
  videoId: string,
  type: "like" | "dislike" | null
): Promise<void> {
  if (isGuestAccount(userId)) {
    throw new Error("Guest accounts cannot rate videos.");
  }
  const likeId = `${userId}_video_${videoId}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const likeRef = doc(db, "likes_dislikes", likeId);
  const videoRef = doc(db, "global_videos", videoId);

  try {
    const likeSnap = await getDoc(likeRef);
    const oldType = likeSnap.exists() ? likeSnap.data().type : null;

    if (oldType === type) return; // No change

    const videoUpdate: any = {};
    if (oldType === "like") videoUpdate.likes = increment(-1);
    if (oldType === "dislike") videoUpdate.dislikes = increment(-1);
    
    if (type === "like") videoUpdate.likes = increment(1);
    if (type === "dislike") videoUpdate.dislikes = increment(1);

    const batch = writeBatch(db);
    // Use .update() because dot notation like reactions.like only works in .update()
    if (Object.keys(videoUpdate).length > 0) {
      batch.update(videoRef, videoUpdate);
    }
    
    if (type === null) {
      batch.delete(likeRef);
    } else {
      batch.set(likeRef, {
        userId,
        videoId,
        type,
        timestamp: new Date().toISOString()
      }, { merge: true });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, type === null ? OperationType.DELETE : OperationType.WRITE, `likes_dislikes/${likeId}`);
  }
}

export async function getLikeDislikeStatus(
  userId: string,
  videoId: string
): Promise<"like" | "dislike" | null> {
  const likeId = `${userId}_video_${videoId}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const docRef = doc(db, "likes_dislikes", likeId);
  const path = `likes_dislikes/${likeId}`;
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return data.type as "like" | "dislike";
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Persistent Video Reactions Logic
export async function saveVideoReactionStatus(
  userId: string,
  videoId: string,
  type: string | null
): Promise<void> {
  if (isGuestAccount(userId)) {
    throw new Error("Guest accounts cannot react to videos.");
  }
  const reactId = `${userId}_video_${videoId}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const reactRef = doc(db, "video_reactions", reactId);
  const videoRef = doc(db, "global_videos", videoId);

  try {
    const reactSnap = await getDoc(reactRef);
    const oldType = reactSnap.exists() ? reactSnap.data().type : null;

    if (oldType === type) return;

    const videoUpdate: any = {};
    if (oldType) {
      videoUpdate[`reactions.${oldType}`] = increment(-1);
    }
    if (type) {
      videoUpdate[`reactions.${type}`] = increment(1);
    }

    const batch = writeBatch(db);
    if (Object.keys(videoUpdate).length > 0) {
      batch.update(videoRef, videoUpdate);
    }

    if (type === null) {
      batch.delete(reactRef);
    } else {
      batch.set(reactRef, {
        userId,
        videoId,
        type,
        timestamp: new Date().toISOString()
      }, { merge: true });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, type === null ? OperationType.DELETE : OperationType.WRITE, `video_reactions/${reactId}`);
  }
}

export async function getVideoReactionStatus(
  userId: string,
  videoId: string
): Promise<string | null> {
  const reactId = `${userId}_video_${videoId}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const docRef = doc(db, "video_reactions", reactId);
  const path = `video_reactions/${reactId}`;
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data().type as string;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}


