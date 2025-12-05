import { describe, it, expect } from 'vitest';
import {
  projectFormSchema,
  todoListFormSchema,
  todoItemFormSchema,
  quickAddItemSchema,
  kanbanLaneFormSchema,
} from './todo';

describe('Form Validations', () => {
  describe('projectFormSchema', () => {
    it('should validate valid project data', () => {
      const validData = {
        name: 'My Project',
        description: 'A test project',
        color: '#3b82f6',
      };

      const result = projectFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const invalidData = {
        description: 'No name',
        color: '#3b82f6',
      };

      const result = projectFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should validate minimum name length', () => {
      const invalidData = {
        name: '',
        description: '',
        color: '#3b82f6',
      };

      const result = projectFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Project name is required');
      }
    });

    it('should allow optional description', () => {
      const validData = {
        name: 'Project',
        description: '',
        color: '#3b82f6',
      };

      const result = projectFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('todoListFormSchema', () => {
    it('should validate valid list data', () => {
      const validData = {
        name: 'Shopping List',
        description: 'Weekly groceries',
        color: '#10b981',
        viewMode: 'list' as const,
        projectId: undefined,
      };

      const result = todoListFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid view modes', () => {
      const listView = todoListFormSchema.safeParse({
        name: 'List',
        description: '',
        color: '#000000',
        viewMode: 'list',
      });
      expect(listView.success).toBe(true);

      const kanbanView = todoListFormSchema.safeParse({
        name: 'Kanban',
        description: '',
        color: '#000000',
        viewMode: 'kanban',
      });
      expect(kanbanView.success).toBe(true);
    });

    it('should allow optional projectId', () => {
      const withProject = todoListFormSchema.safeParse({
        name: 'List',
        description: '',
        color: '#000000',
        viewMode: 'list',
        projectId: 5,
      });
      expect(withProject.success).toBe(true);

      const withoutProject = todoListFormSchema.safeParse({
        name: 'List',
        description: '',
        color: '#000000',
        viewMode: 'list',
        projectId: undefined,
      });
      expect(withoutProject.success).toBe(true);
    });
  });

  describe('todoItemFormSchema', () => {
    it('should validate valid item data', () => {
      const validData = {
        title: 'Buy milk',
        description: 'Get 2% milk',
        priority: 1,
        dueDate: null,
      };

      const result = todoItemFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const invalidData = {
        title: '',
        description: '',
        priority: 0,
        dueDate: null,
      };

      const result = todoItemFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('title');
      }
    });

    it('should validate priority range', () => {
      // Valid priorities (0-4 based on schema)
      for (let priority = 0; priority <= 4; priority++) {
        const result = todoItemFormSchema.safeParse({
          title: 'Task',
          description: '',
          priority,
          dueDate: null,
        });
        expect(result.success).toBe(true);
      }

      // Invalid priorities
      const tooLow = todoItemFormSchema.safeParse({
        title: 'Task',
        description: '',
        priority: -1,
        dueDate: null,
      });
      expect(tooLow.success).toBe(false);

      const tooHigh = todoItemFormSchema.safeParse({
        title: 'Task',
        description: '',
        priority: 5,
        dueDate: null,
      });
      expect(tooHigh.success).toBe(false);
    });

    it('should allow null or Date dueDate', () => {
      const withoutDate = todoItemFormSchema.safeParse({
        title: 'Task',
        description: '',
        priority: 0,
        dueDate: null,
      });
      expect(withoutDate.success).toBe(true);

      const withDate = todoItemFormSchema.safeParse({
        title: 'Task',
        description: '',
        priority: 0,
        dueDate: new Date('2024-12-31'),
      });
      expect(withDate.success).toBe(true);
    });
  });

  describe('quickAddItemSchema', () => {
    it('should validate quick add data', () => {
      const validData = {
        title: 'Quick task',
      };

      const result = quickAddItemSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const invalidData = {
        title: '',
      };

      const result = quickAddItemSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept title with spaces', () => {
      const data = {
        title: 'Task with spaces',
      };

      const result = quickAddItemSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Task with spaces');
      }
    });
  });

  describe('kanbanLaneFormSchema', () => {
    it('should validate valid lane data', () => {
      const validData = {
        name: 'In Progress',
        color: '#f59e0b',
      };

      const result = kanbanLaneFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const invalidData = {
        name: '',
        color: '#000000',
      };

      const result = kanbanLaneFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should have default color if not provided', () => {
      const dataWithoutColor = {
        name: 'Lane',
      };

      const result = kanbanLaneFormSchema.safeParse(dataWithoutColor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBe('#6B7280'); // Default color
      }
    });
  });
});
