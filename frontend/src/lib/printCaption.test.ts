import { describe, expect, it } from 'vitest';
import { SKELETON_NOTE, cameraSide, caption } from './printCaption';
import type { CaptionInput } from './printCaption';

const base: CaptionInput = {
  animationName: 'Aceno', time: 0.8, duration: 1.2, paused: true, azimuth: 32.4, elevation: 18, skeleton: false, pose: null, marks: [],
};

describe('print caption (086, from 062/064/065)', () => {
  it('tells the instant and the camera', () => {
    expect(caption(base)).toBe(
      'print da vista 3D do editor de animações do Roll6: a animação Aceno no instante 0,80 s de 1,20 s (pausada); '
      + 'câmera 32° da frente, para o lado esquerdo do personagem, 18° acima do meio do corpo.',
    );
  });

  it('says the camera from the point of view of the character', () => {
    expect(cameraSide(4, 2)).toBe('de frente para o personagem, na altura do meio do corpo');
    expect(cameraSide(-90, -12)).toBe('90° da frente, para o lado direito do personagem, 12° abaixo do meio do corpo');
    expect(cameraSide(178, 0)).toBe('atrás do personagem (vê as costas), na altura do meio do corpo');
  });

  it('without an animation it is the rest pose', () => {
    expect(caption({ ...base, animationName: null, time: null, duration: null, azimuth: 0, elevation: 0 }))
      .toMatch(/^print da vista 3D do editor de animações do Roll6: o modelo na pose de descanso, sem animação;/);
  });

  it('adds the skeleton note, the pose and the marks', () => {
    expect(caption({ ...base, skeleton: true })).toContain(SKELETON_NOTE);
    expect(caption({ ...base, pose: { from: 3, to: 3, count: 5 } })).toContain('(pausada), na pose 3 de 5 (as poses são os instantes com chave no arquivo); câmera');
    expect(caption({ ...base, pose: { from: 2, to: 3, count: 5 } })).toContain('entre as poses 2 e 3 (de 5)');
    expect(caption({ ...base, marks: [{ kind: 'arrow', points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] }] }))
      .toMatch(/Marcações em vermelho .*: 1 seta\.$/);
  });
});
