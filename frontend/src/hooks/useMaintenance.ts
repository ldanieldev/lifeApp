/**
 * Custom hooks for Vehicle Maintenance Tracker
 *
 * Uses TanStack Query for server state management.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import * as maintenanceApi from '@/api/maintenance';
import type {
  CreateAttachmentRequest,
  CreateNoteRequest,
  CreateReminderRequest,
  CreateServiceRecordRequest,
  CreateServiceTypeRequest,
  CreateShopRequest,
  CreateVehicleRequest,
  NotesQueryParams,
  RemindersQueryParams,
  ServiceRecordsQueryParams,
  ServiceTypesQueryParams,
  ShopsQueryParams,
  UpdateNoteRequest,
  UpdateOdometerRequest,
  UpdateReminderRequest,
  UpdateServiceRecordRequest,
  UpdateServiceTypeRequest,
  UpdateShopRequest,
  UpdateVehicleRequest,
  VehiclesQueryParams,
} from '@/types/maintenance';

// ============================================================================
// Query Keys
// ============================================================================

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  vehicles: {
    all: () => [...maintenanceKeys.all, 'vehicles'] as const,
    list: (params?: VehiclesQueryParams) => [...maintenanceKeys.vehicles.all(), 'list', params] as const,
    detail: (id: number) => [...maintenanceKeys.vehicles.all(), 'detail', id] as const,
    dashboard: (id: number) => [...maintenanceKeys.vehicles.all(), 'dashboard', id] as const,
  },
  serviceRecords: {
    all: () => [...maintenanceKeys.all, 'serviceRecords'] as const,
    list: (params?: ServiceRecordsQueryParams) => [...maintenanceKeys.serviceRecords.all(), 'list', params] as const,
    detail: (id: number) => [...maintenanceKeys.serviceRecords.all(), 'detail', id] as const,
    attachments: (serviceRecordId: number) =>
      [...maintenanceKeys.serviceRecords.all(), 'attachments', serviceRecordId] as const,
  },
  serviceTypes: {
    all: () => [...maintenanceKeys.all, 'serviceTypes'] as const,
    list: (params?: ServiceTypesQueryParams) => [...maintenanceKeys.serviceTypes.all(), 'list', params] as const,
    detail: (id: number) => [...maintenanceKeys.serviceTypes.all(), 'detail', id] as const,
  },
  shops: {
    all: () => [...maintenanceKeys.all, 'shops'] as const,
    list: (params?: ShopsQueryParams) => [...maintenanceKeys.shops.all(), 'list', params] as const,
    detail: (id: number) => [...maintenanceKeys.shops.all(), 'detail', id] as const,
  },
  reminders: {
    all: () => [...maintenanceKeys.all, 'reminders'] as const,
    list: (params?: RemindersQueryParams) => [...maintenanceKeys.reminders.all(), 'list', params] as const,
    detail: (id: number) => [...maintenanceKeys.reminders.all(), 'detail', id] as const,
  },
  notes: {
    all: () => [...maintenanceKeys.all, 'notes'] as const,
    list: (params?: NotesQueryParams) => [...maintenanceKeys.notes.all(), 'list', params] as const,
    detail: (id: number) => [...maintenanceKeys.notes.all(), 'detail', id] as const,
  },
};

// ============================================================================
// Vehicles Hooks
// ============================================================================

export function useVehicles(params?: VehiclesQueryParams) {
  return useQuery({
    queryKey: maintenanceKeys.vehicles.list(params),
    queryFn: () => maintenanceApi.getVehicles(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: maintenanceKeys.vehicles.detail(id),
    queryFn: () => maintenanceApi.getVehicle(id),
    enabled: id > 0,
  });
}

export function useVehicleDashboard(id: number) {
  return useQuery({
    queryKey: maintenanceKeys.vehicles.dashboard(id),
    queryFn: () => maintenanceApi.getVehicleDashboard(id),
    enabled: id > 0,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleRequest) => maintenanceApi.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Vehicle added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVehicleRequest }) => maintenanceApi.updateVehicle(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.detail(variables.id) });
      toast.success('Vehicle updated');
    },
    onError: (error) => {
      toast.error('Failed to update vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Vehicle deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateVehicleOdometer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOdometerRequest }) =>
      maintenanceApi.updateVehicleOdometer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.dashboard(variables.id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.reminders.all() });
      toast.success('Odometer updated');
    },
    onError: (error) => {
      toast.error('Failed to update odometer', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useArchiveVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.archiveVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Vehicle archived');
    },
    onError: (error) => {
      toast.error('Failed to archive vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUnarchiveVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.unarchiveVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Vehicle restored');
    },
    onError: (error) => {
      toast.error('Failed to restore vehicle', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUploadVehiclePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => maintenanceApi.uploadVehiclePhoto(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Photo uploaded');
    },
    onError: (error) => {
      toast.error('Failed to upload photo', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteVehiclePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteVehiclePhoto(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.detail(id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Photo removed');
    },
    onError: (error) => {
      toast.error('Failed to remove photo', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// ============================================================================
// Service Records Hooks
// ============================================================================

export function useServiceRecords(params?: ServiceRecordsQueryParams) {
  return useQuery({
    queryKey: maintenanceKeys.serviceRecords.list(params),
    queryFn: () => maintenanceApi.getServiceRecords(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useServiceRecord(id: number) {
  return useQuery({
    queryKey: maintenanceKeys.serviceRecords.detail(id),
    queryFn: () => maintenanceApi.getServiceRecord(id),
    enabled: id > 0,
  });
}

export function useCreateServiceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceRecordRequest) => maintenanceApi.createServiceRecord(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceRecords.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.detail(variables.vehicle) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.dashboard(variables.vehicle) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.reminders.all() });
      toast.success('Service record added');
    },
    onError: (error) => {
      toast.error('Failed to add service record', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateServiceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateServiceRecordRequest }) =>
      maintenanceApi.updateServiceRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceRecords.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.reminders.all() });
      toast.success('Service record updated');
    },
    onError: (error) => {
      toast.error('Failed to update service record', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteServiceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteServiceRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceRecords.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Service record deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete service record', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// ============================================================================
// Service Record Attachments Hooks
// ============================================================================

export function useServiceRecordAttachments(serviceRecordId: number) {
  return useQuery({
    queryKey: maintenanceKeys.serviceRecords.attachments(serviceRecordId),
    queryFn: () => maintenanceApi.getServiceRecordAttachments(serviceRecordId),
    enabled: serviceRecordId > 0,
  });
}

export function useCreateServiceRecordAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceRecordId, data }: { serviceRecordId: number; data: CreateAttachmentRequest }) =>
      maintenanceApi.createServiceRecordAttachment(serviceRecordId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: maintenanceKeys.serviceRecords.attachments(variables.serviceRecordId),
      });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceRecords.detail(variables.serviceRecordId) });
      toast.success('Attachment added');
    },
    onError: (error) => {
      toast.error('Failed to add attachment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteServiceRecordAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceRecordId, attachmentId }: { serviceRecordId: number; attachmentId: number }) =>
      maintenanceApi.deleteServiceRecordAttachment(serviceRecordId, attachmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: maintenanceKeys.serviceRecords.attachments(variables.serviceRecordId),
      });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceRecords.detail(variables.serviceRecordId) });
      toast.success('Attachment deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete attachment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUploadServiceRecordAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceRecordId, file }: { serviceRecordId: number; file: File }) =>
      maintenanceApi.uploadServiceRecordAttachment(serviceRecordId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: maintenanceKeys.serviceRecords.attachments(variables.serviceRecordId),
      });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceRecords.detail(variables.serviceRecordId) });
      toast.success('File uploaded');
    },
    onError: (error) => {
      toast.error('Failed to upload file', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// ============================================================================
// Service Types Hooks
// ============================================================================

export function useServiceTypes(params?: ServiceTypesQueryParams) {
  return useQuery({
    queryKey: maintenanceKeys.serviceTypes.list(params),
    queryFn: () => maintenanceApi.getServiceTypes(params),
    staleTime: 30 * 60 * 1000, // 30 minutes - service types don't change often
  });
}

export function useCreateServiceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceTypeRequest) => maintenanceApi.createServiceType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceTypes.all() });
      toast.success('Service type created');
    },
    onError: (error) => {
      toast.error('Failed to create service type', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateServiceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateServiceTypeRequest }) =>
      maintenanceApi.updateServiceType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceTypes.all() });
      toast.success('Service type updated');
    },
    onError: (error) => {
      toast.error('Failed to update service type', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteServiceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteServiceType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.serviceTypes.all() });
      toast.success('Service type deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete service type', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// ============================================================================
// Shops Hooks
// ============================================================================

export function useShops(params?: ShopsQueryParams) {
  return useQuery({
    queryKey: maintenanceKeys.shops.list(params),
    queryFn: () => maintenanceApi.getShops(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useShop(id: number) {
  return useQuery({
    queryKey: maintenanceKeys.shops.detail(id),
    queryFn: () => maintenanceApi.getShop(id),
    enabled: id > 0,
  });
}

export function useCreateShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShopRequest) => maintenanceApi.createShop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.shops.all() });
      toast.success('Shop added');
    },
    onError: (error) => {
      toast.error('Failed to add shop', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateShopRequest }) => maintenanceApi.updateShop(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.shops.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.shops.detail(variables.id) });
      toast.success('Shop updated');
    },
    onError: (error) => {
      toast.error('Failed to update shop', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteShop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.shops.all() });
      toast.success('Shop deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete shop', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// ============================================================================
// Reminders Hooks
// ============================================================================

export function useReminders(params?: RemindersQueryParams) {
  return useQuery({
    queryKey: maintenanceKeys.reminders.list(params),
    queryFn: () => maintenanceApi.getReminders(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReminder(id: number) {
  return useQuery({
    queryKey: maintenanceKeys.reminders.detail(id),
    queryFn: () => maintenanceApi.getReminder(id),
    enabled: id > 0,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReminderRequest) => maintenanceApi.createReminder(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.reminders.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.dashboard(variables.vehicle) });
      toast.success('Reminder created');
    },
    onError: (error) => {
      toast.error('Failed to create reminder', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateReminderRequest }) => maintenanceApi.updateReminder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.reminders.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Reminder updated');
    },
    onError: (error) => {
      toast.error('Failed to update reminder', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.reminders.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Reminder deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete reminder', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.completeReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.reminders.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.all() });
      toast.success('Reminder marked as complete');
    },
    onError: (error) => {
      toast.error('Failed to complete reminder', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// ============================================================================
// Notes Hooks
// ============================================================================

export function useNotes(params?: NotesQueryParams) {
  return useQuery({
    queryKey: maintenanceKeys.notes.list(params),
    queryFn: () => maintenanceApi.getNotes(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNote(id: number) {
  return useQuery({
    queryKey: maintenanceKeys.notes.detail(id),
    queryFn: () => maintenanceApi.getNote(id),
    enabled: id > 0,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNoteRequest) => maintenanceApi.createNote(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.notes.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.vehicles.dashboard(variables.vehicle) });
      toast.success('Note added');
    },
    onError: (error) => {
      toast.error('Failed to add note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateNoteRequest }) => maintenanceApi.updateNote(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.notes.all() });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.notes.detail(variables.id) });
      toast.success('Note updated');
    },
    onError: (error) => {
      toast.error('Failed to update note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.notes.all() });
      toast.success('Note deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUploadNoteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => maintenanceApi.uploadNoteImage(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.notes.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.notes.all() });
      toast.success('Image uploaded');
    },
    onError: (error) => {
      toast.error('Failed to upload image', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteNoteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => maintenanceApi.deleteNoteImage(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.notes.detail(id) });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.notes.all() });
      toast.success('Image removed');
    },
    onError: (error) => {
      toast.error('Failed to remove image', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
