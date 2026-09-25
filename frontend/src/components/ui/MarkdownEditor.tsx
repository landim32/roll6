import MDEditor from '@uiw/react-md-editor/nohighlight';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  height?: number;
}

/**
 * Markdown editor with toolbar and live preview, in the app's dark theme. The preview is
 * sanitized (no raw HTML/scripts), since sheets are user content.
 */
export const MarkdownEditor = ({ id, value, onChange, maxLength, height = 360 }: MarkdownEditorProps) => (
  <div data-color-mode="dark" className="stm-markdown">
    <MDEditor
      value={value}
      onChange={(next) => onChange(next ?? '')}
      height={height}
      preview="live"
      textareaProps={{ id, maxLength }}
      previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
    />
  </div>
);

export default MarkdownEditor;
