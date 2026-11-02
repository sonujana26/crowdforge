import type { ContributionRejection } from '@crowdforge/shared';

export function ContributionFeedback({ feedback }: { feedback: ContributionRejection | null }) {
  if (!feedback) return null;
  return (
    <div className="contribution-feedback" role="status" key={feedback.eventId}>
      {feedback.source === 'demo' && <strong>DEMO · </strong>}
      {feedback.message}
    </div>
  );
}
