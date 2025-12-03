/**
 * Zod validation schemas for todo forms
 *
 * Used with React Hook Form for client-side validation.
 */

import { z } from 'zod';

// ============================================================================
// Project Schemas
// ============================================================================

export const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional().default(''),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use #RRGGBB)')
    .default('#3B82F6'),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

// ============================================================================
// Todo List Schemas
// ============================================================================

export const todoListFormSchema = z.object({
  name: z.string().min(1, 'List name is required').max(200, 'List name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional().default(''),
  viewMode: z.enum(['list', 'kanban']).default('list'),
  projectId: z.number().nullable().optional(),
});

export type TodoListFormValues = z.infer<typeof todoListFormSchema>;

// ============================================================================
// Todo Item Schemas
// ============================================================================

export const todoItemFormSchema = z.object({
  title: z.string().min(1, 'Item title is required').max(500, 'Title must be less than 500 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().default(''),
  priority: z.number().int().min(0).max(4).default(0),
  dueDate: z.date().nullable().optional(),
});

export type TodoItemFormValues = z.infer<typeof todoItemFormSchema>;

// Quick add variant (minimal validation for inline forms)
export const quickAddItemSchema = z.object({
  title: z.string().min(1, 'Item title is required').max(500, 'Title must be less than 500 characters'),
});

export type QuickAddItemValues = z.infer<typeof quickAddItemSchema>;

// ============================================================================
// Kanban Lane Schemas
// ============================================================================

export const kanbanLaneFormSchema = z.object({
  name: z.string().min(1, 'Lane name is required').max(100, 'Lane name must be less than 100 characters'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format (use #RRGGBB)')
    .default('#6B7280'),
});

export type KanbanLaneFormValues = z.infer<typeof kanbanLaneFormSchema>;
