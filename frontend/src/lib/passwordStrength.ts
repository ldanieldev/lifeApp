import zxcvbn from 'zxcvbn';

export interface PasswordRequirements {
  minLength: boolean;
  hasSpecialChar: boolean;
  hasNumber: boolean;
  notCommon: boolean;
}

export interface PasswordStrength {
  score: number; // 0-100
  label: 'Weak' | 'Medium' | 'Strong';
  color: string; // Tailwind color class
  requirements: PasswordRequirements;
}

/**
 * Calculate password strength using zxcvbn and custom requirements
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Weak',
      color: 'bg-red-500',
      requirements: {
        minLength: false,
        hasSpecialChar: false,
        hasNumber: false,
        notCommon: false,
      },
    };
  }

  // Use zxcvbn for sophisticated strength calculation
  const result = zxcvbn(password);

  // Map zxcvbn score (0-4) to percentage (0-100)
  const score = (result.score / 4) * 100;

  // Check individual requirements
  const requirements = checkRequirements(password, result);

  // Determine label and color based on score
  let label: 'Weak' | 'Medium' | 'Strong';
  let color: string;

  if (score <= 40) {
    label = 'Weak';
    color = 'bg-red-500';
  } else if (score <= 70) {
    label = 'Medium';
    color = 'bg-yellow-500';
  } else {
    label = 'Strong';
    color = 'bg-green-500';
  }

  return {
    score,
    label,
    color,
    requirements,
  };
}

/**
 * Check individual password requirements
 */
function checkRequirements(password: string, zxcvbnResult: zxcvbn.ZXCVBNResult): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasNumber: /[0-9]/.test(password),
    // Consider password not common if zxcvbn score is at least 2
    notCommon: zxcvbnResult.score >= 2,
  };
}

/**
 * Get a human-readable description of a requirement
 */
export function getRequirementLabel(requirement: keyof PasswordRequirements): string {
  const labels: Record<keyof PasswordRequirements, string> = {
    minLength: 'At least 8 characters',
    hasSpecialChar: 'Contains special character',
    hasNumber: 'Contains number',
    notCommon: 'Not a common password',
  };

  return labels[requirement];
}
