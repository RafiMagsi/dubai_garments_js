import { seedAiHeavyDemoPreset } from '../lib/ai-sales-agent/demo-seed-presets';

async function main() {
  const startedAt = Date.now();
  const result = await seedAiHeavyDemoPreset();
  const tookMs = Date.now() - startedAt;

  console.log('AI-heavy demo preset seed complete.');
  console.log(`namespace=${result.namespace}`);
  console.log(`version=${result.version}`);
  console.log(`scenarios=${result.scenarios}`);
  console.log(`fingerprint=${result.fingerprint}`);
  console.log(`duration_ms=${tookMs}`);
}

main()
  .catch((error) => {
    console.error('Failed to seed AI-heavy demo preset.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import('../lib/prisma');
    await prisma.$disconnect();
  });
