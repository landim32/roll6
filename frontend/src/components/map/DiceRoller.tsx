import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dice1Icon, Dice2Icon, Dice3Icon, Dice4Icon, Dice5Icon, Dice6Icon } from '../ui/icons';

/** The face of each value, in order: `FACES[value - 1]` draws that die. */
const FACES = [Dice1Icon, Dice2Icon, Dice3Icon, Dice4Icon, Dice5Icon, Dice6Icon];
/** Three dice of six faces. */
const DICE_COUNT = 3;
/** A spinning die changes face every these many milliseconds. */
const SHUFFLE_MS = 70;
/** The first die lands after this, then one more every `SETTLE_STEP_MS`, so they stop one by one. */
const SETTLE_MS = 420;
const SETTLE_STEP_MS = 260;
/** How long the result stays on screen once the pointer leaves it. */
const SHOW_MS = 30000;

const rollOne = () => 1 + Math.floor(Math.random() * FACES.length);
const rollAll = () => Array.from({ length: DICE_COUNT }, rollOne);
const totalOf = (dice: number[]) => dice.reduce((sum, value) => sum + value, 0);

/**
 * Three dice rolled on the player's own screen: no call, nothing stored, nothing sent to the other players.
 * The button sits with the map controls and the result opens to its left. While the roll runs every die keeps
 * changing face; each one lands on a different moment and the total only shows once all three have stopped.
 * <p>
 * The result is shown for 30 seconds and then hides by itself. Keeping the pointer over the area — the dice or
 * the button — holds it open, so once it has hidden the button is what brings the last roll back; leaving it
 * starts the 30 seconds again. Rolling again replaces the previous result and restarts the count.
 */
export const DiceRoller = () => {
  const { t } = useTranslation();
  /** null until the first roll, so nothing is shown before the player asks for one. */
  const [values, setValues] = useState<number[] | null>(null);
  const [rolling, setRolling] = useState(false);
  const [visible, setVisible] = useState(false);
  const spin = useRef<number | null>(null);
  const hide = useRef<number | null>(null);
  /** The pointer is over the dice or the button, so the result must not hide. */
  const held = useRef(false);

  const stopHiding = () => {
    if (hide.current !== null) {
      window.clearTimeout(hide.current);
      hide.current = null;
    }
  };

  // Neither timer may outlive the component: they would go on setting state after unmount.
  useEffect(() => () => {
    if (spin.current !== null) window.clearInterval(spin.current);
    stopHiding();
  }, []);

  const startHiding = () => {
    stopHiding();
    hide.current = window.setTimeout(() => {
      hide.current = null;
      setVisible(false);
    }, SHOW_MS);
  };

  // One handler on the wrapper covers both the dice and the button. Crossing the small gap between them fires a
  // leave and an enter, which only re-arms and clears the 30-second count: the result stays on screen.
  const onHold = () => {
    held.current = true;
    stopHiding();
    setVisible(true);
  };

  const onRelease = () => {
    held.current = false;
    // Nothing to keep showing before the first roll. startHiding() already clears any count running.
    if (values) startHiding();
  };

  const onRoll = () => {
    if (spin.current !== null) {
      window.clearInterval(spin.current);
      spin.current = null;
    }
    const finals = rollAll();
    const stopsAt = finals.map((_, index) => SETTLE_MS + index * SETTLE_STEP_MS);
    const lastStop = stopsAt[stopsAt.length - 1];
    const startedAt = Date.now();
    setValues(rollAll());
    setRolling(true);
    setVisible(true);
    // A click with the mouse leaves the pointer on the button, where the count must not run; a click with the
    // keyboard is not held, so the 30 seconds start now. startHiding() re-arms an already running count.
    if (!held.current) startHiding();
    spin.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      // Every die is decided from the time alone, so a missed tick never skews the result.
      setValues(stopsAt.map((stop, index) => (elapsed >= stop ? finals[index] : rollOne())));
      if (elapsed >= lastStop) {
        if (spin.current !== null) {
          window.clearInterval(spin.current);
          spin.current = null;
        }
        setValues(finals);
        setRolling(false);
      }
    }, SHUFFLE_MS);
  };

  return (
    <div className="stm-dice" onMouseEnter={onHold} onMouseLeave={onRelease}>
      {visible && values && (
        <div className={`stm-dice-panel${rolling ? ' is-rolling' : ''}`}>
          <div className="stm-dice-row">
            {values.map((value, index) => {
              const Face = FACES[value - 1];
              return (
                <span className="stm-die" key={index} style={{ animationDelay: `${index * 90}ms` }}>
                  <Face size={30} />
                </span>
              );
            })}
          </div>
          {/* Only a finished roll is shown: while the dice spin the total would be a meaningless sum. */}
          {!rolling && (
            <div className="stm-dice-total" role="status">
              <span>{t('map.diceTotal')}</span>
              <strong>{totalOf(values)}</strong>
            </div>
          )}
        </div>
      )}
      <button type="button" className="btn btn-secondary" title={t('map.dice')} aria-label={t('map.dice')}
        aria-busy={rolling} onClick={onRoll}><Dice5Icon size={20} /></button>
    </div>
  );
};

export default DiceRoller;
