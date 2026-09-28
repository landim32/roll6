import MDEditor from '@uiw/react-md-editor/nohighlight';
import rehypeSanitize from 'rehype-sanitize';
import type { ChangeEvent, SyntheticEvent } from 'react';
import { planMarkdownOptions } from './planMarkdownOptions';

interface MarkdownEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  height?: number;
  /**
   * Plan images (018): with it, the preview resolves `roll6-image:` references to these URLs (the text keeps the
   * references) and raw HTML is skipped.
   */
  imageUrls?: Record<string, string>;
  /** Cursor position of the textarea, to insert content where the user is typing. */
  onCursorChange?: (position: number) => void;
  placeholder?: string;
  /** Mode the editor opens in (the toolbar still switches it): 'live' = text + preview, 'preview' = rendered only. */
  initialMode?: 'live' | 'edit' | 'preview';
}

/**
 * Markdown editor with toolbar and live preview, in the app's dark theme. The preview is
 * sanitized (no raw HTML/scripts), since sheets are user content.
 */
export const MarkdownEditor = ({ id, value, onChange, maxLength, height = 360, imageUrls, onCursorChange, placeholder, initialMode = 'live' }: MarkdownEditorProps) => {
  const trackCursor = onCursorChange
    ? (event: SyntheticEvent<HTMLTextAreaElement>) => onCursorChange(event.currentTarget.selectionStart ?? 0)
    : undefined;
  return (
    <div data-color-mode="dark" className="stm-markdown">
      <MDEditor
        value={value}
        onChange={(next, event?: ChangeEvent<HTMLTextAreaElement>) => {
          onChange(next ?? '');
          if (event && onCursorChange) onCursorChange(event.target.selectionStart ?? 0);
        }}
        height={height}
        preview={initialMode}
        textareaProps={{ id, maxLength, placeholder, onSelect: trackCursor, onClick: trackCursor, onKeyUp: trackCursor }}
        previewOptions={imageUrls ? planMarkdownOptions(imageUrls) : { rehypePlugins: [[rehypeSanitize]] }}
      />
    </div>
  );
};

export default MarkdownEditor;
