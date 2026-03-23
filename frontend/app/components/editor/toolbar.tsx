import { Editor } from "@tiptap/react";
import React from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  Superscript,
  Subscript,
  FileImage,
  Baseline,
  Asterisk,
  Feather,
  AlignLeft,
  Heading1,
  TextQuote,
  Signature,
  FileText,
  CalendarDays,
} from "lucide-react";
import { useEditorState } from "@tiptap/react";
import { Fb2ActionIcon } from "../ui/Fb2ActionIcon";
import { ImageDropdown } from "./ImageDropdown";

const COMMAND_NAMES = [
  "Title",
  "Epigraph",
  "TextAuthor",
  "Subtitle",
  "Poem",
  "Stanza",
  "Annotation",
  "Date",
] as const;

type Capabilities = {
  [K in (typeof COMMAND_NAMES)[number] as
    | `canInsert${K}`
    | `canRemove${K}`]: boolean;
};

type Fb2Commands = {
  [K in (typeof COMMAND_NAMES)[number] as
    | `insertFb2${K}`
    | `removeFb2${K}`]: () => any;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fb2: Fb2Commands; // Все 16 команд создадутся автоматически
  }
}

interface ToolbarProps {
  editor: Editor | null;
  onSelectImage: (type: "block" | "inline" | "section") => void;
  onAddFootnote: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  onSelectImage,
  onAddFootnote,
}) => {
  const editorCapabilities = useEditorState({
    editor: editor!,
    selector: (ctx): Capabilities => {
      const { editor: ed } = ctx;

      return Object.fromEntries(
        COMMAND_NAMES.flatMap((name) => [
          [`canInsert${name}`, ed?.can()[`insertFb2${name}`]?.() ?? false],
          [`canRemove${name}`, ed?.can()[`removeFb2${name}`]?.() ?? false],
        ]),
      ) as Capabilities;
    },
  });
  const handleImageSelect = (type: "block" | "inline" | "section") => {
    // Здесь вызываем ваш диалог выбора файла, передавая тип
    onSelectImage(type);
  };

  if (!editor) return null;

  const btnClass = (type: string, attrs?: Record<string, any>) => {
    const isActive = editor.isActive(type, attrs);
    return `p-1.5 px-3 rounded text-xs font-bold transition-colors ${
      isActive
        ? "bg-indigo-600 text-white shadow-inner"
        : "text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"
    }`;
  };

  const btnCustomClass =
    "p-1.5 px-3 rounded text-xs font-bold transition-all flex items-center justify-center border border-transparent bg-white text-gray-600 shadow-sm " +
    "hover:bg-gray-100 hover:border-gray-200 active:bg-gray-200 " +
    "disabled:opacity-40 disabled:bg-gray-50 disabled:text-gray-300 disabled:border-gray-100 disabled:cursor-not-allowed disabled:shadow-none disabled:pointer-events-none";
  const isInsideParagraph =
    editor.isActive("paragraph") || editor.isActive("fb2V");

  return (
    <div className="bg-white border-b p-2 flex justify-center items-center gap-1 shadow-sm sticky top-0 z-20">
      {/* Стандартные кнопки оформления текста */}
      <button
        type="button"
        title="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass("bold")}
      >
        <Bold size={20} />
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass("italic")}
      >
        <Italic size={20} />
      </button>
      <button
        type="button"
        title="Strike"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={btnClass("strike")}
      >
        <Strikethrough size={20} />
      </button>
      <button
        type="button"
        title="Superscript"
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        className={btnClass("superscript")}
      >
        <Superscript size={20} />
      </button>
      <button
        type="button"
        title="Subscript"
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        className={btnClass("subscript")}
      >
        <Subscript size={20} />
      </button>
      <button
        type="button"
        title="Blockquote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass("blockquote")}
      >
        <Quote size={20} />
      </button>
      <button
        type="button"
        title="Code"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={btnClass("code")}
      >
        <Code size={20} />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-2" />
      {/* Заголовок */}
      <button
        type="button"
        onClick={() =>
          editorCapabilities.canRemoveTitle
            ? editor.chain().focus().removeFb2Title().run()
            : editor.chain().focus().insertFb2Title().run()
        }
        disabled={
          !editorCapabilities.canRemoveTitle &&
          !editorCapabilities.canInsertTitle
        }
        className={btnCustomClass}
        title={
          editorCapabilities.canRemoveTitle
            ? "Удалить заголовок"
            : "Добавить заголовок"
        }
      >
        <Fb2ActionIcon
          icon={Heading1}
          mode={editorCapabilities.canRemoveTitle ? "remove" : "add"}
        />
      </button>

      {/* Добавить Эпиграф */}
      <button
        type="button"
        onClick={() => editor.chain().focus().insertFb2Epigraph().run()}
        disabled={!editorCapabilities.canInsertEpigraph}
        className={btnCustomClass}
        title="Добавить эпиграф"
      >
        <Fb2ActionIcon icon={TextQuote} mode="add" />
      </button>

      {/* Удалить Эпиграф */}
      <button
        type="button"
        onClick={() => editor.chain().focus().removeFb2Epigraph().run()}
        disabled={!editorCapabilities.canRemoveEpigraph}
        className={btnCustomClass}
        title="Удалить эпиграф"
      >
        <Fb2ActionIcon icon={TextQuote} mode="remove" />
      </button>

      {/* Аннотация */}
      <button
        type="button"
        onClick={() =>
          editorCapabilities.canRemoveAnnotation
            ? editor.chain().focus().removeFb2Annotation().run()
            : editor.chain().focus().insertFb2Annotation().run()
        }
        disabled={
          !editorCapabilities.canRemoveAnnotation &&
          !editorCapabilities.canInsertAnnotation
        }
        className={btnCustomClass}
        title={
          editorCapabilities.canRemoveAnnotation
            ? "Удалить аннотацию"
            : "Добавить аннотацию"
        }
      >
        <Fb2ActionIcon
          icon={FileText}
          mode={editorCapabilities.canRemoveAnnotation ? "remove" : "add"}
        />
      </button>

      {/* Добавить подпись автора */}
      <button
        type="button"
        onClick={() => editor.chain().focus().insertFb2TextAuthor().run()}
        disabled={!editorCapabilities.canInsertTextAuthor}
        className={btnCustomClass}
        title="Добавить подпись автора"
      >
        <Fb2ActionIcon icon={Signature} mode="add" />
      </button>

      {/* Удалить подпись автора */}
      <button
        type="button"
        onClick={() => editor.chain().focus().removeFb2TextAuthor().run()}
        disabled={!editorCapabilities.canRemoveTextAuthor}
        className={btnCustomClass}
        title="Удалить подпись автора"
      >
        <Fb2ActionIcon icon={Signature} mode="remove" />
      </button>

      {/* Подзаголовок */}
      <button
        type="button"
        onClick={() =>
          editorCapabilities.canRemoveSubtitle
            ? editor.chain().focus().removeFb2Subtitle().run()
            : editor.chain().focus().insertFb2Subtitle().run()
        }
        disabled={
          !editorCapabilities.canRemoveSubtitle &&
          !editorCapabilities.canInsertSubtitle
        }
        className={btnCustomClass}
        title={
          editorCapabilities.canRemoveSubtitle
            ? "Удалить подзаголовок"
            : "Добавить подзаголовок"
        }
      >
        <Fb2ActionIcon
          icon={Baseline}
          mode={editorCapabilities.canRemoveSubtitle ? "remove" : "add"}
        />
      </button>

      {/* Поэма */}
      <button
        type="button"
        onClick={() =>
          editorCapabilities.canRemovePoem
            ? editor.chain().focus().removeFb2Poem().run()
            : editor.chain().focus().insertFb2Poem().run()
        }
        disabled={
          !editorCapabilities.canRemovePoem && !editorCapabilities.canInsertPoem
        }
        className={btnCustomClass}
        title={
          editorCapabilities.canRemovePoem ? "Удалить поэму" : "Добавить поэму"
        }
      >
        <Fb2ActionIcon
          icon={Feather}
          mode={editorCapabilities.canRemovePoem ? "remove" : "add"}
        />
      </button>

      {/* Строфа */}
      <button
        type="button"
        onClick={() => editor.chain().focus().insertFb2Stanza().run()}
        disabled={!editorCapabilities.canInsertStanza}
        className={btnCustomClass}
        title="Добавить строфу"
      >
        <Fb2ActionIcon icon={AlignLeft} mode="add" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().removeFb2Stanza().run()}
        disabled={!editorCapabilities.canRemoveStanza}
        className={btnCustomClass}
        title="Удалить строфу"
      >
        <Fb2ActionIcon icon={AlignLeft} mode="remove" />
      </button>

      {/* Дата написания стихов */}
      <button
        type="button"
        onClick={() =>
          editorCapabilities.canRemoveDate
            ? editor.chain().focus().removeFb2Date().run()
            : editor.chain().focus().insertFb2Date().run()
        }
        disabled={
          !editorCapabilities.canRemoveDate && !editorCapabilities.canInsertDate
        }
        className={btnCustomClass}
        title={
          editorCapabilities.canRemoveDate
            ? "Удалить дату написания"
            : "Добавить дату написания"
        }
      >
        <Fb2ActionIcon
          icon={CalendarDays}
          mode={editorCapabilities.canRemoveDate ? "remove" : "add"}
        />
      </button>

      {/* Сноска */}
      <button
        type="button"
        title="Вставить сноску"
        onClick={onAddFootnote}
        disabled={!isInsideParagraph}
        className={btnCustomClass}
      >
        <Fb2ActionIcon icon={Asterisk} mode="add" />
      </button>

      <ImageDropdown onSelect={handleImageSelect} />
      {/*
      <button type='button' title='Вставить изображение'
        onClick={onSelectImage}
        className={btnClass('image')}
      ><FileImage size={20} />
      </button>
      */}
    </div>
  );
};
