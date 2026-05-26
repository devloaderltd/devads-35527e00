## Add WYSIWYG editor with emoji support to listing description

Replace the plain `Textarea` for the description field on the post-listing page with a lightweight rich-text editor that supports basic formatting and emoji insertion. Render the resulting HTML safely on the listing details page.

### 1. Editor choice
Use **TipTap** (`@tiptap/react` + `@tiptap/starter-kit`) — small, headless, React-first, works with Tailwind, and easy to style with our design tokens. Add **`emoji-picker-react`** for the emoji panel (clean, no extra peer deps, supports native emoji insertion).

Packages to install:
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-link`
- `@tiptap/extension-placeholder`
- `emoji-picker-react`
- `dompurify` (sanitize HTML on render)

### 2. New component: `src/components/RichTextEditor.tsx`
- TipTap editor with StarterKit (bold, italic, lists, headings H2/H3, blockquote, code), Link, Placeholder.
- Compact toolbar: **B**, *I*, H2, H3, • list, 1. list, link, clear formatting, and an 😀 emoji button that opens `EmojiPicker` in a `Popover`. Clicking an emoji inserts at cursor.
- Props: `value: string`, `onChange: (html: string) => void`, `placeholder?: string`, `maxLength?: number`.
- Enforce `maxLength` via the editor's character count (using plain text length); show counter under editor.
- Styled with our existing tokens — rounded-2xl, `bg-white/70 backdrop-blur`, focus ring matching current inputs. ProseMirror content gets `prose prose-sm` styling.

### 3. Wire into `src/routes/_authenticated.post.tsx`
- Replace the description `<Textarea>` with `<RichTextEditor value={description} onChange={setDescription} maxLength={4000} placeholder="…" />`.
- Submission already passes `description` string straight to DB — now it stores HTML (no schema change; `description` is text). AI-generated description (plain text) is still assigned to the same state; TipTap will render it fine.

### 4. Render HTML safely on `src/routes/listings.$id.tsx`
- Where description currently renders as plain text/whitespace-pre-wrap, switch to a `<div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(listing.description) }} />`.
- DOMPurify config: allow basic tags (`p, br, strong, em, u, s, h2, h3, ul, ol, li, blockquote, code, a`) and only `href`, `target`, `rel` on links; force `rel="noopener noreferrer nofollow"` and `target="_blank"` on `<a>`.

### 5. Backward compatibility
Existing plain-text descriptions render correctly inside the `prose` div (text nodes). No migration required.

### Technical notes
- Keep `Textarea` import removed only if unused elsewhere in the file.
- Character limit counts editor's plain text (`editor.storage.characterCount` via `@tiptap/extension-character-count` — add this too) to match the existing 4000 cap.
- Emoji picker mounted inside a `Popover` so it doesn't blow up layout on mobile (393px viewport).
- No backend / RLS / server function changes.

### Files touched
- add: `src/components/RichTextEditor.tsx`
- edit: `src/routes/_authenticated.post.tsx` (swap Textarea → RichTextEditor)
- edit: `src/routes/listings.$id.tsx` (sanitized HTML render)
- install: tiptap packages, emoji-picker-react, dompurify
