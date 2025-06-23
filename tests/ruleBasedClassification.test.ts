import { describe, it, expect } from 'vitest';
import { applyRuleBasedClassification } from '../src/lib/classification/ruleBasedClassification.ts';

describe('applyRuleBasedClassification', () => {
  it('detects business by Spanish legal suffix', async () => {
    const result = await applyRuleBasedClassification('Compania de Software S.L.');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Business');
  });

  it('detects business by French legal suffix', async () => {
    const result = await applyRuleBasedClassification('Entreprise Exemple SARL');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Business');
  });

  it('detects business by non-English keyword', async () => {
    const result = await applyRuleBasedClassification('Rodriguez Soluciones');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Business');
  });

  it('detects individual name', async () => {
    const result = await applyRuleBasedClassification('Juan Perez');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Individual');
  });

  it('detects business without legal suffix using industry terms', async () => {
    const result = await applyRuleBasedClassification('NORTHWEST FIRE PROTECTION');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Business');
  });

  it('detects business by industry term even with minimal suffix', async () => {
    const result = await applyRuleBasedClassification('CITY ALARM CO');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Business');
  });
});

