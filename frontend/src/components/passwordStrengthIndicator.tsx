import { Check, X } from 'lucide-react';
import { calculatePasswordStrength, getRequirementLabel, type PasswordRequirements } from '@/lib/passwordStrength';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{strength.label}</p>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Requirements:</p>
        <ul className="space-y-1">
          {(Object.keys(strength.requirements) as Array<keyof PasswordRequirements>).map((requirement) => {
            const isMet = strength.requirements[requirement];
            return (
              <li key={requirement} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                {isMet ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-gray-400" />}
                <span className={isMet ? 'text-green-600 dark:text-green-400' : ''}>
                  {getRequirementLabel(requirement)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
