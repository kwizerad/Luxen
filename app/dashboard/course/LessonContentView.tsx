"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useMemo } from "react";
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
import { CustomYouTubePlayer } from "@/app/Admin/course-studio/components/custom-youtube-player";

const CustomYouTube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        renderHTML: (attrs: Record<string, unknown>) => {
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
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";

// Must match the custom extensions in rich-editor.tsx
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
            parseHTML: (el: HTMLElement) => el.style.fontSize || null,
            renderHTML: (attrs: Record<string, unknown>) =>
              typeof attrs.fontSize === "string" ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
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
            parseHTML: (el: HTMLElement) => el.style.fontFamily?.replace(/["']/g, "") || null,
            renderHTML: (attrs: Record<string, unknown>) =>
              typeof attrs.fontFamily === "string"
                ? { style: `font-family: ${attrs.fontFamily}` }
                : {},
          },
        },
      },
    ];
  },
});

export function safeContent(value: unknown): any {
  if (!value) return { type: "doc", content: [{ type: "paragraph" }] };
  if (typeof value === "object") return value;
  
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return { type: "doc", content: [{ type: "paragraph" }] };
    
    // Check if it's a JSON string
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch {
        // Not valid JSON, continue to fallback
      }
    }
    
    // If it has HTML tags (like <img, <p, <div, <h), return as HTML string so Tiptap parses it
    if (trimmed.includes("<") && trimmed.includes(">")) {
      return trimmed;
    }
    
    // Plain text fallback
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: trimmed }] }],
    };
  }

  return { type: "doc", content: [{ type: "paragraph" }] };
}

interface LessonContentViewProps {
  content: string | object;
  textSize?: "sm" | "base" | "lg" | "xl";
}

export function LessonContentView({ content, textSize = "base" }: LessonContentViewProps) {
  const fontSizeMap = {
    sm: "14px",
    base: "16px",
    lg: "19px",
    xl: "22px",
  };

  const scaleClasses = {
    sm: "text-sm [&_.ProseMirror]:text-sm [&_p]:text-sm [&_p]:leading-relaxed [&_li]:text-sm [&_td]:text-sm [&_th]:text-sm [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg",
    base: "text-base [&_.ProseMirror]:text-base [&_p]:text-base [&_p]:leading-relaxed [&_li]:text-base [&_td]:text-base [&_th]:text-base [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl",
    lg: "text-lg [&_.ProseMirror]:text-lg [&_p]:text-lg [&_p]:leading-relaxed [&_li]:text-lg [&_td]:text-lg [&_th]:text-lg [&_h1]:text-4xl [&_h2]:text-3xl [&_h3]:text-2xl",
    xl: "text-xl [&_.ProseMirror]:text-xl [&_p]:text-xl [&_p]:leading-relaxed [&_li]:text-xl [&_td]:text-xl [&_th]:text-xl [&_h1]:text-5xl [&_h2]:text-4xl [&_h3]:text-3xl",
  };

  const parsedContent = useMemo(() => safeContent(content), [content]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Superscript,
      Subscript,
      Link.configure({ openOnClick: true, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
      Image,
      ImageResize,
      CustomYouTube.configure({ width: 640, height: 360 }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      FontSize,
      FontFamily,
    ],
    content: parsedContent,
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-slate dark:prose-invert max-w-none outline-none transition-all duration-200 [&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_img]:shadow-sm",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    try {
      editor.commands.setContent(parsedContent, false);
    } catch (err) {
      console.warn("Failed to set parsed JSON content, trying string fallback:", err);
      if (typeof content === "string") {
        try {
          editor.commands.setContent(content, false);
        } catch {}
      }
    }
  }, [editor, parsedContent, content]);

  if (!editor) return null;

  return (
    <div
      className={`w-full transition-all duration-200 ${scaleClasses[textSize]}`}
      style={{ fontSize: fontSizeMap[textSize] }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
