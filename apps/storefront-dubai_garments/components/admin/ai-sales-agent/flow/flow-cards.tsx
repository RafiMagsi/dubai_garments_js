'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui';

type FlowCardProps = {
  children: ReactNode;
  className?: string;
};

export function FlowShellCard({ children, className }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}

export function FlowErrorCard({ children, className = 'aflow-error-card' }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}

export function FlowLoadingCard({ children, className = 'aflow-shell aflow-shell-embedded' }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}

export function FlowHeroCard({ children, className = 'aflow-hero-card dg-ai-intel-hero' }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}

export function FlowDecisionCard({ children, className = 'aflow-decision-card' }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}

export function FlowSignalsCard({ children, className = 'aflow-signals-card' }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}

export function FlowQualityCard({ children, className = 'aflow-quality-card' }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}

export function FlowBoardCard({ children, className = 'aflow-board-card' }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}

export function FlowTrackCard({ children, className = 'aflow-track-card' }: FlowCardProps) {
  return <Card className={className}>{children}</Card>;
}
