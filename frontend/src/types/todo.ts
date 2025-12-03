/**
 * TypeScript type definitions for the Todo API
 *
 * These types match the backend API responses (camelCase format).
 * All timestamps are ISO 8601 strings.
 */

// ============================================================================
// API Response Types (matching backend serializers)
// ============================================================================

/**
 * Project model - top-level container for todo lists
 */
export interface Project {
  id: number;
  name: string;
  description: string;
  color: string; // Hex color code (e.g., "#3B82F6")
  itemCount: number; // Denormalized count of all items
  completedCount: number; // Denormalized count of completed items
  completionPercentage: number; // 0-100
  isArchived: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Project detail response - includes nested lists
 */
export interface ProjectDetail extends Project {
  lists: TodoListSummary[];
}

/**
 * TodoList summary - used in project detail view
 */
export interface TodoListSummary {
  id: number;
  name: string;
  description: string;
  viewMode: ViewMode;
  itemCount: number;
  completedCount: number;
  completionPercentage: number;
  displayOrder: number;
}

/**
 * TodoList model - container for todo items
 */
export interface TodoList {
  id: number;
  name: string;
  description: string;
  viewMode: ViewMode;
  projectId: number | null;
  projectName: string | null;
  itemCount: number;
  completedCount: number;
  completionPercentage: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * TodoList detail response - includes nested items (for list view) OR kanban lanes (for kanban view)
 */
export interface TodoListDetail extends TodoList {
  items: TodoItem[] | null; // Populated if viewMode is "list"
  kanbanLanes: KanbanLaneWithItems[] | null; // Populated if viewMode is "kanban"
}

/**
 * TodoItem model - individual task
 */
export interface TodoItem {
  id: number;
  title: string;
  description: string;
  status: TodoStatus;
  priority: number; // 0 (none) to 4 (highest)
  dueDate: string | null;
  isOverdue: boolean;
  completedAt: string | null;
  displayOrder: number;
  kanbanLaneId: number | null;
  kanbanLaneName: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * TodoItem detail response - includes parent list/project info
 */
export interface TodoItemDetail extends TodoItem {
  todoListId: number;
  todoListName: string;
  projectId: number | null;
  projectName: string | null;
}

/**
 * KanbanLane model - custom columns for kanban boards
 */
export interface KanbanLane {
  id: number;
  name: string;
  color: string; // Hex color code
  isDefault: boolean; // True for "Backlog" lane
  displayOrder: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * KanbanLane with nested items - used in list detail kanban view
 */
export interface KanbanLaneWithItems extends KanbanLane {
  items: TodoItem[];
}

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * View modes for todo lists
 */
export type ViewMode = 'list' | 'kanban';

/**
 * Todo item status
 */
export type TodoStatus = 'pending' | 'completed';

/**
 * Priority levels (0 = none, 4 = highest)
 */
export const PRIORITY_LEVELS = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  HIGHEST: 4,
} as const;

export type PriorityLevel = (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS];

/**
 * Priority labels for UI display
 */
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  [PRIORITY_LEVELS.NONE]: 'None',
  [PRIORITY_LEVELS.LOW]: 'Low',
  [PRIORITY_LEVELS.MEDIUM]: 'Medium',
  [PRIORITY_LEVELS.HIGH]: 'High',
  [PRIORITY_LEVELS.HIGHEST]: 'Highest',
};

/**
 * Priority colors for UI display
 */
export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  [PRIORITY_LEVELS.NONE]: '#6B7280', // gray-500
  [PRIORITY_LEVELS.LOW]: '#3B82F6', // blue-500
  [PRIORITY_LEVELS.MEDIUM]: '#F59E0B', // amber-500
  [PRIORITY_LEVELS.HIGH]: '#EF4444', // red-500
  [PRIORITY_LEVELS.HIGHEST]: '#DC2626', // red-600
};

/**
 * Default project colors
 */
export const PROJECT_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
] as const;

/**
 * Default kanban lane colors
 */
export const LANE_COLORS = [
  '#6B7280', // gray-500
  '#3B82F6', // blue-500
  '#F59E0B', // amber-500
  '#10B981', // green-500
  '#8B5CF6', // violet-500
  '#EF4444', // red-500
] as const;

// ============================================================================
// API Request Types (for mutations)
// ============================================================================

/**
 * Create project request
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  displayOrder?: number;
}

/**
 * Update project request
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  displayOrder?: number;
}

/**
 * Create todo list request
 */
export interface CreateTodoListRequest {
  name: string;
  description?: string;
  viewMode?: ViewMode;
  projectId?: number | null;
  displayOrder?: number;
}

/**
 * Update todo list request
 */
export interface UpdateTodoListRequest {
  name?: string;
  description?: string;
  viewMode?: ViewMode;
  projectId?: number | null;
  displayOrder?: number;
}

/**
 * Switch view mode request
 */
export interface SwitchViewModeRequest {
  viewMode: ViewMode;
}

/**
 * Create todo item request
 */
