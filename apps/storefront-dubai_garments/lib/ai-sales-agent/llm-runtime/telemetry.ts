import { prisma } from '@/lib/prisma';
import type { AiFeatureRoutingKey } from '@/lib/ai-sales-agent/feature-routing';

type AiRuntimeTelemetryInput = {
  requestId: string;
  feature: AiFeatureRoutingKey;
  promptVersionHash: string;
  provider: string;
  model: string;
  latencyMs: number;
  schemaValid: boolean;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  source: 'model' | 'fallback';
  status: 'success' | 'failed';
  tokenUsage?: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  } | null;
};

export async function logAiRuntimeTelemetry(input: AiRuntimeTelemetryInput) {
  try {
    await prisma.$executeRaw`
      INSERT INTO ai_logs (
        source_service,
        workflow_name,
        provider,
        model,
        status,
        fallback_used,
        input_payload,
        output_payload,
        error_message,
        latency_ms
      ) VALUES (
        'storefront_ai_runtime',
        ${`ai_${input.feature}`},
        ${input.provider},
        ${input.model},
        ${input.status},
        ${input.fallbackUsed},
        ${JSON.stringify({
          requestId: input.requestId,
          feature: input.feature,
          promptVersionHash: input.promptVersionHash,
        })}::jsonb,
        ${JSON.stringify({
          source: input.source,
          schemaValid: input.schemaValid,
          tokenUsage: input.tokenUsage ?? null,
          fallbackReason: input.fallbackReason,
        })}::jsonb,
        ${input.status === 'failed' ? input.fallbackReason : null},
        ${Math.max(0, Math.round(input.latencyMs))}
      )
    `;
  } catch {
    // Telemetry must never break user-facing requests.
  }
}
