"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
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

function safeJSON(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return "";
  }
}

export function LessonContentView({ content }: { content: string }) {
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
    content: safeJSON(content),
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(safeJSON(content), false);
  }, [editor, content]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
