import { describe, it, expect } from 'vitest';
import { applyRuleBasedClassification } from '../src/lib/classification/ruleBasedClassification.ts';

describe('applyRuleBasedClassification', () => {
  it('detects business by Spanish legal suffix', () => {
    const result = applyRuleBasedClassification('Compania de Software S.L.');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Business');
  });

  it('detects business by French legal suffix', () => {
    const result = applyRuleBasedClassification('Entreprise Exemple SARL');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Business');
  });

  it('detects business by non-English keyword', () => {
    const result = applyRuleBasedClassification('Rodriguez Soluciones');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Business');
  });

  it('detects individual name', () => {
    const result = applyRuleBasedClassification('Juan Perez');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('Individual');
  });
});
