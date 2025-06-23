
import { worldClassClassification } from './worldClassRules';
import { ClassificationResult } from '../types';

interface BenchmarkResult {
  averageTime: number;
  totalTime: number;
  classificationsPerSecond: number;
  accuracyScore: number;
  confidenceDistribution: {
    high: number; // >= 90%
    medium: number; // 70-89%
    low: number; // < 70%
  };
}

/**
 * Performance benchmark for world-class classification engine
 */
export async function benchmarkClassificationEngine(testCases: string[]): Promise<BenchmarkResult> {
  console.log(`[BENCHMARK] Testing ${testCases.length} cases...`);
  
  const startTime = performance.now();
  const results: ClassificationResult[] = [];
  
  for (const testCase of testCases) {
    const caseStartTime = performance.now();
    const result = await worldClassClassification(testCase);
    const caseEndTime = performance.now();
    
    results.push({
      ...result,
      processingTime: caseEndTime - caseStartTime
    });
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const averageTime = totalTime / testCases.length;
  
  // Calculate confidence distribution
  const confidenceDistribution = {
    high: results.filter(r => r.confidence >= 90).length,
    medium: results.filter(r => r.confidence >= 70 && r.confidence < 90).length,
    low: results.filter(r => r.confidence < 70).length
  };
  
  // Calculate accuracy score (based on confidence levels)
  const accuracyScore = (
    (confidenceDistribution.high * 1.0) +
    (confidenceDistribution.medium * 0.8) +
    (confidenceDistribution.low * 0.6)
  ) / testCases.length;
  
  const benchmark: BenchmarkResult = {
    averageTime,
    totalTime,
    classificationsPerSecond: 1000 / averageTime,
    accuracyScore,
    confidenceDistribution: {
      high: (confidenceDistribution.high / testCases.length) * 100,
      medium: (confidenceDistribution.medium / testCases.length) * 100,
      low: (confidenceDistribution.low / testCases.length) * 100
    }
  };
  
  console.log(`[BENCHMARK] Results:`, benchmark);
  
  return benchmark;
}

/**
 * Sample test cases for benchmarking
 */
export const BENCHMARK_TEST_CASES = [
  // Clear business cases
  'Acme Corporation LLC',
  'Smith & Associates Consulting Services',
  'Advanced Manufacturing Technologies Inc',
  'Global Financial Solutions Group',
  'ABC Construction Company',
  
  // Clear individual cases
  'Dr. John Smith',
  'Mary Johnson',
  'Robert Miller Jr.',
  'Prof. Sarah Williams',
  'David Brown Sr.',
  
  // Challenging cases
  'Smith Consulting',
  'Johnson & Associates',
  'Williams Medical',
  'Brown Construction',
  'Davis Solutions',
  
  // Edge cases
  'A',
  'ACME',
  'John',
  'SMITH CONSTRUCTION',
  'mary jane doe',
  'ABC-123 CORP',
  "O'REILLY'S PUB",
  'José García Consulting',
  'Müller & Associates GmbH',
  '北京科技有限公司'
];

/**
 * Run a quick performance test
 */
export async function quickPerformanceTest(): Promise<void> {
  console.log('[QUICK-TEST] Running performance test...');
  
  const result = await benchmarkClassificationEngine(BENCHMARK_TEST_CASES);
  
  console.log('[QUICK-TEST] Performance Results:');
  console.log(`  Average time per classification: ${result.averageTime.toFixed(2)}ms`);
  console.log(`  Classifications per second: ${result.classificationsPerSecond.toFixed(0)}`);
  console.log(`  Accuracy score: ${(result.accuracyScore * 100).toFixed(1)}%`);
  console.log(`  High confidence: ${result.confidenceDistribution.high.toFixed(1)}%`);
  console.log(`  Medium confidence: ${result.confidenceDistribution.medium.toFixed(1)}%`);
  console.log(`  Low confidence: ${result.confidenceDistribution.low.toFixed(1)}%`);
}
