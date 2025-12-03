/**
 * TanStack Query Hooks for Todos API
 *
 * Custom hooks for fetching, caching, and mutating todo data.
 * Implements optimistic updates for instant UI feedback.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import * as todosApi from '@/api/todos';
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
// Query Keys (for cache management)
// ============================================================================

export const todoKeys = {
  all: ['todos'] as const,
  projects: () => [...todoKeys.all, 'projects'] as const,
  projectsList: (params?: ProjectsQueryParams) => [...todoKeys.projects(), 'list', params] as const,
  project: (id: number) => [...todoKeys.projects(), id] as const,
  projectLists: (id: number) => [...todoKeys.projects(), id, 'lists'] as const,
  lists: () => [...todoKeys.all, 'lists'] as const,
  listsList: (params?: TodoListsQueryParams) => [...todoKeys.lists(), 'list', params] as const,
  list: (id: number) => [...todoKeys.lists(), id] as const,
  listItems: (id: number) => [...todoKeys.lists(), id, 'items'] as const,
  items: () => [...todoKeys.all, 'items'] as const,
  itemsList: (params?: TodoItemsQueryParams) => [...todoKeys.items(), 'list', params] as const,
  item: (id: number) => [...todoKeys.items(), id] as const,
  lanes: () => [...todoKeys.all, 'lanes'] as const,
  lanesList: (params?: KanbanLanesQueryParams) => [...todoKeys.lanes(), 'list', params] as const,
  lane: (id: number) => [...todoKeys.lanes(), id] as const,
};

// ============================================================================
// Projects Queries
// ============================================================================

/**
 * Fetch all projects with optional filtering
 */
