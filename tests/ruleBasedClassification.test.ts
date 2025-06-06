import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRuleBasedClassification } from '../src/lib/classification/ruleBasedClassification.ts';

test('detects business by Spanish legal suffix', () => {
  const result = applyRuleBasedClassification('Compania de Software S.L.');
  assert.ok(result, 'classification result should not be null');
  assert.equal(result!.classification, 'Business');
});

test('detects business by French legal suffix', () => {
  const result = applyRuleBasedClassification('Entreprise Exemple SARL');
  assert.ok(result, 'classification result should not be null');
  assert.equal(result!.classification, 'Business');
});

test('detects business by non-English keyword', () => {
  const result = applyRuleBasedClassification('Rodriguez Soluciones');
  assert.ok(result, 'classification result should not be null');
  assert.equal(result!.classification, 'Business');
});

test('detects individual name', () => {
  const result = applyRuleBasedClassification('Juan Perez');
  assert.ok(result, 'classification result should not be null');
  assert.equal(result!.classification, 'Individual');
});
