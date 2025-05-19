
import { getConfidenceLevel } from "@/lib/classificationEngine";

interface ClassificationBadgeProps {
  confidence: number;
  showValue?: boolean;
}

const ClassificationBadge = ({ confidence, showValue = true }: ClassificationBadgeProps) => {
  const level = getConfidenceLevel(confidence);

  return (
    <span className={`confidence-badge-${level}`}>
      {showValue ? `${confidence}%` : level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
};

export default ClassificationBadge;
