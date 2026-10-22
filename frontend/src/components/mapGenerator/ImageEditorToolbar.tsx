import { useTranslation } from 'react-i18next';
import {
  ArrowClockwiseIcon, BrushIcon, CheckIcon, CopyIcon, CropIcon, EyedropperIcon, FullscreenIcon, MinusIcon, MoveIcon, PlusIcon,
  Rotate90LeftIcon, Rotate90RightIcon, SymmetryHorizontalIcon, SymmetryVerticalIcon, UndoIcon,
} from '../ui/icons';
import { MAX_SIZE, MIN_SIZE } from '../../lib/imageEdit';

export type EditorTool = 'brush' | 'clone' | 'crop' | 'rotate' | 'pan';

export interface ToolbarProps {
  tool: EditorTool;
  onTool: (tool: EditorTool) => void;
  color: string;
  onColor: (color: string) => void;
  picking: boolean;
  onPicking: (picking: boolean) => void;
  size: number;
  onSize: (size: number) => void;
  opacity: number;
  onOpacity: (opacity: number) => void;
  originMode: boolean;
  onOriginMode: (on: boolean) => void;
  hasOrigin: boolean;
  ratioLocked: boolean;
  onRatioLocked: (locked: boolean) => void;
  onCropConfirm: () => void;
  onCropReset: () => void;
  onRotate: (dir: 'cw' | 'ccw') => void;
  onFlip: (axis: 'h' | 'v') => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoom: (factor: number) => void;
  onFit: () => void;
}

/** The image editor's tools and their options (100); icon buttons carry title + aria-label. */
export const ImageEditorToolbar = (props: ToolbarProps) => {
  const { t } = useTranslation();
  const toolButton = (tool: EditorTool, label: string, icon: JSX.Element) => (
    <button type="button" className={`btn btn-sm ${props.tool === tool ? 'btn-primary' : 'btn-outline-secondary'}`}
      title={label} aria-label={label} aria-pressed={props.tool === tool} onClick={() => props.onTool(tool)}>
      {icon}
    </button>
  );
  const iconButton = (label: string, icon: JSX.Element, onClick: () => void, disabled = false) => (
    <button type="button" className="btn btn-sm btn-outline-secondary" title={label} aria-label={label} onClick={onClick} disabled={disabled}>
      {icon}
    </button>
  );
  const painting = props.tool === 'brush' || props.tool === 'clone';

  return (
    <div className="stm-image-editor-toolbar" role="toolbar" aria-label={t('mapGenerator.editor.tools')}>
      <div className="btn-group">
        {toolButton('brush', t('mapGenerator.editor.brush'), <BrushIcon size={16} />)}
        {toolButton('clone', t('mapGenerator.editor.clone'), <CopyIcon size={16} />)}
        {toolButton('crop', t('mapGenerator.editor.crop'), <CropIcon size={16} />)}
        {toolButton('rotate', t('mapGenerator.editor.rotate'), <Rotate90RightIcon size={16} />)}
        {toolButton('pan', t('mapGenerator.editor.pan'), <MoveIcon size={16} />)}
      </div>

      {props.tool === 'brush' && (
        <div className="stm-image-editor-options">
          <label className="stm-image-editor-color" title={t('mapGenerator.editor.color')}>
            <span className="visually-hidden">{t('mapGenerator.editor.color')}</span>
            <input type="color" value={props.color} onChange={(e) => props.onColor(e.target.value)} />
          </label>
          <button type="button" className={`btn btn-sm ${props.picking ? 'btn-primary' : 'btn-outline-secondary'}`}
            title={t('mapGenerator.editor.eyedropper')} aria-label={t('mapGenerator.editor.eyedropper')} aria-pressed={props.picking}
            onClick={() => props.onPicking(!props.picking)}>
            <EyedropperIcon size={16} />
          </button>
        </div>
      )}
      {props.tool === 'clone' && (
        <div className="stm-image-editor-options">
          <button type="button" className={`btn btn-sm ${props.originMode ? 'btn-primary' : 'btn-outline-secondary'}`}
            aria-pressed={props.originMode} title={t('mapGenerator.editor.originHint')} onClick={() => props.onOriginMode(!props.originMode)}>
            {t('mapGenerator.editor.origin')}{props.hasOrigin && <CheckIcon size={14} className="ms-1" />}
          </button>
        </div>
      )}
      {painting && (
        <div className="stm-image-editor-options">
          <label className="stm-image-editor-range">
            <span>{t('mapGenerator.editor.size')}</span>
            <input type="range" className="form-range" min={MIN_SIZE} max={MAX_SIZE} value={props.size}
              onChange={(e) => props.onSize(Number(e.target.value))} />
            <span className="stm-image-editor-value">{props.size}</span>
          </label>
          <label className="stm-image-editor-range">
            <span>{t('mapGenerator.editor.opacity')}</span>
            <input type="range" className="form-range" min={5} max={100} step={5} value={Math.round(props.opacity * 100)}
              onChange={(e) => props.onOpacity(Number(e.target.value) / 100)} />
            <span className="stm-image-editor-value">{Math.round(props.opacity * 100)}%</span>
          </label>
        </div>
      )}
      {props.tool === 'crop' && (
        <div className="stm-image-editor-options">
          <div className="form-check form-switch m-0">
            <input id="crop-ratio" className="form-check-input" type="checkbox" checked={props.ratioLocked}
              onChange={(e) => props.onRatioLocked(e.target.checked)} />
            <label className="form-check-label small" htmlFor="crop-ratio">{t('mapGenerator.editor.ratioLock')}</label>
          </div>
          <button type="button" className="btn btn-sm btn-primary" onClick={props.onCropConfirm}>{t('mapGenerator.editor.cropConfirm')}</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={props.onCropReset}>{t('mapGenerator.editor.cropReset')}</button>
        </div>
      )}
      {props.tool === 'rotate' && (
        <div className="stm-image-editor-options btn-group">
          {iconButton(t('mapGenerator.editor.rotateLeft'), <Rotate90LeftIcon size={16} />, () => props.onRotate('ccw'))}
          {iconButton(t('mapGenerator.editor.rotateRight'), <Rotate90RightIcon size={16} />, () => props.onRotate('cw'))}
          {iconButton(t('mapGenerator.editor.flipH'), <SymmetryVerticalIcon size={16} />, () => props.onFlip('h'))}
          {iconButton(t('mapGenerator.editor.flipV'), <SymmetryHorizontalIcon size={16} />, () => props.onFlip('v'))}
        </div>
      )}

      <div className="stm-image-editor-options ms-auto btn-group">
        {iconButton(t('mapGenerator.editor.zoomOut'), <MinusIcon size={16} />, () => props.onZoom(1 / 1.25))}
        {iconButton(t('mapGenerator.editor.fit'), <FullscreenIcon size={16} />, props.onFit)}
        {iconButton(t('mapGenerator.editor.zoomIn'), <PlusIcon size={16} />, () => props.onZoom(1.25))}
      </div>
      <div className="btn-group">
        {iconButton(t('mapGenerator.editor.undo'), <UndoIcon size={16} />, props.onUndo, !props.canUndo)}
        {iconButton(t('mapGenerator.editor.redo'), <ArrowClockwiseIcon size={16} />, props.onRedo, !props.canRedo)}
      </div>
    </div>
  );
};

export default ImageEditorToolbar;
