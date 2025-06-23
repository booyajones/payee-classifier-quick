#!/usr/bin/env ts-node
import { enhancedClassifyPayeeV3 } from '../src/lib/classification';

async function main() {
  const names = process.argv.slice(2);
  if (names.length === 0) {
    console.error('Usage: npm run classify -- <payee name> [additional names...]');
    process.exit(1);
  }

  for (const name of names) {
    const result = await enhancedClassifyPayeeV3(name);
    console.log(`${name}: ${result.classification} (${result.confidence}%)`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
