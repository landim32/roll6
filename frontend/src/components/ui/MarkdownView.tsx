import MDEditor from '@uiw/react-md-editor/nohighlight';
import rehypeSanitize from 'rehype-sanitize';
import { useTranslation } from 'react-i18next';
import { strictMarkdownOptions } from './strictMarkdownOptions';

interface MarkdownViewProps {
  value: string;
  /** Shown when the text is blank (default: "Ficha vazia."). */
  emptyText?: string;
  /** 093: model output — no links, images or raw HTML. */
  strict?: boolean;
}

/**
 * Read-only sheet, rendered like the editor's preview and sanitized the same way (sheets are user
 * content). Lazy-load it like `MarkdownEditor` to keep the main bundle small.
 */
export const MarkdownView = ({ value, emptyText, strict }: MarkdownViewProps) => {
  const { t } = useTranslation();
  if (!value.trim()) return <p className="text-body-secondary">{emptyText ?? t('characterForm.emptySheet')}</p>;
  return (
    <div data-color-mode="dark" className="stm-markdown">
      {strict
        ? <MDEditor.Markdown source={value} {...strictMarkdownOptions} />
        : <MDEditor.Markdown source={value} rehypePlugins={[[rehypeSanitize]]} />}
    </div>
  );
};

export default MarkdownView;
