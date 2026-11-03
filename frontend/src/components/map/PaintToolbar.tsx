import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMapPaint } from '../../hooks/useMapPaint';
import {
  HEX_MARK, HEX_MARK_KEY, HEX_MARKS, MAX_MARK_TEXT, MAX_PAINT_WIDTH, MIN_PAINT_WIDTH, PAINT_TOOL,
} from '../../types/mapPaint';
import type { HexMarkKind, PaintTool } from '../../types/mapPaint';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  ArrowUpRightIcon, CircleIcon, EraserIcon, PaintBucketIcon, PencilIcon, SlashLgIcon, SquareIcon, TrashIcon,
} from '../ui/icons';
import type { IconProps } from '../ui/icons';

const TOOLS: readonly { tool: PaintTool; label: string; Icon: (props: IconProps) => JSX.Element }[] = [
  { tool: PAINT_TOOL.fill, label: 'paint.fill', Icon: PaintBucketIcon },
  { tool: PAINT_TOOL.rect, label: 'paint.rect', Icon: SquareIcon },
  { tool: PAINT_TOOL.circle, label: 'paint.circle', Icon: CircleIcon },
  { tool: PAINT_TOOL.pencil, label: 'paint.pencil', Icon: PencilIcon },
  { tool: PAINT_TOOL.line, label: 'paint.line', Icon: SlashLgIcon },
  { tool: PAINT_TOOL.arrow, label: 'paint.arrow', Icon: ArrowUpRightIcon },
  { tool: PAINT_TOOL.erase, label: 'paint.erase', Icon: EraserIcon },
];

/** Value of the "Nenhum" option (the fill erases marks). */
const NONE = 'none';

/**
 * The paint tools (107), opened to the left of "Pintar": Preencher, Quadrado, Circunferência, Lápis, Linha, Seta,
 * Apagar and Limpar (confirmed), with the options of the chosen tool — the fill kind (+ the Mark's text), or color,
 * width and opacity like the image editor's brush.
 */
export const PaintToolbar = () => {
  const { t } = useTranslation();
  const { settings, updateSettings, clearPaint, paint } = useMapPaint();
  const [confirmClear, setConfirmClear] = useState(false);
  const { tool } = settings;
  const drawingTool = tool !== PAINT_TOOL.fill && tool !== PAINT_TOOL.erase;
  const empty = !paint || (paint.marks.length === 0 && paint.drawings.length === 0);

  const onClear = async () => {
    try {
      await clearPaint();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  return (
    <div className="stm-paint-toolbar" role="toolbar" aria-label={t('paint.tools')}>
      <div className="stm-paint-tools">
        {TOOLS.map(({ tool: value, label, Icon }) => (
          <button key={value} type="button" className={`btn btn-sm ${tool === value ? 'btn-primary' : 'btn-outline-secondary'}`}
            title={t(label)} aria-label={t(label)} aria-pressed={tool === value} onClick={() => updateSettings({ tool: value })}>
            <Icon size={16} />
          </button>
        ))}
        <button type="button" className="btn btn-sm btn-outline-danger" title={t('paint.clear')} aria-label={t('paint.clear')}
          disabled={empty} onClick={() => setConfirmClear(true)}>
          <TrashIcon size={16} />
        </button>
      </div>

      {tool === PAINT_TOOL.fill && (
        <div className="stm-paint-options">
          <select className="form-select form-select-sm" aria-label={t('paint.fill')}
            value={settings.fillKind === null ? NONE : String(settings.fillKind)}
            onChange={(e) => updateSettings({ fillKind: e.target.value === NONE ? null : (Number(e.target.value) as HexMarkKind) })}>
            {HEX_MARKS.map((kind) => (
              <option key={kind} value={kind}>{t(`paint.kind.${HEX_MARK_KEY[kind]}`)}</option>
            ))}
            <option value={NONE}>{t('paint.kind.none')}</option>
          </select>
          {settings.fillKind === HEX_MARK.mark && (
            <input type="text" className="form-control form-control-sm" maxLength={MAX_MARK_TEXT}
              placeholder={t('paint.markText')} aria-label={t('paint.markText')} value={settings.markText}
              onChange={(e) => updateSettings({ markText: e.target.value })} />
          )}
        </div>
      )}

      {drawingTool && (
        <div className="stm-paint-options">
          <label className="stm-paint-color" title={t('paint.color')}>
            <span className="visually-hidden">{t('paint.color')}</span>
            <input type="color" value={settings.color} onChange={(e) => updateSettings({ color: e.target.value })} />
          </label>
          <label className="stm-paint-range">
            <span>{t('paint.width')}</span>
            <input type="range" className="form-range" min={MIN_PAINT_WIDTH} max={MAX_PAINT_WIDTH} value={settings.width}
              onChange={(e) => updateSettings({ width: Number(e.target.value) })} />
            <span className="stm-paint-value">{settings.width}</span>
          </label>
          <label className="stm-paint-range">
            <span>{t('paint.opacity')}</span>
            <input type="range" className="form-range" min={5} max={100} step={5} value={Math.round(settings.opacity * 100)}
              onChange={(e) => updateSettings({ opacity: Number(e.target.value) / 100 })} />
            <span className="stm-paint-value">{Math.round(settings.opacity * 100)}%</span>
          </label>
        </div>
      )}

      <ConfirmModal
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('paint.clear')}
        message={t('paint.clearConfirm')}
        confirmLabel={t('paint.clear')}
        onConfirm={onClear}
        danger
      />
    </div>
  );
};

export default PaintToolbar;
