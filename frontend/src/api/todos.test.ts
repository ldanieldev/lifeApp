import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockProject, mockTodoList, mockTodoItem, mockKanbanLane, mockPaginatedResponse } from '@/test/mockData';

// Mock the axios instance
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

// Import after mocking
const todosApi = await import('./todos');

describe('Todos API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Projects API', () => {
    it('should fetch projects list', async () => {
      const mockData = mockPaginatedResponse([mockProject]);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

      const result = await todosApi.getProjects();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/projects/', { params: undefined });
      expect(result).toEqual(mockData);
    });

    it('should fetch project detail', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProject });

      const result = await todosApi.getProject(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/projects/1/');
      expect(result).toEqual(mockProject);
    });

    it('should create project', async () => {
      const newProject = {
        name: 'New Project',
        description: 'Test',
        color: '#3b82f6',
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockProject });

      const result = await todosApi.createProject(newProject);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/projects/', newProject);
      expect(result).toEqual(mockProject);
    });

    it('should update project', async () => {
      const updateData = { name: 'Updated Project' };
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: { ...mockProject, ...updateData } });

      const result = await todosApi.updateProject(1, updateData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/todos/projects/1/', updateData);
      expect(result.name).toBe('Updated Project');
    });

    it('should archive project', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { ...mockProject, isArchived: true } });

      const result = await todosApi.archiveProject(1);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/projects/1/archive/');
      expect(result.isArchived).toBe(true);
    });

    it('should unarchive project', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockProject });

      const result = await todosApi.unarchiveProject(1);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/projects/1/unarchive/');
      expect(result).toEqual(mockProject);
    });

    it('should delete project', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: null });

      await todosApi.deleteProject(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/todos/projects/1/');
    });
  });

  describe('Todo Lists API', () => {
    it('should fetch todo lists', async () => {
      const mockData = mockPaginatedResponse([mockTodoList]);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

      const result = await todosApi.getTodoLists();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/lists/', { params: undefined });
      expect(result).toEqual(mockData);
    });

    it('should fetch todo list detail', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTodoList });

      const result = await todosApi.getTodoList(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/lists/1/');
      expect(result).toEqual(mockTodoList);
    });

    it('should create todo list', async () => {
      const newList = {
        name: 'Shopping List',
        description: '',
        color: '#10b981',
        viewMode: 'list' as const,
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockTodoList });

      const result = await todosApi.createTodoList(newList);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/lists/', newList);
      expect(result).toEqual(mockTodoList);
    });

    it('should update todo list', async () => {
      const updateData = { name: 'Updated List' };
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: { ...mockTodoList, ...updateData } });

      const result = await todosApi.updateTodoList(1, updateData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/todos/lists/1/', updateData);
      expect(result.name).toBe('Updated List');
    });

    it('should switch view mode', async () => {
      const updatedList = { ...mockTodoList, viewMode: 'kanban' as const };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: updatedList });

      const result = await todosApi.switchViewMode(1, { viewMode: 'kanban' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/lists/1/switch_view/', { viewMode: 'kanban' });
      expect(result.viewMode).toBe('kanban');
    });

    it('should delete todo list', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: null });

      await todosApi.deleteTodoList(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/todos/lists/1/');
    });
  });

  describe('Todo Items API', () => {
    it('should fetch todo items', async () => {
      const mockData = mockPaginatedResponse([mockTodoItem]);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

      const result = await todosApi.getTodoItems();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/items/', { params: undefined });
      expect(result).toEqual(mockData);
    });

    it('should create todo item', async () => {
      const newItem = {
        title: 'Buy milk',
        description: '',
        priority: 1,
        todoListId: 1,
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockTodoItem });

      const result = await todosApi.createTodoItem(newItem);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/items/', newItem);
      expect(result).toEqual(mockTodoItem);
    });

    it('should update todo item', async () => {
      const updateData = { title: 'Updated Item' };
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: { ...mockTodoItem, ...updateData } });

      const result = await todosApi.updateTodoItem(1, updateData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/todos/items/1/', updateData);
      expect(result.title).toBe('Updated Item');
    });

    it('should complete todo item', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { ...mockTodoItem, status: 'completed' } });

      const result = await todosApi.completeTodoItem(1);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/items/1/complete/');
      expect(result.status).toBe('completed');
    });

    it('should uncomplete todo item', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockTodoItem });

      const result = await todosApi.uncompleteTodoItem(1);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/items/1/uncomplete/');
      expect(result.status).toBe('pending');
    });

    it('should bulk complete items', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { itemIds: [1, 2, 3] } });

      const result = await todosApi.bulkCompleteItems({ itemIds: [1, 2, 3] });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/items/bulk_complete/', { itemIds: [1, 2, 3] });
      expect(result.itemIds).toEqual([1, 2, 3]);
    });

    it('should bulk delete items', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { itemIds: [1, 2, 3] } });

      const result = await todosApi.bulkDeleteItems({ itemIds: [1, 2, 3] });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/items/bulk_delete/', { itemIds: [1, 2, 3] });
      expect(result.itemIds).toEqual([1, 2, 3]);
    });

    it('should reorder items', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { itemIds: [3, 2, 1] } });

      const result = await todosApi.reorderItems({ itemIds: [3, 2, 1] });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/items/reorder/', { itemIds: [3, 2, 1] });
      expect(result.itemIds).toEqual([3, 2, 1]);
    });

    it('should delete todo item', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: null });

      await todosApi.deleteTodoItem(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/todos/items/1/');
    });
  });

  describe('Kanban Lanes API', () => {
    it('should fetch kanban lanes', async () => {
      const mockData = mockPaginatedResponse([mockKanbanLane]);
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

      const result = await todosApi.getKanbanLanes({ todoList: 1 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/lanes/', { params: { todo_list: 1 } });
      expect(result).toEqual(mockData);
    });

    it('should create kanban lane', async () => {
      const newLane = {
        name: 'In Progress',
        color: '#f59e0b',
        todoListId: 1,
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockKanbanLane });

      const result = await todosApi.createKanbanLane(newLane);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/todos/lanes/', newLane);
      expect(result).toEqual(mockKanbanLane);
    });

    it('should update kanban lane', async () => {
      const updateData = { name: 'Updated Lane' };
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: { ...mockKanbanLane, ...updateData } });

      const result = await todosApi.updateKanbanLane(1, updateData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/todos/lanes/1/', updateData);
      expect(result.name).toBe('Updated Lane');
    });

    it('should delete kanban lane', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: null });

      await todosApi.deleteKanbanLane(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/todos/lanes/1/');
    });
  });
});
