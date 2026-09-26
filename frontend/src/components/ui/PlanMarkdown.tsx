import MDEditor from '@uiw/react-md-editor/nohighlight';
import { planMarkdownOptions } from './planMarkdownOptions';

interface PlanMarkdownProps {
  value: string;
  /** File name → current URL of the images referenced by the text. */
  imageUrls: Record<string, string>;
}

/** Read-only plan markdown (018), sanitized, with its images resolved. Lazy-load it like `MarkdownEditor`. */
export const PlanMarkdown = ({ value, imageUrls }: PlanMarkdownProps) => (
  <div data-color-mode="dark" className="stm-markdown stm-plan-markdown">
    <MDEditor.Markdown source={value} {...planMarkdownOptions(imageUrls)} />
  </div>
);

export default PlanMarkdown;
