'use client';

import Link from 'next/link';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';
import ThemeSelector from '@/components/design/theme-selector';
import { Button, Card, CardText, CardTitle, DataTable, FieldLabel, PageShell, Panel, TableCell, TableHeadCell, TableHeadRow, TableRow, TextAreaField, TextField, Toolbar } from '@/components/ui';
import { FeatureGrid, HeroSection, MetricStrip, WorkflowTimeline } from '@/components/shared/sections';
import { tokenGroups } from '@/lib/design/design-tokens';

const demoWorkflow = [
  { title: 'Discover', description: 'Visitor lands on integrated storefront and explores products.' },
  { title: 'Qualify', description: 'AI extracts need, score, urgency, and routes to deal pipeline.' },
  { title: 'Convert', description: 'Sales rep sends quote and closes opportunity with automation support.' },
];

const demoFeatures = [
  {
    eyebrow: 'Template',
    title: 'HeroSection',
    description: 'Reusable intro block with badge, message, CTA stack, and side panel support.',
    action: <Link href="/" className="ui-btn ui-btn-secondary ui-btn-md">Open Storefront</Link>,
  },
  {
    eyebrow: 'Template',
    title: 'MetricStrip',
    description: 'Unified KPI row for dashboards, analytics, observability, and campaign views.',
    action: <Link href="/admin/dashboard" className="ui-btn ui-btn-secondary ui-btn-md">Open Dashboard</Link>,
  },
  {
    eyebrow: 'Template',
    title: 'WorkflowTimeline',
    description: 'Step-by-step process visualization for setup, onboarding, and lifecycle flows.',
    action: <Link href="/admin/observability" className="ui-btn ui-btn-secondary ui-btn-md">Open Observability</Link>,
  },
  {
    eyebrow: 'Template',
    title: 'FeatureGrid',
    description: 'Consistent feature-card layout used on marketing and product surfaces.',
    action: <Link href="/admin/configuration" className="ui-btn ui-btn-secondary ui-btn-md">Open Configuration</Link>,
  },
];