export interface CreateTodoItemRequest {
  title: string;
  description?: string;
  todoListId: number;
  priority?: number;
  dueDate?: string | null;
  displayOrder?: number;
  kanbanLaneId?: number | null;
}

/**
 * Update todo item request
 */
export interface UpdateTodoItemRequest {
  title?: string;
  description?: string;
  priority?: number;
  dueDate?: string | null;
  displayOrder?: number;
}

/**
 * Move item to kanban lane request
 */
export interface MoveLaneRequest {
  kanbanLaneId: number;
  displayOrder?: number;
}

/**
 * Bulk complete items request
 */
export interface BulkCompleteRequest {
  itemIds: number[];
}

/**
 * Bulk delete items request
 */
export interface BulkDeleteRequest {
  itemIds: number[];
}

/**
 * Reorder items request
 */
export interface ReorderItemsRequest {
  itemIds: number[];
}

/**
 * Create kanban lane request
 */
export interface CreateKanbanLaneRequest {
  todoListId: number;
  name: string;
  color?: string;
  displayOrder?: number;
}

/**
 * Update kanban lane request
 */
export interface UpdateKanbanLaneRequest {
  name?: string;
  color?: string;
  displayOrder?: number;
}

// ============================================================================
// Paginated Response Type
// ============================================================================

/**
 * Paginated response wrapper (cursor pagination)
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Projects list query parameters
 */
export interface ProjectsQueryParams {
  isArchived?: boolean;
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Todo lists query parameters
 */
export interface TodoListsQueryParams {
  viewMode?: ViewMode;
  project?: number;
  standalone?: boolean;
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Todo items query parameters
 */
export interface TodoItemsQueryParams {
  status?: TodoStatus;
  priority?: number;
  priorityGte?: number;
  priorityLte?: number;
  isOverdue?: boolean;
  todoList?: number;
  project?: number;
  kanbanLane?: number;
  recentlyCompleted?: boolean;
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Kanban lanes query parameters
 */
export interface KanbanLanesQueryParams {
  todoList?: number;
  isDefault?: boolean;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Filter state for list view
 */
export interface ListViewFilters {
  showCompleted: boolean;
  sortBy: 'displayOrder' | 'dueDate' | 'priority' | 'createdAt';
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
}

/**
 * Filter state for project dashboard
 */
export interface DashboardFilters {
  showArchived: boolean;
  searchQuery: string;
}

/**
 * Selected items for bulk operations
 */
export interface BulkSelection {
  mode: boolean; // Is bulk select mode active?
  itemIds: Set<number>;
}

/**
 * Drag-and-drop state
 */
export interface DragState {
  isDragging: boolean;
  draggedItemId: number | null;
  sourceIndex: number | null;
  sourceLaneId: number | null;
}

/**
 * Undo toast state
 */
export interface UndoState {
  visible: boolean;
  itemId: number;
  itemTitle: string;
  timeoutId: NodeJS.Timeout | null;
}

// ============================================================================
// Form Types (React Hook Form + Zod)
// ============================================================================

/**
 * Project form data
 */
export interface ProjectFormData {
  name: string;
  description: string;
  color: string;
}

/**
 * Todo list form data
 */
export interface TodoListFormData {
  name: string;
  description: string;
  viewMode: ViewMode;
  projectId: number | null;
}

/**
 * Todo item form data
 */
export interface TodoItemFormData {
  title: string;
  description: string;
  priority: PriorityLevel;
  dueDate: Date | null;
}

/**
 * Kanban lane form data
 */
export interface KanbanLaneFormData {
  name: string;
  color: string;
}

// ============================================================================
// Component Prop Types
// ============================================================================

/**
 * Props for ProjectCard component
 */
export interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
  onEdit?: (project: Project) => void;
  onArchive?: (projectId: number) => void;
  onDelete?: (projectId: number) => void;
}

/**
 * Props for TodoItem component
 */
export interface TodoItemProps {
  item: TodoItem;
  onToggle?: (itemId: number) => void;
  onEdit?: (item: TodoItem) => void;
  onDelete?: (itemId: number) => void;
  isSelected?: boolean;
  onSelect?: (itemId: number, selected: boolean) => void;
  viewMode?: 'list' | 'kanban';
}

/**
 * Props for KanbanLane component
 */
export interface KanbanLaneProps {
  lane: KanbanLaneWithItems;
  onEditLane?: (lane: KanbanLane) => void;
  onDeleteLane?: (laneId: number) => void;
  onAddItem?: (laneId: number) => void;
  onItemMove?: (itemId: number, targetLaneId: number, displayOrder: number) => void;
}

/**
 * Props for BulkActionBar component
 */
export interface BulkActionBarProps {
  selectedCount: number;
  onComplete?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error response structure
 */
export interface ApiError {
  error: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'message' in error &&
    typeof (error as ApiError).error === 'string' &&
    typeof (error as ApiError).message === 'string'
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  count: number;
  message: string;
}

/**
 * Sorting configuration
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  handler: () => void;
}
