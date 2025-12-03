/**
 * Todo API Client
 *
 * Axios-based API client for the todos backend.
 * All requests use JWT authentication (configured in axios interceptor).
 */

import { lifeAppApi } from '@/lib/axios';
import type {
  BulkCompleteRequest,
  BulkDeleteRequest,
  BulkOperationResult,
  CreateKanbanLaneRequest,
  CreateProjectRequest,
  CreateTodoItemRequest,
  CreateTodoListRequest,
  KanbanLane,
  KanbanLanesQueryParams,
  KanbanLaneWithItems,
  MoveLaneRequest,
  PaginatedResponse,
  Project,
  ProjectDetail,
  ProjectsQueryParams,
  ReorderItemsRequest,
  SwitchViewModeRequest,
  TodoItem,
  TodoItemDetail,
  TodoItemsQueryParams,
  TodoList,
  TodoListDetail,
  TodoListsQueryParams,
  UpdateKanbanLaneRequest,
  UpdateProjectRequest,
  UpdateTodoItemRequest,
  UpdateTodoListRequest,
} from '@/types/todo';

// ============================================================================
// Projects API
// ============================================================================

/**
 * List all projects with optional filtering
 */
export async function getProjects(params?: ProjectsQueryParams): Promise<PaginatedResponse<Project>> {
  // Convert camelCase params to snake_case for Django API
  const apiParams = params
    ? {
        is_archived: params.isArchived,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<Project>>('/todos/projects/', { params: apiParams });
  return response.data;
}

/**
 * Get single project with nested lists
 */
export async function getProject(id: number): Promise<ProjectDetail> {
  const response = await lifeAppApi.get<ProjectDetail>(`/todos/projects/${id}/`);
  return response.data;
}

/**
 * Create new project
 */
export async function createProject(data: CreateProjectRequest): Promise<ProjectDetail> {
  const response = await lifeAppApi.post<ProjectDetail>('/todos/projects/', data);
  return response.data;
}

/**
 * Update existing project (partial update)
 */
export async function updateProject(id: number, data: UpdateProjectRequest): Promise<ProjectDetail> {
  const response = await lifeAppApi.patch<ProjectDetail>(`/todos/projects/${id}/`, data);
  return response.data;
}

/**
 * Delete project (soft delete)
 */
export async function deleteProject(id: number): Promise<void> {
  await lifeAppApi.delete(`/todos/projects/${id}/`);
}

/**
 * Archive project
 */
export async function archiveProject(id: number): Promise<ProjectDetail> {
  const response = await lifeAppApi.post<ProjectDetail>(`/todos/projects/${id}/archive/`);
  return response.data;
}

/**
 * Unarchive project
 */
export async function unarchiveProject(id: number): Promise<ProjectDetail> {
  const response = await lifeAppApi.post<ProjectDetail>(`/todos/projects/${id}/unarchive/`);
  return response.data;
}

/**
 * Restore soft-deleted project
 */
export async function restoreProject(id: number): Promise<ProjectDetail> {
  const response = await lifeAppApi.post<ProjectDetail>(`/todos/projects/${id}/restore/`);
  return response.data;
}

// ============================================================================
// Todo Lists API
// ============================================================================

/**
 * List all todo lists with optional filtering
 */
export async function getTodoLists(params?: TodoListsQueryParams): Promise<PaginatedResponse<TodoList>> {
  // Convert camelCase params to snake_case for Django API
  const apiParams = params
    ? {
        view_mode: params.viewMode,
        project: params.project,
        standalone: params.standalone,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<TodoList>>('/todos/lists/', { params: apiParams });
  return response.data;
}

/**
 * Get single todo list with nested items or kanban lanes
 */
export async function getTodoList(id: number): Promise<TodoListDetail> {
  const response = await lifeAppApi.get<TodoListDetail>(`/todos/lists/${id}/`);
  return response.data;
}

/**
 * Create new todo list
 */
export async function createTodoList(data: CreateTodoListRequest): Promise<TodoListDetail> {
  const response = await lifeAppApi.post<TodoListDetail>('/todos/lists/', data);
  return response.data;
}

/**
 * Update existing todo list
 */
export async function updateTodoList(id: number, data: UpdateTodoListRequest): Promise<TodoListDetail> {
  const response = await lifeAppApi.patch<TodoListDetail>(`/todos/lists/${id}/`, data);
  return response.data;
}

/**
 * Delete todo list (soft delete)
 */
export async function deleteTodoList(id: number): Promise<void> {
  await lifeAppApi.delete(`/todos/lists/${id}/`);
}

/**
 * Switch view mode between list and kanban
 */
export async function switchViewMode(id: number, data: SwitchViewModeRequest): Promise<TodoListDetail> {
  const response = await lifeAppApi.post<TodoListDetail>(`/todos/lists/${id}/switch_view/`, data);
  return response.data;
}

/**
 * Restore soft-deleted todo list
 */
export async function restoreTodoList(id: number): Promise<TodoListDetail> {
  const response = await lifeAppApi.post<TodoListDetail>(`/todos/lists/${id}/restore/`);
  return response.data;
}

// ============================================================================
// Todo Items API
// ============================================================================

/**
 * List all todo items with optional filtering
 */
export async function getTodoItems(params?: TodoItemsQueryParams): Promise<PaginatedResponse<TodoItem>> {
  // Convert camelCase params to snake_case for Django API
  const apiParams = params
    ? {
        status: params.status,
        priority: params.priority,
        priority_gte: params.priorityGte,
        priority_lte: params.priorityLte,
        is_overdue: params.isOverdue,
        todo_list: params.todoList,
        project: params.project,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<TodoItem>>('/todos/items/', { params: apiParams });
  return response.data;
}

/**
 * Get single todo item with full details
 */
export async function getTodoItem(id: number): Promise<TodoItemDetail> {
  const response = await lifeAppApi.get<TodoItemDetail>(`/todos/items/${id}/`);
  return response.data;
}

/**
 * Create new todo item
 */
export async function createTodoItem(data: CreateTodoItemRequest): Promise<TodoItemDetail> {
  const response = await lifeAppApi.post<TodoItemDetail>('/todos/items/', data);
  return response.data;
}

/**
 * Update existing todo item
 */
export async function updateTodoItem(id: number, data: UpdateTodoItemRequest): Promise<TodoItemDetail> {
  const response = await lifeAppApi.patch<TodoItemDetail>(`/todos/items/${id}/`, data);
  return response.data;
}

/**
 * Delete todo item (soft delete)
 */
export async function deleteTodoItem(id: number): Promise<void> {
  await lifeAppApi.delete(`/todos/items/${id}/`);
}

/**
 * Mark item as completed
 */
export async function completeTodoItem(id: number): Promise<TodoItemDetail> {
  const response = await lifeAppApi.post<TodoItemDetail>(`/todos/items/${id}/complete/`);
  return response.data;
}

/**
 * Mark item as pending (undo completion)
 */
export async function uncompleteTodoItem(id: number): Promise<TodoItemDetail> {
  const response = await lifeAppApi.post<TodoItemDetail>(`/todos/items/${id}/uncomplete/`);
  return response.data;
}

/**
 * Move item to different kanban lane
 */
export async function moveItemToLane(id: number, data: MoveLaneRequest): Promise<TodoItemDetail> {
  const response = await lifeAppApi.post<TodoItemDetail>(`/todos/items/${id}/move_lane/`, data);
  return response.data;
}

/**
 * Restore soft-deleted todo item
 */
export async function restoreTodoItem(id: number): Promise<TodoItemDetail> {
  const response = await lifeAppApi.post<TodoItemDetail>(`/todos/items/${id}/restore/`);
  return response.data;
}

/**
 * Bulk complete multiple items
 */
export async function bulkCompleteItems(data: BulkCompleteRequest): Promise<BulkOperationResult> {
  const response = await lifeAppApi.post<BulkOperationResult>('/todos/items/bulk_complete/', data);
  return response.data;
}

/**
 * Bulk delete multiple items
 */
export async function bulkDeleteItems(data: BulkDeleteRequest): Promise<BulkOperationResult> {
  const response = await lifeAppApi.post<BulkOperationResult>('/todos/items/bulk_delete/', data);
  return response.data;
}

/**
 * Reorder items (drag-and-drop)
 */
export async function reorderItems(data: ReorderItemsRequest): Promise<BulkOperationResult> {
  const response = await lifeAppApi.post<BulkOperationResult>('/todos/items/reorder/', data);
  return response.data;
}

// ============================================================================
// Kanban Lanes API
// ============================================================================

/**
 * List all kanban lanes with optional filtering
 */
export async function getKanbanLanes(params?: KanbanLanesQueryParams): Promise<PaginatedResponse<KanbanLane>> {
  // Convert camelCase params to snake_case for Django API
  const apiParams = params
    ? {
        todo_list: params.todoList,
        is_default: params.isDefault,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<KanbanLane>>('/todos/lanes/', { params: apiParams });
  return response.data;
}

/**
 * Get single kanban lane with items
 */
export async function getKanbanLane(id: number): Promise<KanbanLaneWithItems> {
  const response = await lifeAppApi.get<KanbanLaneWithItems>(`/todos/lanes/${id}/`);
  return response.data;
}

/**
 * Create new kanban lane
 */
export async function createKanbanLane(data: CreateKanbanLaneRequest): Promise<KanbanLaneWithItems> {
  const response = await lifeAppApi.post<KanbanLaneWithItems>('/todos/lanes/', data);
  return response.data;
}

/**
 * Update existing kanban lane
 */
export async function updateKanbanLane(id: number, data: UpdateKanbanLaneRequest): Promise<KanbanLane> {
  const response = await lifeAppApi.patch<KanbanLane>(`/todos/lanes/${id}/`, data);
  return response.data;
}

/**
 * Delete kanban lane (soft delete)
 */
export async function deleteKanbanLane(id: number): Promise<void> {
  await lifeAppApi.delete(`/todos/lanes/${id}/`);
}

// ============================================================================
// Nested Routes (Convenience Functions)
// ============================================================================

/**
 * Get all lists for a specific project
 */
export async function getProjectLists(
  projectId: number,
  params?: TodoListsQueryParams
): Promise<PaginatedResponse<TodoList>> {
  // Convert camelCase params to snake_case for Django API
  const apiParams = params
    ? {
        view_mode: params.viewMode,
        project: params.project,
        standalone: params.standalone,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<TodoList>>(`/todos/projects/${projectId}/lists/`, {
    params: apiParams,
  });
  return response.data;
}

/**
 * Create new list within a project
 */
export async function createProjectList(
  projectId: number,
  data: Omit<CreateTodoListRequest, 'projectId'>
): Promise<TodoListDetail> {
  const response = await lifeAppApi.post<TodoListDetail>(`/todos/projects/${projectId}/lists/`, data);
  return response.data;
}

/**
 * Get all items for a specific list
 */
export async function getListItems(
  listId: number,
  params?: TodoItemsQueryParams
): Promise<PaginatedResponse<TodoItem>> {
  // Convert camelCase params to snake_case for Django API
  const apiParams = params
    ? {
        status: params.status,
        priority: params.priority,
        priority_gte: params.priorityGte,
        priority_lte: params.priorityLte,
        is_overdue: params.isOverdue,
        todo_list: params.todoList,
        project: params.project,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<TodoItem>>(`/todos/lists/${listId}/items/`, {
    params: apiParams,
  });
  return response.data;
}

/**
 * Create new item within a list
 */
export async function createListItem(
  listId: number,
  data: Omit<CreateTodoItemRequest, 'todoListId'>
): Promise<TodoItemDetail> {
  const response = await lifeAppApi.post<TodoItemDetail>(`/todos/lists/${listId}/items/`, data);
  return response.data;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get recently completed items (for undo UI)
 */
export async function getRecentlyCompletedItems(): Promise<PaginatedResponse<TodoItem>> {
  return getTodoItems({
    recentlyCompleted: true,
    ordering: '-completedAt',
    limit: 10,
  });
}

/**
 * Get overdue items
 */
export async function getOverdueItems(projectId?: number): Promise<PaginatedResponse<TodoItem>> {
  return getTodoItems({
    isOverdue: true,
    status: 'pending',
    ordering: 'dueDate',
    project: projectId,
  });
}

/**
 * Search items across all lists
 */
export async function searchItems(query: string, projectId?: number): Promise<PaginatedResponse<TodoItem>> {
  return getTodoItems({
    search: query,
    status: 'pending',
    project: projectId,
  });
}

/**
 * Get high-priority items
 */
export async function getHighPriorityItems(projectId?: number): Promise<PaginatedResponse<TodoItem>> {
  return getTodoItems({
    priorityGte: 3, // High and highest
    status: 'pending',
    ordering: '-priority,dueDate',
    project: projectId,
  });
}