export default function AdminDesignSystemPage() {
  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="Design System"
            subtitle="Central tokens, reusable section templates, and UI kit primitives for plug-and-play integration deployments."
            actions={
              <Toolbar>
                <Link href="/admin/dashboard" className="ui-btn ui-btn-secondary ui-btn-md">Dashboard</Link>
                <Link href="/" className="ui-btn ui-btn-secondary ui-btn-md">Storefront</Link>
              </Toolbar>
            }
          />

          <HeroSection
            badge="UI Kit"
            title="Composable templates for fast product assembly"
            subtitle="This page documents the foundation used by customer and admin modules so teams can extend the system while preserving consistency."
            actions={
              <>
                <Link href="/admin/configuration" className="ui-btn ui-btn-primary ui-btn-md">Open Configuration</Link>
                <Link href="/admin/observability" className="ui-btn ui-btn-secondary ui-btn-md">Open Observability</Link>
              </>
            }
            aside={
              <div className="dg-card dg-quick-card">
                <p className="dg-eyebrow">Scope</p>
                <h2 className="dg-title-md">System-Wide Design Contract</h2>
                <div className="dg-quick-list">
                  <p className="dg-quick-item">1. Token-first color and typography</p>
                  <p className="dg-quick-item">2. Reusable templates for sections</p>
                  <p className="dg-quick-item">3. Shared motion and interactions</p>
                </div>
              </div>
            }
          />
        </Panel>

        <Panel>
          <ThemeSelector />
        </Panel>

        <Panel>
          <MetricStrip
            items={[
              { label: 'Color Tokens', value: tokenGroups.colors.length, meta: 'Global palette definitions' },
              { label: 'Typography Tokens', value: tokenGroups.typography.length, meta: 'Font families and scale' },
              { label: 'Spacing Tokens', value: tokenGroups.spacing.length, meta: 'Layout and rhythm spacing' },
              { label: 'Motion Tokens', value: tokenGroups.motion.length, meta: 'Timing and easing primitives' },
              { label: 'Surface Tokens', value: tokenGroups.radius.length + tokenGroups.shadows.length + tokenGroups.borders.length, meta: 'Radius, shadows, and border system' },
              { label: 'Templates', value: 4, meta: 'Hero, metrics, timeline, feature grid' },
            ]}
          />
        </Panel>

      <section className="dg-admin-page">
        <div className="dg-two-col-grid">
          <article className="dg-card">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Color Tokens</h2>
              <span className="dg-badge">{tokenGroups.colors.length}</span>
            </div>
            <div className="dg-token-grid">
              {tokenGroups.colors.map((token) => (
                <div key={token.key} className="dg-token-card">
                  <div className="dg-token-swatch" style={{ background: token.value }} />
                  <p className="dg-list-title">{token.key}</p>
                  <p className="dg-list-meta">{token.cssVar}</p>
                  <p className="dg-list-meta">{token.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="dg-card">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Motion Tokens</h2>
              <span className="dg-badge">{tokenGroups.motion.length}</span>
            </div>
            <ul className="ui-list ui-list-density-compact">
              {tokenGroups.motion.map((token) => (
                <li key={token.key} className="ui-list-item">
                  <strong>{token.key}</strong>: {token.value}
                </li>
              ))}
            </ul>
            <pre className="dg-code-block mt-3">{`.dg-motion-fade-up\n.dg-motion-stagger\nTransitions are centralized in globals.css`}</pre>
          </article>
        </div>
      </section>

      <section className="dg-admin-page">
        <div className="dg-two-col-grid">
          <article className="dg-card">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Typography Tokens</h2>
              <span className="dg-badge">{tokenGroups.typography.length}</span>
            </div>
            <ul className="ui-list ui-list-density-compact">
              {tokenGroups.typography.map((token) => (
                <li key={token.key} className="ui-list-item">
                  <strong>{token.key}</strong>: <code>{token.value}</code>
                </li>
              ))}
            </ul>
          </article>

          <article className="dg-card">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Spacing Tokens</h2>
              <span className="dg-badge">{tokenGroups.spacing.length}</span>
            </div>
            <ul className="ui-list ui-list-density-compact">
              {tokenGroups.spacing.map((token) => (
                <li key={token.key} className="ui-list-item">
                  <strong>{token.key}</strong>: <code>{token.value}</code>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="dg-admin-page">
        <div className="dg-two-col-grid">
          <article className="dg-card">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Radius + Shadow Tokens</h2>
              <span className="dg-badge">{tokenGroups.radius.length + tokenGroups.shadows.length}</span>
            </div>
            <ul className="ui-list ui-list-density-compact">
              {tokenGroups.radius.map((token) => (
                <li key={token.key} className="ui-list-item">
                  <strong>{token.key}</strong>: <code>{token.value}</code>
                </li>
              ))}
              {tokenGroups.shadows.map((token) => (
                <li key={token.key} className="ui-list-item">
                  <strong>{token.key}</strong>: <code>{token.value}</code>
                </li>
              ))}
            </ul>
          </article>

          <article className="dg-card">
            <div className="dg-admin-head">
              <h2 className="dg-title-sm">Border + Layout Tokens</h2>
              <span className="dg-badge">{tokenGroups.borders.length + tokenGroups.layout.length}</span>
            </div>
            <ul className="ui-list ui-list-density-compact">
              {tokenGroups.borders.map((token) => (
                <li key={token.key} className="ui-list-item">
                  <strong>{token.key}</strong>: <code>{token.value}</code>
                </li>
              ))}
              {tokenGroups.layout.map((token) => (
                <li key={token.key} className="ui-list-item">
                  <strong>{token.key}</strong>: <code>{token.value}</code>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

        <Panel>
          <FeatureGrid items={demoFeatures} columns={2} />
        </Panel>

        <Panel>
          <article className="dg-card">
            <h2 className="dg-title-sm">Workflow Template Preview</h2>
            <WorkflowTimeline steps={demoWorkflow} />
          </article>
        </Panel>

        <Panel>
          <div className="dg-two-col-grid">
          <Card className="dg-motion-fade-up">
            <CardTitle>Buttons & Card Primitive</CardTitle>
            <CardText>Use `Button` and `Card` primitives when building integration-ready modules.</CardText>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </Card>

          <Card className="dg-motion-fade-up">
            <CardTitle>Field Primitive</CardTitle>
            <div className="mt-3 grid gap-3">
              <div>
                <FieldLabel htmlFor="demo-name">Name</FieldLabel>
                <TextField id="demo-name" placeholder="Acme Corp" />
              </div>
              <div>
                <FieldLabel htmlFor="demo-note">Notes</FieldLabel>
                <TextAreaField id="demo-note" rows={3} placeholder="Design system notes..." />
              </div>
            </div>
          </Card>
          </div>
        </Panel>

        <Panel>
          <article className="dg-card dg-motion-fade-up">
            <h2 className="dg-title-sm">Table Primitive</h2>
            <DataTable density="compact">
            <thead>
              <TableHeadRow>
                <TableHeadCell>Token</TableHeadCell>
                <TableHeadCell>Value</TableHeadCell>
                <TableHeadCell>Usage</TableHeadCell>
              </TableHeadRow>
            </thead>
            <tbody>
              <TableRow>
                <TableCell>--color-brand-500</TableCell>
                <TableCell>#1f6fff</TableCell>
                <TableCell>Primary actions and emphasis links</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>--radius-card</TableCell>
                <TableCell>1.1rem</TableCell>
                <TableCell>Cards, panels, and modal containers</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>--shadow-card</TableCell>
                <TableCell>18px/38px soft shadow</TableCell>
                <TableCell>Depth hierarchy on elevated surfaces</TableCell>
              </TableRow>
            </tbody>
            </DataTable>
          </article>
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
