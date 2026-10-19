import { markupNote } from './markup';
import type { Mark } from './markup';
import type { PoseInfo } from '../components/animations/editor/poses';

/**
 * The caption of a print of the 3D view (086; the roll6anime `ViewCapture.Caption` of 062/064/065): which animation,
 * which instant and key pose, from where the camera looks, whether the skeleton shows and what the red marks are — in
 * Portuguese, so the Claude knows what it is looking at.
 */

export interface CaptionInput {
  animationName: string | null;
  /** Seconds into the animation, null without one. */
  time: number | null;
  duration: number | null;
  paused: boolean;
  /** Around the character: 0° = in front, positive toward its left, ±180° behind. */
  azimuth: number;
  /** Above the middle of the model. */
  elevation: number;
  skeleton: boolean;
  pose: PoseInfo | null;
  marks: readonly Mark[];
  /** The weapons visible on the model (092), e.g. "Espada longa (mão direita)". */
  weapons?: readonly string[];
}

export const SKELETON_NOTE = ' Esqueleto visível: o modelo aparece semitransparente e as linhas são os ossos (âmbar = movimentados pela animação aberta, ciano = os demais).';

const seconds = (value: number): string => `${value.toFixed(2).replace('.', ',')} s`;

const degrees = (value: number): string => `${Math.abs(value)}°`;

/** "na pose 3 de 5" or "entre as poses 2 e 3 (de 5)". */
export const describePose = (pose: PoseInfo): string =>
  pose.from === pose.to ? `na pose ${pose.from} de ${pose.count}` : `entre as poses ${pose.from} e ${pose.to} (de ${pose.count})`;

/** Where the camera is, from the character's point of view. */
export const cameraSide = (azimuth: number, elevation: number): string => {
  const a = Math.round(azimuth);
  const side = Math.abs(a) <= 10
    ? 'de frente para o personagem'
    : Math.abs(a) >= 170
      ? 'atrás do personagem (vê as costas)'
      : `${degrees(a)} da frente, para o lado ${a > 0 ? 'esquerdo' : 'direito'} do personagem`;
  const e = Math.round(elevation);
  const height = Math.abs(e) <= 5 ? 'na altura do meio do corpo' : `${degrees(e)} ${e > 0 ? 'acima' : 'abaixo'} do meio do corpo`;
  return `${side}, ${height}`;
};

export const caption = (input: CaptionInput): string => {
  const what = input.animationName === null || input.time === null || input.duration === null
    ? 'o modelo na pose de descanso, sem animação'
    : `a animação ${input.animationName} no instante ${seconds(input.time)} de ${seconds(input.duration)}${input.paused ? ' (pausada)' : ' (tocando)'}`
      + (input.pose ? `, ${describePose(input.pose)} (as poses são os instantes com chave no arquivo)` : '');
  return `print da vista 3D do editor de animações do Roll6: ${what}; câmera ${cameraSide(input.azimuth, input.elevation)}.`
    + (input.skeleton ? SKELETON_NOTE : '')
    + (input.weapons && input.weapons.length > 0 ? ` O modelo carrega: ${input.weapons.join(', ')}.` : '')
    + markupNote(input.marks);
};
