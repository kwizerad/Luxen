"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import ImageResize from "tiptap-extension-resize-image";
import Youtube from "@tiptap/extension-youtube";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CustomYouTubePlayer } from "./custom-youtube-player";

const CustomYouTube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        renderHTML: (attrs: any) => {
          if (attrs.textAlign === "center") return { style: "margin-left: auto; margin-right: auto" };
          if (attrs.textAlign === "right") return { style: "margin-left: auto" };
          if (attrs.textAlign === "left") return { style: "margin-right: auto" };
          return {};
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CustomYouTubePlayer);
  },
});
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import { uploadCourseFile } from "@/lib/course-storage";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  CheckSquare,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Table as TableIcon,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Undo,
  Redo,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Plus,
  Palette,
  Type,
} from "lucide-react";

interface RichEditorProps {
  content: string; // Tiptap JSON string
  onChange: (content: string) => void;
  placeholder?: string;
  onEditorReady?: (editor: import("@tiptap/core").Editor | null) => void;
  stickyToolbar?: boolean;
}

// --- Custom extensions for font size and font family ---
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el: any) => el.style.fontSize || null,
            renderHTML: (attrs: any) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

const FontFamily = Extension.create({
  name: "fontFamily",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (el: any) => el.style.fontFamily?.replace(/["']/g, "") || null,
            renderHTML: (attrs: any) => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontFamily: (family: string) => ({ chain }: any) => chain().setMark("textStyle", { fontFamily: family }).run(),
      unsetFontFamily: () => ({ chain }: any) => chain().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

const TEXT_COLORS = [
  "#ffffff", "#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#9ca3af", "#1f2937",
];
const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#ddd6fe", "#a7f3d0", "#fecaca",
];
const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans", value: "Inter, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Courier", value: "Courier New, monospace" },
];

interface SlashCommand {
  id: string;
  label: string;
  icon: React.ReactNode;
  run: (editor: import("@tiptap/core").Editor) => void;
}

export function RichEditor({ content, onChange, placeholder, onEditorReady, stickyToolbar = false }: RichEditorProps) {
  const [showSlash, setShowSlash] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Superscript,
      Subscript,
      Link.configure({ openOnClick: false }),
      Image,
      ImageResize,
      CustomYouTube.configure({ width: 640, height: 360 }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: placeholder || "Start typing..." }),
      TextStyle,
      Color,
      FontSize,
      FontFamily,
    ],
    content: safeJSON(content),
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        for (const file of Array.from(files)) {
          handleUpload(file);
        }
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "/" && !showSlash) {
          setShowSlash(true);
          setSlashQuery("");
          setSlashIndex(0);
        }
        if (!showSlash) return false;

        if (event.key === "Escape") {
          setShowSlash(false);
          return true;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSlashIndex((i) => (i + 1) % filteredCommands.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSlashIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const cmd = filteredCommands[slashIndex];
          if (cmd && editor) {
            runCommand(cmd, editor);
          }
          return true;
        }
        if (event.key === "Backspace" && slashQuery === "") {
          setShowSlash(false);
          return false;
        }
        if (event.key.length === 1) {
          setSlashQuery((q) => q + event.key);
        }
        return false;
      },
      attributes: {
        class:
          "prose max-w-none mx-0 min-h-[200px] outline-none p-3 border border-[var(--admin-border)] bg-[var(--admin-card)] rounded-b focus-within:border-[var(--admin-primary)] focus-within:ring-1 focus-within:ring-[var(--admin-primary)]/30 transition-all",
      },
    },
  });

  useEffect(() => {
    const ed = editor;
    onEditorReadyRef.current?.(ed);
    if (ed) {
      const handler = () => onEditorReadyRef.current?.(ed);
      ed.on("selectionUpdate", handler);
      return () => {
        ed.off("selectionUpdate", handler);
        onEditorReadyRef.current?.(null);
      };
    }
    return () => onEditorReadyRef.current?.(null);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(safeJSON(content));
    if (current !== next) {
      editor.commands.setContent(safeJSON(content), false);
    }
  }, [content, editor]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!editor) return;
      try {
        const folder = file.type.startsWith("image/") ? "editor/images" : "editor/files";
        const result = await uploadCourseFile(file, folder);
        if (file.type.startsWith("image/")) {
          editor.chain().focus().setImage({ src: result.publicUrl }).run();
        } else if (file.type.startsWith("video/")) {
          editor.chain().focus().insertContent(`<video src="${result.publicUrl}" controls style="max-width:100%"></video>`).run();
        } else if (file.type.startsWith("audio/")) {
          editor.chain().focus().insertContent(`<audio src="${result.publicUrl}" controls style="width:100%"></audio>`).run();
        } else {
          editor.chain().focus().insertContent(`<a href="${result.publicUrl}" target="_blank" rel="noopener noreferrer">${file.name}</a>`).run();
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message || "Upload failed");
      }
    },
    [editor]
  );

  const addYouTube = useCallback(() => {
    if (!editor || !youtubeUrl.trim()) return;
    editor.chain().focus().setYoutubeVideo({ src: youtubeUrl.trim() }).run();
    setShowYouTube(false);
    setYoutubeUrl("");
  }, [editor, youtubeUrl]);

  const commands = useMemo<SlashCommand[]>(
    () => [
      { id: "heading1", label: "Heading 1", icon: <Heading1 className="h-4 w-4" />, run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
      { id: "heading2", label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
      { id: "heading3", label: "Heading 3", icon: <Heading3 className="h-4 w-4" />, run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
      { id: "heading4", label: "Heading 4", icon: <Heading3 className="h-4 w-4" />, run: (e) => e.chain().focus().toggleHeading({ level: 4 }).run() },
      { id: "heading5", label: "Heading 5", icon: <Heading3 className="h-4 w-4" />, run: (e) => e.chain().focus().toggleHeading({ level: 5 }).run() },
      { id: "heading6", label: "Heading 6", icon: <Heading3 className="h-4 w-4" />, run: (e) => e.chain().focus().toggleHeading({ level: 6 }).run() },
      { id: "bulletList", label: "Bullet List", icon: <List className="h-4 w-4" />, run: (e) => e.chain().focus().toggleBulletList().run() },
      { id: "orderedList", label: "Numbered List", icon: <ListOrdered className="h-4 w-4" />, run: (e) => e.chain().focus().toggleOrderedList().run() },
      { id: "taskList", label: "Task List", icon: <CheckSquare className="h-4 w-4" />, run: (e) => e.chain().focus().toggleTaskList().run() },
      { id: "blockquote", label: "Quote", icon: <Quote className="h-4 w-4" />, run: (e) => e.chain().focus().toggleBlockquote().run() },
      { id: "codeBlock", label: "Code Block", icon: <Code className="h-4 w-4" />, run: (e) => e.chain().focus().toggleCodeBlock().run() },
      { id: "horizontalRule", label: "Divider", icon: <Minus className="h-4 w-4" />, run: (e) => e.chain().focus().setHorizontalRule().run() },
      { id: "table", label: "Table", icon: <TableIcon className="h-4 w-4" />, run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      {
        id: "image",
        label: "Image",
        icon: <ImageIcon className="h-4 w-4" />,
        run: (e) => {
          const url = window.prompt("Image URL");
          if (url) e.chain().focus().setImage({ src: url }).run();
        },
      },
      {
        id: "youtube",
        label: "YouTube",
        icon: <Video className="h-4 w-4" />,
        run: (e) => {
          setYoutubeUrl("");
          setShowYouTube(true);
        },
      },
    ],
    []
  );

  const filteredCommands = useMemo(
    () => commands.filter((c) => c.label.toLowerCase().includes(slashQuery.toLowerCase())),
    [commands, slashQuery]
  );

  const runCommand = useCallback(
    (cmd: SlashCommand, ed: import("@tiptap/core").Editor) => {
      ed.chain().focus().deleteRange({ from: ed.state.selection.from - 1, to: ed.state.selection.from }).run();
      cmd.run(ed);
      setShowSlash(false);
      setSlashQuery("");
    },
    []
  );

  const addLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLink(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!editor) return null;

  return (
    <div className="relative">
      <div className={`rich-editor-toolbar relative z-10 flex flex-wrap items-center gap-1.5 p-2 mb-2 min-h-[44px] h-auto border border-[var(--admin-border)] bg-[var(--admin-card)] rounded-t ${stickyToolbar ? "sticky top-[88px] z-20" : ""}`}>
        <ToolbarButton editor={editor} command="toggleBold" icon={<Bold className="h-4 w-4" />} active="bold" title="Bold" />
        <ToolbarButton editor={editor} command="toggleItalic" icon={<Italic className="h-4 w-4" />} active="italic" title="Italic" />
        <ToolbarButton editor={editor} command="toggleUnderline" icon={<UnderlineIcon className="h-4 w-4" />} active="underline" title="Underline" />
        <ToolbarButton editor={editor} command="toggleStrike" icon={<Strikethrough className="h-4 w-4" />} active="strike" title="Strikethrough" />
        <ToolbarButton editor={editor} command="toggleHighlight" icon={<Highlighter className="h-4 w-4" />} active="highlight" title="Highlight" />
        <div className="relative">
          <Button type="button" size="icon" variant="ghost" title="Text Color" onClick={() => { setShowTextColor(!showTextColor); setShowHighlight(false); setShowFontSize(false); setShowFontFamily(false); }} className="h-8 w-8 text-[var(--admin-text)]">
            <Palette className="h-4 w-4" />
          </Button>
          {showTextColor && (
            <div className="absolute z-30 top-9 left-0 p-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-lg">
              <div className="grid grid-cols-3 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => { editor.chain().focus().setColor(color).run(); setShowTextColor(false); }} className="w-6 h-6 rounded-md border border-[var(--admin-border)] hover:scale-110 transition-transform" style={{ background: color }} title={color} />
                ))}
              </div>
              <button type="button" onClick={() => { editor.chain().focus().unsetColor().run(); setShowTextColor(false); }} className="mt-1.5 w-full text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)]">Reset</button>
            </div>
          )}
        </div>
        <div className="relative">
          <Button type="button" size="icon" variant="ghost" title="Highlight Color" onClick={() => { setShowHighlight(!showHighlight); setShowTextColor(false); setShowFontSize(false); setShowFontFamily(false); }} className="h-8 w-8 text-[var(--admin-text)]">
            <span className="flex items-center"><Highlighter className="h-4 w-4" /><span className="ml-0.5 text-[10px]">▾</span></span>
          </Button>
          {showHighlight && (
            <div className="absolute z-30 top-9 left-0 p-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-lg">
              <div className="grid grid-cols-4 gap-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => { editor.chain().focus().toggleHighlight({ color }).run(); setShowHighlight(false); }} className="w-6 h-6 rounded-md border border-[var(--admin-border)] hover:scale-110 transition-transform" style={{ background: color }} title={color} />
                ))}
              </div>
              <button type="button" onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }} className="mt-1.5 w-full text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)]">Reset</button>
            </div>
          )}
        </div>
        <div className="relative">
          <Button type="button" size="icon" variant="ghost" title="Font Size" onClick={() => { setShowFontSize(!showFontSize); setShowTextColor(false); setShowHighlight(false); setShowFontFamily(false); }} className="h-8 w-8 text-[var(--admin-text)]">
            <Type className="h-4 w-4" />
          </Button>
          {showFontSize && (
            <div className="absolute z-30 top-9 left-0 p-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-lg min-w-[80px]">
              {FONT_SIZES.map((size) => (
                <button key={size} type="button" onClick={() => { (editor.chain().focus() as any).setFontSize(size).run(); setShowFontSize(false); }} className="w-full px-2 py-1 text-left text-xs text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] rounded" style={{ fontSize: size }}>{size}</button>
              ))}
              <button type="button" onClick={() => { (editor.chain().focus() as any).unsetFontSize().run(); setShowFontSize(false); }} className="mt-0.5 w-full px-2 py-1 text-left text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)]">Reset</button>
            </div>
          )}
        </div>
        <div className="relative">
          <Button type="button" variant="ghost" title="Font Family" onClick={() => { setShowFontFamily(!showFontFamily); setShowTextColor(false); setShowHighlight(false); setShowFontSize(false); }} className="h-8 px-2 text-[var(--admin-text)] text-xs gap-1">
            <span className="font-sans">A</span>
            <span className="text-[10px]">▾</span>
          </Button>
          {showFontFamily && (
            <div className="absolute z-30 top-9 left-0 p-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-lg min-w-[120px]">
              {FONT_FAMILIES.map((font) => (
                <button key={font.label} type="button" onClick={() => { if (font.value) { (editor.chain().focus() as any).setFontFamily(font.value).run(); } else { (editor.chain().focus() as any).unsetFontFamily().run(); } setShowFontFamily(false); }} className="w-full px-2 py-1 text-left text-xs text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] rounded" style={{ fontFamily: font.value || "inherit" }}>{font.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-[var(--admin-border)] mx-1" />
        <ToolbarButton editor={editor} command="toggleSubscript" icon={<SubscriptIcon className="h-4 w-4" />} active="subscript" title="Subscript" />
        <div className="w-px h-5 bg-[var(--admin-border)] mx-1" />
        <ToolbarButton editor={editor} command={() => editor.chain().focus().setTextAlign("left").run()} icon={<AlignLeft className="h-4 w-4" />} active={{ textAlign: "left" }} title="Align Left" />
        <ToolbarButton editor={editor} command={() => editor.chain().focus().setTextAlign("center").run()} icon={<AlignCenter className="h-4 w-4" />} active={{ textAlign: "center" }} title="Align Center" />
        <ToolbarButton editor={editor} command={() => editor.chain().focus().setTextAlign("right").run()} icon={<AlignRight className="h-4 w-4" />} active={{ textAlign: "right" }} title="Align Right" />
        <div className="w-px h-5 bg-[var(--admin-border)] mx-1" />
        <ToolbarButton editor={editor} command="toggleBulletList" icon={<List className="h-4 w-4" />} active="bulletList" title="Bullet List" />
        <ToolbarButton editor={editor} command="toggleOrderedList" icon={<ListOrdered className="h-4 w-4" />} active="orderedList" title="Numbered List" />
        <ToolbarButton editor={editor} command="toggleTaskList" icon={<CheckSquare className="h-4 w-4" />} active="taskList" title="Task List" />
        <div className="w-px h-5 bg-[var(--admin-border)] mx-1" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title="Insert Link"
          onClick={() => {
            const url = editor.getAttributes("link").href || "";
            setLinkUrl(url);
            setShowLink(true);
          }}
          className={`h-8 w-8 ${editor.isActive("link") ? "text-[var(--admin-primary)] bg-[var(--admin-primary)]/10" : "text-[var(--admin-text)]"}`}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title="Upload Image"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleUpload(file);
            };
            input.click();
          }}
          className="h-8 w-8 text-[var(--admin-text)]"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title="Insert YouTube Video"
          onClick={() => {
            setYoutubeUrl("");
            setShowYouTube(true);
          }}
          className="h-8 w-8 text-[var(--admin-text)]"
        >
          <Video className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          title="Insert Table"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="h-8 w-8 text-[var(--admin-text)]"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-[var(--admin-border)] mx-1" />
        <Button type="button" size="icon" variant="ghost" title="Undo" onClick={() => editor.chain().focus().undo().run()} className="h-8 w-8 text-[var(--admin-text)]">
          <Undo className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" title="Redo" onClick={() => editor.chain().focus().redo().run()} className="h-8 w-8 text-[var(--admin-text)]">
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {showLink && (
        <div className="absolute z-20 top-12 left-0 flex items-center gap-2 p-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-lg">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="admin-input h-8 text-sm"
          />
          <Button size="sm" onClick={addLink} className="admin-btn-primary">
            Apply
          </Button>
        </div>
      )}

      {showYouTube && (
        <div className="absolute z-20 top-12 left-0 w-80 p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <Video className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--admin-text)]">Embed YouTube Video</p>
              <p className="text-xs text-[var(--admin-muted)]">Paste a YouTube URL or video ID</p>
            </div>
          </div>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addYouTube(); } }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="admin-input h-9 text-sm w-full"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={() => { setShowYouTube(false); setYoutubeUrl(""); }} className="text-[var(--admin-muted)]">
              Cancel
            </Button>
            <Button size="sm" onClick={addYouTube} disabled={!youtubeUrl.trim()} className="admin-btn-primary">
              <Video className="h-3.5 w-3.5 mr-1" />
              Embed
            </Button>
          </div>
        </div>
      )}

      <EditorContent editor={editor} />

      {showSlash && filteredCommands.length > 0 && (
        <div
          ref={slashMenuRef}
          className="absolute z-30 mt-1 w-56 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-card)] shadow-xl overflow-hidden"
        >
          {filteredCommands.map((cmd, idx) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => {
                if (editor) runCommand(cmd, editor);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)] ${idx === slashIndex ? "bg-[var(--admin-hover-bg)]" : ""}`}
            >
              {cmd.icon}
              {cmd.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  editor,
  command,
  icon,
  active,
  title,
}: {
  editor: import("@tiptap/core").Editor;
  command: string | (() => void);
  icon: React.ReactNode;
  active: string | Record<string, string>;
  title: string;
}) {
  const isActive = typeof active === "string" ? editor.isActive(active) : editor.isActive(active);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title={title}
      onClick={() => (typeof command === "string" ? (editor.chain().focus() as unknown as Record<string, () => { run: () => void }>)[command]().run() : command())}
      className={`h-8 w-8 ${isActive ? "text-[var(--admin-primary)] bg-[var(--admin-primary)]/10" : "text-[var(--admin-text)]"}`}
    >
      {icon}
    </Button>
  );
}

function safeJSON(value: string | undefined | null): object {
  if (!value) return { type: "doc", content: [{ type: "paragraph" }] };
  try {
    return JSON.parse(value);
  } catch {
    return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: value }] }] };
  }
}
