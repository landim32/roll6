import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MARK_KINDS, clamp, drawMarks, isMeaningful, strokeWidth } from '../../../lib/markup';
import type { Mark, MarkKind, MarkPoint } from '../../../lib/markup';
import { Modal } from '../../ui/Modal';

export interface MarkupResult {
  /** PNG data URL with the marks (the original when there are none). */
  marked: string;
  marks: Mark[];
}

interface PrintMarkupModalProps {
  /** The print to mark (data URL), or null when closed. */
  original: string | null;
  initialMarks: Mark[];
  onDone: (result: MarkupResult) => void;
  onCancel: () => void;
}

/**
 * "Marcar print" (086; the roll6anime `MarkupWindow` of 064): the print on a canvas of its own pixel size, four red
 * tools — pencil, dotted rectangle, dotted circle, arrow —, Desfazer (Ctrl+Z) and Limpar; Concluir (Enter) attaches,
 * Cancelar (Esc) drops the print. The marks are kept apart from the original, so reopening starts from the clean picture.
 */
export const PrintMarkupModal = ({ original, initialMarks, onDone, onCancel }: PrintMarkupModalProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<MarkKind>('arrow');
  const [marks, setMarks] = useState<Mark[]>(initialMarks);
  const [history, setHistory] = useState<Mark[][]>([]);
  const drawing = useRef<Mark | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setMarks(initialMarks);
    setHistory([]);
    image.current = null;
    setSize(null);
    if (!original) return;
    const img = new Image();
    img.onload = () => {
      image.current = img;
      setSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = original;
  }, [original, initialMarks]);

  const paint = useCallback((extra: Mark | null) => {
    const canvas = canvasRef.current;
    const img = image.current;
    if (!canvas || !img || !size) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, size.width, size.height);
    context.drawImage(img, 0, 0);
    drawMarks(context, extra ? [...marks, extra] : marks, strokeWidth(size.width, size.height));
  }, [marks, size]);

  useEffect(() => { paint(null); }, [paint]);

  const toPoint = (event: ReactPointerEvent<HTMLCanvasElement>): MarkPoint | null => {
    if (!size) return null;
    const box = event.currentTarget.getBoundingClientRect();
    return clamp({ x: ((event.clientX - box.left) / box.width) * size.width, y: ((event.clientY - box.top) / box.height) * size.height }, size.width, size.height);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = toPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = { kind: tool, points: tool === 'pencil' ? [point] : [point, point] };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const current = drawing.current;
    const point = toPoint(event);
    if (!current || !point) return;
    if (current.kind === 'pencil') current.points.push(point);
    else current.points[1] = point;
    paint(current);
  };

  const onPointerUp = () => {
    const current = drawing.current;
    drawing.current = null;
    if (!current) return;
    if (isMeaningful(current)) {
      setHistory((h) => [...h, marks]);
      setMarks((m) => [...m, current]);
    } else paint(null);
  };

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setMarks(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  const clear = () => {
    if (marks.length === 0) return;
    setHistory((h) => [...h, marks]);
    setMarks([]);
  };

  const done = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !original) return;
    paint(null);
    onDone({ marked: marks.length === 0 ? original : canvas.toDataURL('image/png'), marks });
  }, [marks, onDone, original, paint]);

  useEffect(() => {
    if (!original) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        done();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, original, undo]);

  return (
    <Modal open={original !== null} onOpenChange={(open) => { if (!open) onCancel(); }} title={t('editor.prints.markupTitle')} large
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>{t('editor.prints.cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={done}>{t('editor.prints.done')}</button>
        </>
      )}>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <div className="btn-group btn-group-sm" role="group" aria-label={t('editor.prints.tools')}>
          {MARK_KINDS.map((kind) => (
            <button key={kind} type="button" className={`btn ${tool === kind ? 'btn-primary' : 'btn-outline-secondary'}`}
              aria-pressed={tool === kind} onClick={() => setTool(kind)}>
              {t(`editor.prints.tool.${kind}`)}
            </button>
          ))}
        </div>
        <span className="flex-grow-1" />
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={undo} disabled={history.length === 0}>{t('editor.prints.undo')}</button>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clear} disabled={marks.length === 0}>{t('editor.prints.clear')}</button>
      </div>
      <div className="stm-markup-stage">
        {size && (
          <canvas ref={canvasRef} width={size.width} height={size.height} className="stm-markup-canvas"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
        )}
      </div>
      <small className="text-body-secondary">{t('editor.prints.markupHint')}</small>
    </Modal>
  );
};

export default PrintMarkupModal;
