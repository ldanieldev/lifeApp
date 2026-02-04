/**
 * Zod validation schemas for Vehicle Maintenance Tracker forms
 */

import { z } from 'zod';

/**
 * Vehicle form schema
 */
export const vehicleSchema = z.object({
  name: z.string().max(100, 'Name must be 100 characters or less').optional().default(''),
  year: z
    .number({ required_error: 'Year is required' })
    .int('Year must be a whole number')
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 2, `Year cannot be more than ${new Date().getFullYear() + 2}`),
  make: z.string().min(1, 'Make is required').max(100, 'Make must be 100 characters or less'),
  model: z.string().min(1, 'Model is required').max(100, 'Model must be 100 characters or less'),
  vin: z
    .string()
    .max(17, 'VIN must be 17 characters')
    .optional()
    .default('')
    .transform((val) => val.toUpperCase()),
  licensePlate: z.string().max(20, 'License plate must be 20 characters or less').optional().default(''),
  engine: z.string().max(100, 'Engine must be 100 characters or less').optional().default(''),
  trim: z.string().max(100, 'Trim must be 100 characters or less').optional().default(''),
  currentOdometer: z.number().int().min(0, 'Odometer must be 0 or greater').optional().default(0),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;

/**
 * Service record form schema
 */
export const serviceRecordSchema = z.object({
  date: z.date({ required_error: 'Date is required' }),
  odometer: z
    .number({ required_error: 'Odometer is required' })
    .int('Odometer must be a whole number')
    .min(0, 'Odometer must be 0 or greater'),
  serviceTypeId: z.number({ required_error: 'Service type is required' }).int().positive('Select a service type'),
  shopId: z.number().int().positive().nullable().optional().default(null),
  partsCost: z.number().min(0, 'Parts cost must be 0 or greater').optional().default(0),
  laborCost: z.number().min(0, 'Labor cost must be 0 or greater').optional().default(0),
  notes: z.string().max(5000, 'Notes must be 5000 characters or less').optional().default(''),
});

export type ServiceRecordFormValues = z.infer<typeof serviceRecordSchema>;

/**
 * Reminder form schema
 */
export const reminderSchema = z
  .object({
    serviceTypeId: z.number({ required_error: 'Service type is required' }).int().positive('Select a service type'),
    mileageInterval: z.number().int().positive('Mileage interval must be positive').nullable().optional().default(null),
    timeIntervalMonths: z
      .number()
      .int()
      .positive('Time interval must be positive')
      .max(120, 'Time interval cannot exceed 10 years')
      .nullable()
      .optional()
      .default(null),
    notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional().default(''),
  })
  .refine((data) => data.mileageInterval !== null || data.timeIntervalMonths !== null, {
    message: 'At least one interval (mileage or time) is required',
    path: ['mileageInterval'],
  });

export type ReminderFormValues = z.infer<typeof reminderSchema>;

/**
 * Note form schema
 */
export const noteSchema = z.object({
  content: z
    .string({ required_error: 'Content is required' })
    .min(1, 'Content is required')
    .max(10000, 'Content must be 10000 characters or less'),
  odometer: z.number().int().min(0, 'Odometer must be 0 or greater').nullable().optional().default(null),
});

export type NoteFormValues = z.infer<typeof noteSchema>;

/**
 * Shop form schema
 */
export const shopSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),
  address: z.string().max(500, 'Address must be 500 characters or less').optional().default(''),
  phone: z.string().max(50, 'Phone must be 50 characters or less').optional().default(''),
});

export type ShopFormValues = z.infer<typeof shopSchema>;

/**
 * Service type form schema
 */
export const serviceTypeSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().default(''),
});

export type ServiceTypeFormValues = z.infer<typeof serviceTypeSchema>;

/**
 * Odometer update form schema
 */
export const odometerSchema = z.object({
  odometer: z
    .number({ required_error: 'Odometer is required' })
    .int('Odometer must be a whole number')
    .min(0, 'Odometer must be 0 or greater'),
});

export type OdometerFormValues = z.infer<typeof odometerSchema>;
