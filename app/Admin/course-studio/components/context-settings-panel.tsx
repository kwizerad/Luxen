"use client";

import { type Editor } from "@tiptap/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Combine,
  Split,
  Table as TableIcon,
  Video,
  Image as ImageIcon,
} from "lucide-react";

interface ContextSettingsPanelProps {
  editor: Editor | null;
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
      {icon}
      {label}
    </div>
  );
}

function ToolButton({
  onClick,
  icon,
  label,
  destructive,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={`w-full justify-start h-8 px-2 text-xs gap-2 ${
        destructive
          ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
          : "text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
      }`}
    >
      {icon}
      {label}
    </Button>
  );
}

function SizeField({
  label,
  value,
  onChange,
  min = 50,
  max = 2000,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (val: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--admin-muted)] w-2">{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value ? Math.min(max, Math.max(min, Number(e.target.value))) : null;
          onChange(v);
        }}
        placeholder={placeholder}
        className="admin-input h-7 text-xs w-full"
      />
      <span className="text-[10px] text-[var(--admin-muted)]">px</span>
    </div>
  );
}

export function ContextSettingsPanel({ editor }: ContextSettingsPanelProps) {
  if (!editor) return null;

  const isTable = editor.isActive("table");
  const isYouTube = editor.isActive("youtube");
  const isImage = editor.isActive("image");

  if (!isTable && !isYouTube && !isImage) {
    return null;
  }

  return (
    <div className="space-y-4 border-b border-[var(--admin-border)] pb-4 mb-4">
      {/* YouTube Video Settings */}
      {isYouTube && (
        <div className="space-y-3">
          <SectionTitle icon={<Video className="h-3.5 w-3.5" />} label="Video Settings" />

          <div className="space-y-1">
            <p className="px-1 text-[10px] text-[var(--admin-muted)]">Alignment</p>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Align Left"
                onClick={() => editor.chain().focus().updateAttributes("youtube", { textAlign: "left" }).run()}
                className={`h-8 w-8 ${editor.getAttributes("youtube").textAlign === "left" ? "text-[var(--admin-primary)] bg-[var(--admin-primary)]/10" : "text-[var(--admin-text)]"}`}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Align Center"
                onClick={() => editor.chain().focus().updateAttributes("youtube", { textAlign: "center" }).run()}
                className={`h-8 w-8 ${editor.getAttributes("youtube").textAlign === "center" ? "text-[var(--admin-primary)] bg-[var(--admin-primary)]/10" : "text-[var(--admin-text)]"}`}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Align Right"
                onClick={() => editor.chain().focus().updateAttributes("youtube", { textAlign: "right" }).run()}
                className={`h-8 w-8 ${editor.getAttributes("youtube").textAlign === "right" ? "text-[var(--admin-primary)] bg-[var(--admin-primary)]/10" : "text-[var(--admin-text)]"}`}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="px-1 text-[10px] text-[var(--admin-muted)]">Dimensions</p>
            <SizeField
              label="W"
              value={editor.getAttributes("youtube").width}
              onChange={(val) => editor.chain().focus().updateAttributes("youtube", { width: val ?? 640 }).run()}
              min={200}
              max={1200}
              placeholder="640"
            />
            <SizeField
              label="H"
              value={editor.getAttributes("youtube").height}
              onChange={(val) => editor.chain().focus().updateAttributes("youtube", { height: val }).run()}
              min={100}
              max={1200}
              placeholder="auto"
            />
          </div>

          <ToolButton
            onClick={() => editor.chain().focus().deleteNode("youtube").run()}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Delete Video"
            destructive
          />
        </div>
      )}

      {/* Image Settings */}
      {isImage && (
        <div className="space-y-3">
          <SectionTitle icon={<ImageIcon className="h-3.5 w-3.5" />} label="Image Settings" />

          <div className="space-y-1">
            <p className="px-1 text-[10px] text-[var(--admin-muted)]">Alignment</p>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Align Left"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
                className="h-8 w-8 text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Align Center"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
                className="h-8 w-8 text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Align Right"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
                className="h-8 w-8 text-[var(--admin-text)] hover:bg-[var(--admin-hover-bg)]"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="px-1 text-[10px] text-[var(--admin-muted)]">Dimensions</p>
            <SizeField
              label="W"
              value={editor.getAttributes("image").width}
              onChange={(val) => editor.chain().focus().updateAttributes("image", { width: val }).run()}
              min={50}
              max={2000}
              placeholder="auto"
            />
            <SizeField
              label="H"
              value={editor.getAttributes("image").height}
              onChange={(val) => editor.chain().focus().updateAttributes("image", { height: val }).run()}
              min={50}
              max={2000}
              placeholder="auto"
            />
          </div>

          <ToolButton
            onClick={() => {
              const attrs = editor.getAttributes("image");
              const url = window.prompt("Replace image URL", attrs.src);
              if (url) editor.chain().focus().updateAttributes("image", { src: url }).run();
            }}
            icon={<ImageIcon className="h-3.5 w-3.5" />}
            label="Replace Image"
          />

          <ToolButton
            onClick={() => editor.chain().focus().deleteNode("image").run()}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Delete Image"
            destructive
          />
        </div>
      )}

      {/* Table Settings */}
      {isTable && (
        <div className="space-y-3">
          <SectionTitle icon={<TableIcon className="h-3.5 w-3.5" />} label="Table Settings" />

          <div className="space-y-1">
            <p className="px-1 text-[10px] text-[var(--admin-muted)]">Rows</p>
            <ToolButton
              onClick={() => editor.chain().focus().addRowBefore().run()}
              icon={<ArrowUp className="h-3.5 w-3.5" />}
              label="Add Row Above"
            />
            <ToolButton
              onClick={() => editor.chain().focus().addRowAfter().run()}
              icon={<ArrowDown className="h-3.5 w-3.5" />}
              label="Add Row Below"
            />
            <ToolButton
              onClick={() => editor.chain().focus().deleteRow().run()}
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete Row"
              destructive
            />
          </div>

          <div className="space-y-1">
            <p className="px-1 text-[10px] text-[var(--admin-muted)]">Columns</p>
            <ToolButton
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              icon={<ArrowLeft className="h-3.5 w-3.5" />}
              label="Add Column Before"
            />
            <ToolButton
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              icon={<ArrowRight className="h-3.5 w-3.5" />}
              label="Add Column After"
            />
            <ToolButton
              onClick={() => editor.chain().focus().deleteColumn().run()}
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete Column"
              destructive
            />
          </div>

          <div className="space-y-1">
            <p className="px-1 text-[10px] text-[var(--admin-muted)]">Cells</p>
            <ToolButton
              onClick={() => editor.chain().focus().mergeCells().run()}
              icon={<Combine className="h-3.5 w-3.5" />}
              label="Merge Cells"
            />
            <ToolButton
              onClick={() => editor.chain().focus().splitCell().run()}
              icon={<Split className="h-3.5 w-3.5" />}
              label="Split Cell"
            />
            <ToolButton
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              icon={<TableIcon className="h-3.5 w-3.5" />}
              label="Toggle Header Row"
            />
          </div>

          <ToolButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Delete Table"
            destructive
          />
        </div>
      )}
    </div>
  );
}
