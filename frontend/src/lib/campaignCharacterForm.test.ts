import { describe, expect, it } from 'vitest';
import {
  MAX_CAMPAIGN_SHEET, MAX_CHARACTER_STATUS, PARTICIPATION_MODE, participationMode, toCampaignUpdate, validateCampaignArea,
} from './campaignCharacterForm';

describe('participationMode', () => {
  it.each([
    [false, true, PARTICIPATION_MODE.owner],
    [true, true, PARTICIPATION_MODE.owner],
    [true, false, PARTICIPATION_MODE.master],
    [false, false, PARTICIPATION_MODE.viewer],
  ])('master=%s owner=%s → %s', (isMaster, isOwner, mode) => {
    expect(participationMode(isMaster, isOwner)).toBe(mode);
  });
});

describe('validateCampaignArea', () => {
  it('accepts the limits', () => {
    expect(validateCampaignArea({ characterStatus: 'x'.repeat(MAX_CHARACTER_STATUS), sheet: 'x'.repeat(MAX_CAMPAIGN_SHEET) })).toBeNull();
  });

  it('measures the status after trimming', () => {
    expect(validateCampaignArea({ characterStatus: ` ${'x'.repeat(MAX_CHARACTER_STATUS)} `, sheet: '' })).toBeNull();
  });

  it.each([
    [{ characterStatus: 'x'.repeat(MAX_CHARACTER_STATUS + 1), sheet: '' }, 'characterStatusTooLong'],
    [{ characterStatus: '', sheet: 'x'.repeat(MAX_CAMPAIGN_SHEET + 1) }, 'campaignSheetTooLong'],
  ])('rejects %#', (values, error) => {
    expect(validateCampaignArea(values)).toBe(error);
  });
});

describe('toCampaignUpdate', () => {
  it('converts numbers, trims the status and turns blank texts into null', () => {
    expect(toCampaignUpdate({ currentLife: '-2', currentEnergy: '6', characterStatus: '   ', sheet: ' \n ' })).toEqual({
      currentLife: -2, currentEnergy: 6, characterStatus: null, sheet: null,
    });
  });

  it('keeps the sheet as typed', () => {
    const result = toCampaignUpdate({ currentLife: '1', currentEnergy: '1', characterStatus: ' envenenado ', sheet: 'Força 3\n' });
    expect(result.characterStatus).toBe('envenenado');
    expect(result.sheet).toBe('Força 3\n');
  });
});
