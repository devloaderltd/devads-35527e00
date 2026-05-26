import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect, useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, Quote, Code, Eraser, Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
};

export function RichTextEditor({ value, onChange, placeholder, maxLength = 4000, className }: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      CharacterCount.configure({ limit: maxLength }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "rte-content min-h-[160px] w-full px-3 py-2 focus:outline-none text-[0.95rem] leading-relaxed",
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  // Sync external value changes (e.g. AI-generated description)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (incoming && incoming !== current && incoming !== "<p></p>") {
      editor.commands.setContent(incoming, { emitUpdate: false });
    } else if (!incoming && current !== "<p></p>") {
      editor.commands.clearContent(false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className={cn("rounded-2xl border border-input bg-white/70 backdrop-blur min-h-[200px]", className)} />
    );
  }

  const count = editor.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className={cn("rounded-2xl border border-input bg-white/70 backdrop-blur focus-within:ring-1 focus-within:ring-ring", className)}>
      <Toolbar editor={editor} emojiOpen={emojiOpen} setEmojiOpen={setEmojiOpen} />
      <EditorContent editor={editor} />
      <div className="flex items-center justify-between border-t border-border/50 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>Tip: select text to format</span>
        <span>{count}/{maxLength}</span>
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, children, label }: {
  active?: boolean; onClick: () => void; children: React.ReactNode; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground transition",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, emojiOpen, setEmojiOpen }: {
  editor: Editor; emojiOpen: boolean; setEmojiOpen: (o: boolean) => void;
}) {
  const addLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    let safe = url.trim();
    if (!/^https?:\/\//i.test(safe) && !safe.startsWith("mailto:")) safe = `https://${safe}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/50 px-2 py-1.5">
      <ToolBtn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Link" active={editor.isActive("link")} onClick={addLink}>
        <LinkIcon className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <Eraser className="h-4 w-4" />
      </ToolBtn>

      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-8 gap-1 px-2 text-foreground/70 hover:text-foreground"
            title="Insert emoji"
          >
            <Smile className="h-4 w-4" />
            <span className="text-xs">Emoji</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-auto border-0 bg-transparent p-0 shadow-none"
        >
          <Suspense fallback={<div className="h-[350px] w-[300px] rounded-md bg-card" />}>
            <EmojiPicker
              onEmojiClick={(e) => {
                editor.chain().focus().insertContent(e.emoji).run();
                setEmojiOpen(false);
              }}
              width={300}
              height={350}
              previewConfig={{ showPreview: false }}
              searchPlaceholder="Search emoji"
              lazyLoadEmojis
            />
          </Suspense>
        </PopoverContent>
      </Popover>
    </div>
  );
}
