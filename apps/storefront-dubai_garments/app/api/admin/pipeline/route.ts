import { fastApiFetch } from '@/lib/integrations/fastapi-proxy';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
  'http://localhost:8000';

const STAGES: Array<{ stageKey: string; stageLabel: string }> = [
  { stageKey: 'new', stageLabel: 'New' },
  { stageKey: 'qualified', stageLabel: 'Qualified' },
  { stageKey: 'quoted', stageLabel: 'Quoted' },
  { stageKey: 'negotiation', stageLabel: 'Negotiation' },
  { stageKey: 'won', stageLabel: 'Won' },
  { stageKey: 'lost', stageLabel: 'Lost' },
];

async function getPipelineFromStorefrontDb() {
  const deals = await prisma.deals.findMany({
    include: {
      leads: {
        select: {
          contact_name: true,
          company_name: true,
          email: true,
          ai_product: true,
          requested_qty: true,
        },
      },
      customers: { select: { company_name: true } },
    },
    orderBy: { updated_at: 'desc' },
  });

  const byStage = new Map<string, typeof deals>();
  for (const stage of STAGES) byStage.set(stage.stageKey, []);
  for (const deal of deals) {
    const stage = String(deal.stage || 'new').toLowerCase();
    if (!byStage.has(stage)) byStage.set(stage, []);
    byStage.get(stage)!.push(deal);
  }

  return {
    stages: STAGES.map((stage) => {
      const items = (byStage.get(stage.stageKey) ?? []).map((item) => ({
        id: item.id,
        lead_id: item.lead_id,
        customer_id: item.customer_id,
        owner_user_id: item.owner_user_id,
        title: item.title,
        stage: item.stage,
        expected_value: Number(item.expected_value ?? 0),
        probability_pct: item.probability_pct ?? 0,
        expected_close_date: item.expected_close_date?.toISOString() ?? null,
        won_at: item.won_at?.toISOString() ?? null,
        lost_reason: item.lost_reason ?? null,
        notes: item.notes ?? null,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        lead_contact_name: item.leads?.contact_name ?? null,
        lead_company_name: item.leads?.company_name ?? null,
        lead_email: item.leads?.email ?? null,
        lead_product_name: item.leads?.ai_product ?? null,
        lead_quantity: item.leads?.requested_qty ?? null,
        customer_company_name: item.customers?.company_name ?? null,
      }));
      return {
        stageKey: stage.stageKey,
        stageLabel: stage.stageLabel,
        count: items.length,
        items,
      };
    }),
  };
}

export async function GET(request: Request) {
  try {
    const response = await fastApiFetch(request, `${FASTAPI_BASE_URL}/api/v1/pipeline`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok && response.status >= 500) {
      const fallbackPayload = await getPipelineFromStorefrontDb();
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: {
          'x-data-source': 'storefront-prisma-fallback',
          'x-upstream-status': String(response.status),
        },
      });
    }
    const payload = await response.json().catch(() => ({ stages: [] }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    try {
      const fallbackPayload = await getPipelineFromStorefrontDb();
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: {
          'x-data-source': 'storefront-prisma-fallback',
          'x-upstream-status': 'fetch_error',
        },
      });
    } catch (fallbackError) {
      const message = error instanceof Error ? error.message : 'Failed to connect to FastAPI backend.';
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Fallback DB query failed.';
      return NextResponse.json(
        {
          message: `Pipeline API upstream unavailable and fallback failed. Upstream: ${message}. Fallback: ${fallbackMessage}.`,
          fastApiBaseUrl: FASTAPI_BASE_URL,
        },
        { status: 503 }
      );
    }
  }
}
