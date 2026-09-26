import MDEditor from '@uiw/react-md-editor/nohighlight';
import rehypeSanitize from 'rehype-sanitize';
import { useTranslation } from 'react-i18next';

interface MarkdownViewProps {
  value: string;
}

/**
 * Read-only sheet, rendered like the editor's preview and sanitized the same way (sheets are user
 * content). Lazy-load it like `MarkdownEditor` to keep the main bundle small.
 */
export const MarkdownView = ({ value }: MarkdownViewProps) => {
  const { t } = useTranslation();
  if (!value.trim()) return <p className="text-body-secondary">{t('characterForm.emptySheet')}</p>;
  return (
    <div data-color-mode="dark" className="stm-markdown">
      <MDEditor.Markdown source={value} rehypePlugins={[[rehypeSanitize]]} />
    </div>
  );
};

export default MarkdownView;
