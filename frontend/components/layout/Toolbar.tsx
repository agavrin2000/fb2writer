import { cn } from "@/utils/cn";
import { Editor } from "@tiptap/react";
import React, { memo } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  Superscript,
  Subscript,
  Baseline,
  Asterisk,
  Feather,
  AlignLeft,
  Heading1,
  TextQuote,
  Signature,
  FileText,
  CalendarDays,
  Link,
} from "lucide-react";
import { useEditorState } from "@tiptap/react";
import { Fb2ActionIcon } from "../ui/Fb2ActionIcon";
import { ImageDropdown } from "./ImageDropdown";
import { NodeSelection } from "@tiptap/pm/state";
import { ImageDisplayType, COMMAND_NAMES, Fb2Commands } from "../../types/types";

interface ToolbarProps {
  editor: Editor | null;
  onSelectImage: (type: ImageDisplayType) => void;
  onAddFootnote: () => void;
  onAddLink: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = memo(
  ({ editor, onSelectImage, onAddFootnote, onAddLink }) => {
    // 1. Собираем ВСЕ состояния редактора в одном месте
    const {
      activeStates = {} as Record<string, boolean>,
      disabledStates = {
        isMarkDisabled: false,
        isCiteDisabled: false,
        isInsideParagraph: false,
        isSelectionEmpty: false,
      },
      capabilities = {},
    } = useEditorState({
      editor: editor!,
      selector: (ctx) => {
        const { editor: ed } = ctx;
        if (!ed)
          return {
            activeStates: {} as Record<string, boolean>,
            disabledStates: {
              isMarkDisabled: false,
              isCiteDisabled: false,
              isInsideParagraph: false,
              isSelectionEmpty: false,
            },
            capabilities: {},
          };

        const { selection } = ed.state;
        const isNodeSel = selection instanceof NodeSelection;
        const parentName = selection.$from.parent.type.name;
        const nodeName = isNodeSel ? selection.node.type.name : parentName;

        // Проверки активности
        const active = {
          Fb2Placeholder: ed.isActive("fb2Placeholder"),
          paragraph: ed.isActive("paragraph"),
          fb2Date: ed.isActive("fb2Date"),
          fb2V: ed.isActive("fb2V"),
          fb2TextAuthor: ed.isActive("fb2TextAuthor"),
          fb2Subtitle: ed.isActive("fb2Subtitle"),
          fb2Title: ed.isActive("fb2Title"),
          fb2Section: nodeName === "fb2Section",
          fb2Poem: nodeName === "fb2Poem",
          bold: ed.isActive("bold"),
          italic: ed.isActive("italic"),
        };

        // Логика блокировки кнопок
        const isMarkDisabled =
          active.Fb2Placeholder ||
          active.fb2Date ||
          active.fb2Section ||
          active.fb2Poem;

        const isCiteDisabled =
          active.fb2Title ||
          active.Fb2Placeholder ||
          active.fb2V ||
          active.fb2TextAuthor ||
          active.fb2Date ||
          active.fb2Subtitle ||
          active.fb2Section ||
          active.fb2Poem;
        const isInsideParagraph =
          active.paragraph ||
          active.fb2V ||
          active.fb2TextAuthor ||
          active.fb2Subtitle;
        const isSelectionEmpty =
          (selection.empty ?? true) || !isInsideParagraph;

        // Динамические возможности (ваши кастомные команды)
        const caps = Object.fromEntries(
          COMMAND_NAMES.flatMap((name) => {
            const insertCommand =
              `insertFb2${name}` as keyof Fb2Commands<boolean>;
            const removeCommand =
              `removeFb2${name}` as keyof Fb2Commands<boolean>;

            return [
              // Используем (undefined as any), чтобы удовлетворить сигнатуру вызова
              [
                `canInsert${name}`,
                (ed.can() as unknown as Record<keyof Fb2Commands<boolean>, () => boolean>)[insertCommand]?.() ?? false,
              ],
              [
                `canRemove${name}`,
                (ed.can() as unknown as Record<keyof Fb2Commands<boolean>, () => boolean>)[removeCommand]?.() ?? false,
              ],
            ];
          }),
        );

        return {
          activeStates: active as Record<string, boolean>,
          disabledStates: {
            isMarkDisabled,
            isCiteDisabled,
            isInsideParagraph,
            isSelectionEmpty,
          },
          capabilities: caps,
        };
      },
    });
    if (!editor) return null;

    // Инициируем выбор изображения
    const handleImageSelect = (type: "block" | "inline" | "section") => {
      onSelectImage(type);
    };

    const {
      isMarkDisabled,
      isCiteDisabled,
      isInsideParagraph,
      isSelectionEmpty,
    } = disabledStates;

    const getBtnClass = (type: string) => {
      return cn("toolbar-btn", activeStates[type] ? "toolbar-btn-active" : "toolbar-btn-default");
    };

    // Для кастомных кнопок (которые всегда выглядят одинаково)
    const btnCustomClass = cn("toolbar-btn", "toolbar-btn-default");

    return (
      <div className="border-b shadow-sm sticky top-0 z-20 flex flex-col items-center">
        {/* ПЕРВЫЙ РЯД: Базовое форматирование и ссылки */}
        <div className="w-full flex justify-center items-center gap-1 p-1 ">
          <button
            type="button"
            title="Bold"
            disabled={isMarkDisabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={getBtnClass("bold")}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Bold size={18} />
          </button>
          <button
            type="button"
            disabled={isMarkDisabled}
            title="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={getBtnClass("italic")}
          >
            <Italic size={18} />
          </button>
          <button
            type="button"
            disabled={isMarkDisabled}
            title="Strike"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={getBtnClass("strike")}
          >
            <Strikethrough size={18} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button
            type="button"
            disabled={isMarkDisabled}
            title="Superscript"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={getBtnClass("superscript")}
          >
            <Superscript size={18} />
          </button>
          <button
            type="button"
            disabled={isMarkDisabled}
            title="Subscript"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={getBtnClass("subscript")}
          >
            <Subscript size={18} />
          </button>

          <button
            type="button"
            disabled={isMarkDisabled}
            title="Код"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={getBtnClass("code")}
          >
            <Code size={18} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Цитата и Код */}
          <button
            type="button"
            title="Цитата"
            disabled={isCiteDisabled}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            // Проверяем активность именно по имени узла fb2Cite
            className={getBtnClass("fb2Cite")}
          >
            <Quote size={20} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Ссылка и Сноска (Inlines) */}
          <button
            type="button"
            title="Вставить ссылку"
            onClick={onAddLink}
            className={`${btnCustomClass} ${isSelectionEmpty ? "opacity-50 pointer-events-auto" : ""}`}
          >
            <Fb2ActionIcon icon={Link} mode="add" />
          </button>
          <button
            type="button"
            title="Вставить сноску"
            onClick={onAddFootnote}
            disabled={!isInsideParagraph}
            className={btnCustomClass}
          >
            <Fb2ActionIcon icon={Asterisk} mode="add" />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <ImageDropdown
            onSelect={handleImageSelect}
            canBlockImage={capabilities?.canInsertBlockImage}
            canInlineImage={capabilities?.canInsertInlineImage}
            canSectionImage={capabilities?.canInsertSectionImage}
          />
        </div>

        {/* ВТОРОЙ РЯД: Структурные элементы FB2 (Секции, Эпиграфы, Поэмы) */}
        <div className="w-full flex justify-center items-center gap-1 p-1">
          {/* Группа: Заголовок и Подзаголовок */}
          <button
            type="button"
            onClick={() =>
              capabilities?.canRemoveTitle
                ? editor.chain().focus().removeFb2Title().run()
                : editor.chain().focus().insertFb2Title().run()
            }
            className={`${btnCustomClass} ${!capabilities?.canRemoveTitle && !capabilities?.canInsertTitle ? "opacity-50 pointer-events-auto" : ""}`}
            title={
              capabilities?.canRemoveTitle
                ? "Удалить заголовок"
                : "Добавить заголовок"
            }
          >
            <Fb2ActionIcon
              icon={Heading1}
              mode={capabilities?.canRemoveTitle ? "remove" : "add"}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              capabilities?.canRemoveSubtitle
                ? editor.chain().focus().removeFb2Subtitle().run()
                : editor.chain().focus().insertFb2Subtitle().run()
            }
            className={`${btnCustomClass} ${!capabilities?.canRemoveSubtitle && !capabilities?.canInsertSubtitle ? "opacity-50 pointer-events-auto" : ""}`}
            title={
              capabilities?.canRemoveSubtitle
                ? "Удалить подзаголовок"
                : "Добавить подзаголовок"
            }
          >
            <Fb2ActionIcon
              icon={Baseline}
              mode={capabilities?.canRemoveSubtitle ? "remove" : "add"}
            />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Группа: Эпиграф и Аннотация */}
          <button
            type="button"
            onClick={() => editor.chain().focus().insertFb2Epigraph().run()}
            className={`${btnCustomClass} ${!capabilities?.canInsertEpigraph ? "opacity-50 pointer-events-auto" : ""}`}
            title="Добавить эпиграф"
          >
            <Fb2ActionIcon icon={TextQuote} mode="add" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().removeFb2Epigraph().run()}
            className={`${btnCustomClass} ${!capabilities?.canRemoveEpigraph ? "opacity-50 pointer-events-auto" : ""}`}
            title="Удалить эпиграф"
          >
            <Fb2ActionIcon icon={TextQuote} mode="remove" />
          </button>

          {/* Группа: Автор и Дата */}
          <button
            type="button"
            onClick={() => editor.chain().focus().insertFb2TextAuthor().run()}
            className={`${btnCustomClass} ${!capabilities?.canInsertTextAuthor ? "opacity-50 pointer-events-auto" : ""}`}
            title="Добавить подпись автора"
          >
            <Fb2ActionIcon icon={Signature} mode="add" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().removeFb2TextAuthor().run()}
            className={`${btnCustomClass} ${!capabilities?.canRemoveTextAuthor ? "opacity-50 pointer-events-auto" : ""}`}
            title="Удалить подпись автора"
          >
            <Fb2ActionIcon icon={Signature} mode="remove" />
          </button>

          <button
            type="button"
            onClick={() =>
              capabilities?.canRemoveDate
                ? editor.chain().focus().removeFb2Date().run()
                : editor.chain().focus().insertFb2Date().run()
            }
            className={`${btnCustomClass} ${!capabilities?.canRemoveDate && !capabilities?.canInsertDate ? "opacity-50 pointer-events-auto" : ""}`}
            title={
              capabilities?.canRemoveDate
                ? "Удалить дату написания"
                : "Добавить дату написания"
            }
          >
            <Fb2ActionIcon
              icon={CalendarDays}
              mode={capabilities?.canRemoveDate ? "remove" : "add"}
            />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />

          {/* Группа: Поэзия */}
          <button
            type="button"
            onClick={() => editor.chain().focus().insertFb2Poem().run()}
            className={`${btnCustomClass} ${!capabilities?.canInsertPoem ? "opacity-50 pointer-events-auto" : ""}`}
            title="Добавить поэму"
          >
            <Fb2ActionIcon icon={Feather} mode="add" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().insertFb2Stanza().run()}
            className={`${btnCustomClass} ${!capabilities?.canInsertStanza ? "opacity-50 pointer-events-auto" : ""}`}
            title="Добавить строфу"
          >
            <Fb2ActionIcon icon={AlignLeft} mode="add" />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button
            type="button"
            onClick={() =>
              capabilities?.canRemoveAnnotation
                ? editor.chain().focus().removeFb2Annotation().run()
                : editor.chain().focus().insertFb2Annotation().run()
            }
            className={`${btnCustomClass} ${!capabilities?.canRemoveAnnotation && !capabilities?.canInsertAnnotation ? "opacity-50 pointer-events-auto" : ""}`}
            title={
              capabilities?.canRemoveAnnotation
                ? "Удалить аннотацию"
                : "Добавить аннотацию"
            }
          >
            <Fb2ActionIcon
              icon={FileText}
              mode={capabilities?.canRemoveAnnotation ? "remove" : "add"}
            />
          </button>
        </div>
      </div>
    );
  },
);

Toolbar.displayName = "ToolBar";
