"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontSize from "tiptap-extension-font-size";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32"];
const COLORS = [
  "#000000", "#374151", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff",
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요",
  minHeight = "160px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontSize,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[inherit] prose prose-sm max-w-none dark:prose-invert",
      },
    },
  });

  // 외부에서 value가 빈 문자열로 바뀌면 (폼 초기화) 에디터도 초기화
  useEffect(() => {
    if (!value && editor && !editor.isDestroyed) {
      editor.commands.setContent("");
    }
  }, [value, editor]);

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition font-medium ${
      active
        ? "bg-blue-600 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
    }`;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive("bold"))}
          title="볼드"
        >
          <strong>B</strong>
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive("italic"))}
          title="기울이기"
        >
          <em>I</em>
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive("underline"))}
          title="밑줄"
        >
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Strike */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btnClass(editor.isActive("strike"))}
          title="취소선"
        >
          <span style={{ textDecoration: "line-through" }}>S</span>
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Font Size */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontSize(e.target.value + "px").run();
            } else {
              editor.chain().focus().unsetFontSize().run();
            }
          }}
          className="text-xs px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          title="폰트 크기"
          defaultValue=""
        >
          <option value="">크기</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Color */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">색</span>
          <div className="flex gap-0.5">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-500 hover:scale-125 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          {/* 커스텀 색상 */}
          <input
            type="color"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
            title="커스텀 색상"
          />
        </div>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive("bulletList"))}
          title="목록"
        >
          ≡
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive("orderedList"))}
          title="번호 목록"
        >
          1.
        </button>
      </div>

      {/* 에디터 본문 */}
      <div
        style={{ minHeight }}
        className="px-4 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 cursor-text"
        onClick={() => editor.commands.focus()}
      >
        {editor.isEmpty && (
          <p className="text-gray-400 dark:text-gray-500 text-sm pointer-events-none absolute">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
