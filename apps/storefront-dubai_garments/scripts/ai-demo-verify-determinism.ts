import { verifyAiDemoDeterminism } from '../lib/ai-sales-agent/demo-seed-presets';

async function main() {
  const startedAt = Date.now();
  const result = await verifyAiDemoDeterminism();
  const tookMs = Date.now() - startedAt;

  console.log('AI demo determinism verification passed.');
  console.log(`namespace=${result.namespace}`);
  console.log(`fingerprint=${result.fingerprint}`);
  console.log(`counts=${JSON.stringify(result.counts)}`);
  console.log(`aggregates=${JSON.stringify(result.aggregates)}`);
  console.log(`duration_ms=${tookMs}`);
}

main()
  .catch((error) => {
    console.error('AI demo determinism verification failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../lib/prisma');
    await prisma.$disconnect();
  });
