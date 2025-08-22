import TodoDashboard from '@/components/todoDashboard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/todo')({
  component: TodoDashboard,
});
