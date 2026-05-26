## Goal
Upgrade `/messages` with richer filter tabs, instant-send canned replies, polished typing indicators, and per-message read receipts. Most plumbing already exists — this is a focused enhancement pass.

## Current state (what's already built)
- Tabs: `Inbox`, `Archived` ✓
- Realtime typing via Supabase presence ✓ (basic italic line)
- Read receipts via `thread_reads` table ✓ (single "Seen" marker under last message)
- Quick replies: `message_quick_replies` table + `QuickRepliesManager` in Profile, chips in chat that *populate* the input ✓

## Gaps → changes

### 1. Filter tabs: Inbox · Unread · Favorites · Archived
- **DB migration**: add `starred_by uuid[] not null default '{}'` to `message_threads` (mirrors `archived_by`/`muted_by`).
- `_authenticated.messages.tsx`:
  - Add `Unread` tab → filters inbox to threads where `unread > 0`.
  - Add `Favorites` tab → filters threads where `starred_by` contains `user.id`.
  - Show counts in each pill (`Inbox 12 · Unread 3 · ★ 4 · Archived 2`).
  - Add `toggleStar(thread)` action in the thread row dropdown menu (Star / Unstar) and a star icon overlay on starred rows.

### 2. Quick-send canned replies from each chat
- `_authenticated.messages.$threadId.tsx`:
  - Change quick-reply chip behavior: **click = send immediately** (current behavior only fills the input). Add a small caret affordance on each chip → opens a tiny menu with *Send now* / *Edit then send*.
  - Add a "＋ Manage templates" chip at the end of the row that links to `/profile#quick-replies` (anchor scroll) so users can author new templates without leaving the flow.
  - Keep the existing custom-vs-default visual distinction.

### 3. Typing indicator polish
- Replace the static italic text with a small bubble containing animated dots (matching message bubble style), left-aligned like an incoming message. Auto-hide 3s after last keystroke (already throttled).
- Fix: presence track currently re-creates the channel on each `broadcastTyping` call — refactor to keep one channel ref and call `.track({ typing })` on it, so typing actually propagates reliably.

### 4. Read receipts per message
- Today: one "Seen" marker under the whole thread.
- New: for each of *my* outgoing messages, render a tick state at the bottom-right of the bubble:
  - single check `✓` = sent
  - double check `✓✓` (muted) = delivered (other party has an active thread_reads row)
  - double check `✓✓` (primary color) = seen (other party's `last_read_at` ≥ message `created_at`)
- Hover tooltip shows exact "Seen 3:42 PM" timestamp.
- Respect `profiles.show_read_receipts` of the *other* party — if false, fall back to delivered ticks only.

## Technical notes
- All RLS already permits the needed reads/writes; the `starred_by` column reuses the existing "Participants update own thread flags" policy (no policy change needed since the column is on the same row).
- Migration must include GRANT recheck — only the new column, no new table.
- Typing channel ref: store in `useRef`, subscribe once in the existing `useEffect`, reuse for `track()`.
- Per-message ticks: derive from `messages[]` + `otherLastRead` + presence (for delivered hint); pure client computation, no extra queries.

## Files touched
- `supabase/migrations/<new>.sql` — add `message_threads.starred_by`.
- `src/routes/_authenticated.messages.tsx` — tabs, star toggle, counts.
- `src/routes/_authenticated.messages.$threadId.tsx` — quick-send chips, typing bubble, per-message receipts, fetch other party's `show_read_receipts`.
- `src/components/messages/TypingBubble.tsx` *(new, small)* — animated dots.
- `src/components/messages/MessageTicks.tsx` *(new, small)* — tick state renderer.

## Out of scope
- No changes to email notifications, push, or moderation.
- No changes to the quick-replies CRUD UI (it already lives in Profile and works).
