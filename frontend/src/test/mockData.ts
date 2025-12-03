import type { Project, ProjectDetail, TodoList, TodoListDetail, TodoItem, KanbanLane } from '@/types/todo';

export const mockProject: Project = {
  id: 1,
  name: 'Test Project',
  description: 'A test project',
  color: '#3b82f6',
  isArchived: false,
  displayOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  listCount: 2,
  completionPercentage: 50,
};

export const mockProjectDetail: ProjectDetail = {
  ...mockProject,
  lists: [],
};

export const mockTodoList: TodoList = {
  id: 1,
  name: 'Test List',
  description: 'A test list',
  color: '#10b981',
  viewMode: 'list',
  projectId: 1,
  projectName: 'Test Project',
  displayOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  itemCount: 3,
  completionPercentage: 33,
};

export const mockTodoListDetail: TodoListDetail = {
  ...mockTodoList,
  items: [],
  kanbanLanes: [],
};

export const mockTodoItem: TodoItem = {
  id: 1,
  title: 'Test Item',
  description: 'A test item',
  status: 'pending',
  priority: 1,
  dueDate: null,
  completedAt: null,
  todoListId: 1,
  kanbanLaneId: null,
  parentItemId: null,
  displayOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  subtasks: [],
};

export const mockKanbanLane: KanbanLane = {
  id: 1,
  name: 'To Do',
  color: '#6366f1',
  isDefault: true,
  todoListId: 1,
  displayOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  itemCount: 2,
};

export const mockPaginatedResponse = <T>(data: T[]) => ({
  count: data.length,
  next: null,
  previous: null,
  results: data,
});
