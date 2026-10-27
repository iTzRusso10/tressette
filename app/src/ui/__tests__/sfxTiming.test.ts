import { describe, expect, it } from 'vitest';
import { DEAL_GAP, dealTimes, HIT, LAG, LAND, landAt, moveAt } from '../sfxTiming';

// Stessi valori di T e dur in state/table.ts e ui/motion.ts.
const CARD = 380;
const SHUFFLE = 560;
const DEAL_CARD = 52;
const FAST = 0.55;

describe('tempi dei suoni', () => {
  it('la carta suona quando atterra, non quando parte', () => {
    expect(landAt(CARD)).toBe(Math.round(LAG + CARD * LAND - HIT));
    expect(landAt(CARD)).toBeGreaterThan(200);
    expect(landAt(CARD)).toBeLessThan(CARD);
    // In partita veloce il volo è più corto e il suono arriva prima.
    expect(landAt(CARD * FAST)).toBeLessThan(landAt(CARD));
    // Al 62% del volo una carta con Easing.out(cubic) ha già fatto più del 90% della strada.
    expect(1 - (1 - LAND) ** 3).toBeGreaterThan(0.9);
  });

  it('un suono per ogni carta distribuita, a tempo con il volo', () => {
    const t = dealTimes(20, { startMs: SHUFFLE, stepMs: DEAL_CARD, flightMs: CARD });
    expect(t).toHaveLength(20);
    // La prima carta suona dopo la mescolata, quando atterra.
    expect(t[0]).toBe(landAt(CARD, SHUFFLE));
    // Le altre a un passo di distanza.
    for (let i = 1; i < t.length; i++) expect(t[i] - t[i - 1]).toBeCloseTo(DEAL_CARD, -1);
  });

  it('in partita veloce non si accavallano: al massimo uno ogni DEAL_GAP', () => {
    const t = dealTimes(40, { startMs: SHUFFLE * FAST, stepMs: DEAL_CARD * FAST, flightMs: CARD * FAST });
    expect(t.length).toBeGreaterThanOrEqual(19);
    expect(t.length).toBeLessThan(40);
    for (let i = 1; i < t.length; i++) expect(t[i] - t[i - 1]).toBeGreaterThanOrEqual(DEAL_GAP);
    // L'ultima carta suona quando atterra davvero (o al massimo un passo prima).
    const lastLanding = landAt(CARD * FAST, SHUFFLE * FAST + 39 * DEAL_CARD * FAST);
    expect(lastLanding - t.at(-1)!).toBeLessThan(DEAL_GAP);
  });

  it('distribuzione a metà mano (Scopa): parte subito, carte più distanziate', () => {
    const t = dealTimes(6, { startMs: 0, stepMs: DEAL_CARD * 1.4, flightMs: CARD });
    expect(t).toHaveLength(6);
    expect(t[0]).toBe(landAt(CARD));
  });

  it('i suoni dei movimenti partono con le carte', () => {
    expect(moveAt()).toBe(LAG);
    expect(moveAt(100)).toBe(LAG + 100);
    // Il ritardo del disegno resta sotto un'occhiata: meno di tre fotogrammi.
    expect(LAG).toBeLessThan(50);
  });

  it('nessuna carta, nessun suono', () => {
    expect(dealTimes(0, { startMs: 0, stepMs: DEAL_CARD, flightMs: CARD })).toEqual([]);
  });
});
