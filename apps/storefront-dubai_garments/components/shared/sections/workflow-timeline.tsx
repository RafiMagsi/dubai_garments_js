export type WorkflowStep = {
  title: string;
  description: string;
};

type WorkflowTimelineProps = {
  steps: WorkflowStep[];
  className?: string;
};

export function WorkflowTimeline({ steps, className = '' }: WorkflowTimelineProps) {
  return (
    <div className={`dg-workflow-timeline ${className}`.trim()}>
      {steps.map((step, index) => (
        <article key={`${step.title}-${index}`} className="dg-card dg-workflow-step dg-motion-fade-up">
          <p className="dg-eyebrow">Step {index + 1}</p>
          <h3 className="dg-title-sm">{step.title}</h3>
          <p className="dg-muted-sm">{step.description}</p>
        </article>
      ))}
    </div>
  );
}