export function useProjects(params?: ProjectsQueryParams, options?: UseQueryOptions<PaginatedResponse<Project>>) {
  return useQuery({
    queryKey: todoKeys.projectsList(params),
    queryFn: () => todosApi.getProjects(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch single project with nested lists
 */
export function useProject(id: number, options?: UseQueryOptions<ProjectDetail>) {
  return useQuery({
    queryKey: todoKeys.project(id),
    queryFn: () => todosApi.getProject(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch project's lists
 */
export function useProjectLists(
  projectId: number,
  params?: TodoListsQueryParams,
  options?: UseQueryOptions<PaginatedResponse<TodoList>>
) {
  return useQuery({
    queryKey: todoKeys.projectLists(projectId),
    queryFn: () => todosApi.getProjectLists(projectId, params),
    staleTime: 2 * 60 * 1000,
    enabled: !!projectId,
    ...options,
  });
}

// ============================================================================
// Projects Mutations
// ============================================================================

/**
 * Create new project
 */
export function useCreateProject(options?: UseMutationOptions<ProjectDetail, Error, CreateProjectRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.createProject,
    onMutate: async (newProject): Promise<{ previousProjects: PaginatedResponse<Project> | undefined }> => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: todoKeys.projects() });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData<PaginatedResponse<Project>>(todoKeys.projectsList());

      // Optimistically update cache
      if (previousProjects) {
        const optimisticProject: Project = {
          id: Date.now(), // Temporary ID
          name: newProject.name,
          description: newProject.description || '',
          color: newProject.color || '#3B82F6',
          itemCount: 0,
          completedCount: 0,
          completionPercentage: 0,
          isArchived: false,
          displayOrder: newProject.displayOrder || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<PaginatedResponse<Project>>(todoKeys.projectsList(), {
          ...previousProjects,
          count: previousProjects.count + 1,
          results: [optimisticProject, ...previousProjects.results],
        });
      }

      return { previousProjects };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(todoKeys.projectsList(), context.previousProjects);
      }
      toast.error('Failed to create project', {
        description: error.message,
      });
    },
    onSuccess: () => {
      toast.success('Project created successfully');
    },
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    ...options,
  });
}

/**
 * Update project
 */
export function useUpdateProject(
  options?: UseMutationOptions<ProjectDetail, Error, { id: number; data: UpdateProjectRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => todosApi.updateProject(id, data),
    onMutate: async ({ id, data }): Promise<{ previousProject: ProjectDetail | undefined }> => {
      await queryClient.cancelQueries({ queryKey: todoKeys.project(id) });

      const previousProject = queryClient.getQueryData<ProjectDetail>(todoKeys.project(id));

      // Optimistically update
      if (previousProject) {
        queryClient.setQueryData<ProjectDetail>(todoKeys.project(id), {
          ...previousProject,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousProject };
    },
    onError: (error, { id }, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(todoKeys.project(id), context.previousProject);
      }
      toast.error('Failed to update project', {
        description: error.message,
      });
    },
    onSuccess: () => {
      toast.success('Project updated successfully');
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: todoKeys.project(id) });
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    ...options,
  });
}

/**
 * Delete project
 */
export function useDeleteProject(options?: UseMutationOptions<void, Error, number>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.deleteProject,
    onSuccess: () => {
      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    onError: (error) => {
      toast.error('Failed to delete project', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Archive project
 */
export function useArchiveProject(options?: UseMutationOptions<ProjectDetail, Error, number>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.archiveProject,
    onSuccess: (data) => {
      toast.success('Project archived');
      queryClient.setQueryData(todoKeys.project(data.id), data);
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    onError: (error) => {
      toast.error('Failed to archive project', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Unarchive project
 */
export function useUnarchiveProject(options?: UseMutationOptions<ProjectDetail, Error, number>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.unarchiveProject,
    onSuccess: (data) => {
      toast.success('Project unarchived');
      queryClient.setQueryData(todoKeys.project(data.id), data);
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    onError: (error) => {
      toast.error('Failed to unarchive project', {
        description: error.message,
      });
    },
    ...options,
  });
}

// ============================================================================
// Todo Lists Queries
// ============================================================================

/**
 * Fetch all todo lists with optional filtering
 */
export function useTodoLists(params?: TodoListsQueryParams, options?: UseQueryOptions<PaginatedResponse<TodoList>>) {
  return useQuery({
    queryKey: todoKeys.listsList(params),
    queryFn: () => todosApi.getTodoLists(params),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch single todo list with items or kanban lanes
 */
export function useTodoList(id: number, options?: UseQueryOptions<TodoListDetail>) {
  return useQuery({
    queryKey: todoKeys.list(id),
    queryFn: () => todosApi.getTodoList(id),
    staleTime: 1 * 60 * 1000, // 1 minute (shorter due to frequent updates)
    enabled: !!id,
    ...options,
  });
}

// ============================================================================
// Todo Lists Mutations
// ============================================================================

/**
 * Create new todo list
 */
export function useCreateTodoList(options?: UseMutationOptions<TodoListDetail, Error, CreateTodoListRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.createTodoList,
    onSuccess: (data) => {
      toast.success('List created successfully');
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: todoKeys.project(data.projectId) });
      }
    },
    onError: (error) => {
      toast.error('Failed to create list', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Update todo list
 */
export function useUpdateTodoList(
  options?: UseMutationOptions<TodoListDetail, Error, { id: number; data: UpdateTodoListRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => todosApi.updateTodoList(id, data),
    onSuccess: (data) => {
      toast.success('List updated successfully');
      queryClient.setQueryData(todoKeys.list(data.id), data);
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: todoKeys.project(data.projectId) });
      }
    },
    onError: (error) => {
      toast.error('Failed to update list', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Delete todo list
 */
export function useDeleteTodoList(options?: UseMutationOptions<void, Error, number>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.deleteTodoList,
    onSuccess: () => {
      toast.success('List deleted successfully');
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    onError: (error) => {
      toast.error('Failed to delete list', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Switch view mode (list ↔ kanban)
 */
export function useSwitchViewMode(
  options?: UseMutationOptions<TodoListDetail, Error, { id: number; data: SwitchViewModeRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => todosApi.switchViewMode(id, data),
    onSuccess: (data) => {
      toast.success(`Switched to ${data.viewMode} view`);
      queryClient.setQueryData(todoKeys.list(data.id), data);
    },
    onError: (error) => {
      toast.error('Failed to switch view mode', {
        description: error.message,
      });
    },
    ...options,
  });
}

// ============================================================================
// Todo Items Queries
// ============================================================================

/**
 * Fetch all todo items with optional filtering
 */
export function useTodoItems(params?: TodoItemsQueryParams, options?: UseQueryOptions<PaginatedResponse<TodoItem>>) {
  return useQuery({
    queryKey: todoKeys.itemsList(params),
    queryFn: () => todosApi.getTodoItems(params),
    staleTime: 1 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch single todo item
 */
export function useTodoItem(id: number, options?: UseQueryOptions<TodoItemDetail>) {
  return useQuery({
    queryKey: todoKeys.item(id),
    queryFn: () => todosApi.getTodoItem(id),
    enabled: !!id,
    ...options,
  });
}

// ============================================================================
// Todo Items Mutations
// ============================================================================

/**
 * Create new todo item
 */
export function useCreateTodoItem(options?: UseMutationOptions<TodoItemDetail, Error, CreateTodoItemRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.createTodoItem,
    onMutate: async (newItem): Promise<{ previousList: TodoListDetail | undefined }> => {
      // Optimistically update list detail cache
      await queryClient.cancelQueries({ queryKey: todoKeys.list(newItem.todoListId) });

      const previousList = queryClient.getQueryData<TodoListDetail>(todoKeys.list(newItem.todoListId));

      if (previousList) {
        const optimisticItem: TodoItem = {
          id: Date.now(),
          title: newItem.title,
          description: newItem.description || '',
          status: 'pending',
          priority: newItem.priority || 0,
          dueDate: newItem.dueDate || null,
          isOverdue: false,
          completedAt: null,
          displayOrder: newItem.displayOrder || 0,
          kanbanLaneId: newItem.kanbanLaneId || null,
          kanbanLaneName: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Update list view items
        if (previousList.viewMode === 'list' && previousList.items) {
          queryClient.setQueryData<TodoListDetail>(todoKeys.list(newItem.todoListId), {
            ...previousList,
            items: [optimisticItem, ...previousList.items],
            itemCount: previousList.itemCount + 1,
          });
        }

        // Update kanban view lanes
        if (previousList.viewMode === 'kanban' && previousList.kanbanLanes) {
          const targetLaneId = newItem.kanbanLaneId || previousList.kanbanLanes.find((l) => l.isDefault)?.id;
          queryClient.setQueryData<TodoListDetail>(todoKeys.list(newItem.todoListId), {
            ...previousList,
            kanbanLanes: previousList.kanbanLanes.map((lane) =>
              lane.id === targetLaneId
                ? {
                    ...lane,
                    items: [optimisticItem, ...(lane.items || [])],
                    itemCount: lane.itemCount + 1,
                  }
                : lane
            ),
            itemCount: previousList.itemCount + 1,
          });
        }
      }

      return { previousList };
    },
    onError: (error, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(todoKeys.list(variables.todoListId), context.previousList);
      }
      toast.error('Failed to create item', {
        description: error.message,
      });
    },
    onSuccess: () => {
      toast.success('Item created');
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: todoKeys.list(data.todoListId) });
        queryClient.invalidateQueries({ queryKey: todoKeys.items() });
        if (data.projectId) {
          queryClient.invalidateQueries({ queryKey: todoKeys.project(data.projectId) });
        }
      }
    },
    ...options,
  });
}

/**
 * Update todo item
 */
export function useUpdateTodoItem(
  options?: UseMutationOptions<TodoItemDetail, Error, { id: number; data: UpdateTodoItemRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => todosApi.updateTodoItem(id, data),
    onSuccess: (data) => {
      toast.success('Item updated');
      queryClient.setQueryData(todoKeys.item(data.id), data);
      queryClient.invalidateQueries({ queryKey: todoKeys.list(data.todoListId) });
      queryClient.invalidateQueries({ queryKey: todoKeys.items() });
    },
    onError: (error) => {
      toast.error('Failed to update item', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Delete todo item
 */
export function useDeleteTodoItem(options?: UseMutationOptions<void, Error, number>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.deleteTodoItem,
    onSuccess: () => {
      toast.success('Item deleted');
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: todoKeys.items() });
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    onError: (error) => {
      toast.error('Failed to delete item', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Complete todo item
 */
export function useCompleteTodoItem(options?: UseMutationOptions<TodoItemDetail, Error, number>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.completeTodoItem,
    onMutate: async (id): Promise<{ previousItem: TodoItemDetail | undefined }> => {
      // Optimistically mark as completed
      const previousItem = queryClient.getQueryData<TodoItemDetail>(todoKeys.item(id));

      if (previousItem) {
        queryClient.setQueryData<TodoItemDetail>(todoKeys.item(id), {
          ...previousItem,
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
      }

      return { previousItem };
    },
    onError: (error, id, context) => {
      if (context?.previousItem) {
        queryClient.setQueryData(todoKeys.item(id), context.previousItem);
      }
      toast.error('Failed to complete item', {
        description: error.message,
      });
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: todoKeys.list(data.todoListId) });
        queryClient.invalidateQueries({ queryKey: todoKeys.items() });
        if (data.projectId) {
          queryClient.invalidateQueries({ queryKey: todoKeys.project(data.projectId) });
        }
      }
    },
    ...options,
  });
}

/**
 * Uncomplete todo item (undo)
 */
export function useUncompleteTodoItem(options?: UseMutationOptions<TodoItemDetail, Error, number>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.uncompleteTodoItem,
    onMutate: async (id): Promise<{ previousItem: TodoItemDetail | undefined }> => {
      const previousItem = queryClient.getQueryData<TodoItemDetail>(todoKeys.item(id));

      if (previousItem) {
        queryClient.setQueryData<TodoItemDetail>(todoKeys.item(id), {
          ...previousItem,
          status: 'pending',
          completedAt: null,
        });
      }

      return { previousItem };
    },
    onError: (error, id, context) => {
      if (context?.previousItem) {
        queryClient.setQueryData(todoKeys.item(id), context.previousItem);
      }
      toast.error('Failed to undo completion', {
        description: error.message,
      });
    },
    onSuccess: () => {
      toast.success('Item restored');
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: todoKeys.list(data.todoListId) });
        queryClient.invalidateQueries({ queryKey: todoKeys.items() });
        if (data.projectId) {
          queryClient.invalidateQueries({ queryKey: todoKeys.project(data.projectId) });
        }
      }
    },
    ...options,
  });
}

/**
 * Move item to different kanban lane
 */
export function useMoveItemToLane(
  options?: UseMutationOptions<TodoItemDetail, Error, { id: number; data: MoveLaneRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => todosApi.moveItemToLane(id, data),
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: todoKeys.list(data.todoListId) });
        queryClient.invalidateQueries({ queryKey: todoKeys.item(data.id) });
      }
    },
    ...options,
  });
}

/**
 * Bulk complete items
 */
export function useBulkCompleteItems(options?: UseMutationOptions<BulkOperationResult, Error, BulkCompleteRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.bulkCompleteItems,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: todoKeys.items() });
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    onError: (error) => {
      toast.error('Failed to complete items', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Bulk delete items
 */
export function useBulkDeleteItems(options?: UseMutationOptions<BulkOperationResult, Error, BulkDeleteRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.bulkDeleteItems,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: todoKeys.items() });
      queryClient.invalidateQueries({ queryKey: todoKeys.projects() });
    },
    onError: (error) => {
      toast.error('Failed to delete items', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Reorder items (drag-and-drop)
 */
export function useReorderItems(options?: UseMutationOptions<BulkOperationResult, Error, ReorderItemsRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.reorderItems,
    onError: (error) => {
      // Show error feedback when reorder fails
      toast.error('Failed to reorder items', {
        description: error.message,
      });
    },
    onSettled: () => {
      // Silently refetch without toast (drag-and-drop is visual feedback enough)
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: todoKeys.items() });
    },
    ...options,
  });
}

// ============================================================================
// Kanban Lanes Mutations
// ============================================================================

/**
 * Create new kanban lane
 */
export function useCreateKanbanLane(options?: UseMutationOptions<KanbanLaneWithItems, Error, CreateKanbanLaneRequest>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.createKanbanLane,
    onSuccess: (_data, variables) => {
      toast.success('Lane created');
      queryClient.invalidateQueries({ queryKey: todoKeys.list(variables.todoListId) });
      queryClient.invalidateQueries({ queryKey: todoKeys.lanes() });
    },
    onError: (error) => {
      toast.error('Failed to create lane', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Update kanban lane
 */
export function useUpdateKanbanLane(
  options?: UseMutationOptions<KanbanLane, Error, { id: number; data: UpdateKanbanLaneRequest }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => todosApi.updateKanbanLane(id, data),
    onSuccess: () => {
      toast.success('Lane updated');
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: todoKeys.lanes() });
    },
    onError: (error) => {
      toast.error('Failed to update lane', {
        description: error.message,
      });
    },
    ...options,
  });
}

/**
 * Delete kanban lane
 */
export function useDeleteKanbanLane(options?: UseMutationOptions<void, Error, number>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: todosApi.deleteKanbanLane,
    onSuccess: () => {
      toast.success('Lane deleted');
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: todoKeys.lanes() });
    },
    onError: (error) => {
      toast.error('Failed to delete lane', {
        description: error.message,
      });
    },
    ...options,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get recently completed items (for undo UI)
 */
export function useRecentlyCompletedItems(options?: UseQueryOptions<PaginatedResponse<TodoItem>>) {
  return useQuery({
    queryKey: todoKeys.itemsList({ recentlyCompleted: true }),
    queryFn: todosApi.getRecentlyCompletedItems,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    ...options,
  });
}

/**
 * Get overdue items
 */
export function useOverdueItems(projectId?: number, options?: UseQueryOptions<PaginatedResponse<TodoItem>>) {
  return useQuery({
    queryKey: todoKeys.itemsList({ isOverdue: true, project: projectId }),
    queryFn: () => todosApi.getOverdueItems(projectId),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}
