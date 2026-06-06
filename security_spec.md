# Security Specification and Threat Model

This document outlines the security architecture and Zero-Trust validation invariants for Midyeah's decentralized video hosting and streaming structure when integrating Firebase (Firestore) and user authentication.

## 1. Data Invariants

- **Profiles Integrity**: A user can only create or update their own workspace profile (where the `email` field matches their authenticating account email).
- **Video Metadata Authenticity**: Only the authenticating creator can publish or modify their own video metadata documents; `creatorEmail` must match the actual user's authenticated email.
- **System-only / Numeric Lock**: Users cannot set abnormal views, likes, or dislikes directly on document creation; increment-only counters must be governed correctly.
- **Chunk Stream Integrity**: Chunks of binary string streams can only be appended to videos by the authenticating creator of the video within bounds.
- **Immortal Time Tracking**: Create timestamp entries are immutable, and update timestamps must be verified against server-time requests.

## 2. The "Dirty Dozen" Malicious Exploits

Below are twelve crafted request payloads designed to compromise integrity, bypass formatting, or conduct spatial spoofing attacks:

1. **Exploit #1: Profile Spoofing** - Authenticating user attempts to override another channel's bio and payout configurations by targeting another user's email document.
2. **Exploit #2: Video Hijacking** - Malicious actor attempts to edit or delete description and parameters on a video owned by another content creator.
3. **Exploit #3: View Counter Manipulation** - Viewer attempts to write an arbitrary large views number (e.g. `views: 999999`) to self-promote an item.
4. **Exploit #4: System Fields Pollution** - Attacker injects fake "isOffline" or administrative tags into `global_videos` metadata to claim internal premium rights.
5. **Exploit #5: Video ID Path Poisoning** - Attacker attempts to create a document with an extremely long (>128 chars) alphanumeric ID to overflow queries.
6. **Exploit #6: Chunk Hijacking** - Attempt to write corrupted or malicious file chunks into another user's video chunks subcollection.
7. **Exploit #7: Empty Comments Spam** - Writing a comment with null/empty content or malicious scripts targeting comment sections.
8. **Exploit #8: Self-Assigned Subscribers Count** - Registering a profile with starting subscribers count set directly to `9999999`.
9. **Exploit #9: Unauthenticated Video Upload** - Attempting to publish video metadata to global lists without signed-in Firebase credentials.
10. **Exploit #10: Mutable Time Manipulation** - Spoofing `uploadDate` by injecting fake future or past string timestamps of arbitrary format.
11. **Exploit #11: Negative Prices On Paid Movies** - Attempting to register normal movie items with negative prices or corrupt price tiers.
12. **Exploit #12: Corrupted Chunk Type Injection** - Uploading a non-string or 5MB-sized single chunk to exploit payload processing.

## 3. Fortress firestore.rules Design

All actions are audited. The firestore security rules define global helpers supporting these validations.
- `isSignedIn()` controls access.
- `isValidUserProfile()` restricts payload keys and asserts exact matches.
- `isValidVideo()` audits keys and confirms uploader identity.
- `isValidVideoChunk()` asserts data-types are strictly strings and size-limited.
- `isOwner(email)` checks auth bounds.
