/**
 * Vehicle Maintenance Tracker API Client
 *
 * Axios-based API client for the vehicle maintenance tracker backend.
 * All requests use session authentication (configured in axios interceptor).
 */

import { lifeAppApi } from '@/lib/axios';
import type {
  CreateAttachmentRequest,
  CreateNoteRequest,
  CreateReminderRequest,
  CreateServiceRecordRequest,
  CreateServiceTypeRequest,
  CreateShopRequest,
  CreateVehicleRequest,
  Note,
  NoteSummary,
  NotesQueryParams,
  PaginatedResponse,
  ReminderDetail,
  ReminderSummary,
  RemindersQueryParams,
  ServiceRecord,
  ServiceRecordAttachment,
  ServiceRecordDetail,
  ServiceRecordsQueryParams,
  ServiceType,
  ServiceTypesQueryParams,
  Shop,
  ShopDetail,
  ShopsQueryParams,
  UpdateNoteRequest,
  UpdateOdometerRequest,
  UpdateReminderRequest,
  UpdateServiceRecordRequest,
  UpdateServiceTypeRequest,
  UpdateShopRequest,
  UpdateVehicleRequest,
  Vehicle,
  VehicleDashboard,
  VehicleDetail,
  VehiclesQueryParams,
} from '@/types/maintenance';

// API Base Path
const BASE_PATH = '/maintenance';

// ============================================================================
// Vehicles API
// ============================================================================

/**
 * List all vehicles with optional filtering
 */
export async function getVehicles(params?: VehiclesQueryParams): Promise<PaginatedResponse<Vehicle>> {
  const apiParams = params
    ? {
        is_archived: params.isArchived,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<Vehicle>>(`${BASE_PATH}/vehicles/`, { params: apiParams });
  return response.data;
}

/**
 * Get single vehicle with details
 */
export async function getVehicle(id: number): Promise<VehicleDetail> {
  const response = await lifeAppApi.get<VehicleDetail>(`${BASE_PATH}/vehicles/${id}/`);
  return response.data;
}

/**
 * Create new vehicle
 */
export async function createVehicle(data: CreateVehicleRequest): Promise<VehicleDetail> {
  const response = await lifeAppApi.post<VehicleDetail>(`${BASE_PATH}/vehicles/`, data);
  return response.data;
}

/**
 * Update existing vehicle
 */
export async function updateVehicle(id: number, data: UpdateVehicleRequest): Promise<VehicleDetail> {
  const response = await lifeAppApi.patch<VehicleDetail>(`${BASE_PATH}/vehicles/${id}/`, data);
  return response.data;
}

/**
 * Delete vehicle (soft delete)
 */
export async function deleteVehicle(id: number): Promise<void> {
  await lifeAppApi.delete(`${BASE_PATH}/vehicles/${id}/`);
}

/**
 * Update vehicle odometer
 */
export async function updateVehicleOdometer(id: number, data: UpdateOdometerRequest): Promise<VehicleDetail> {
  const response = await lifeAppApi.post<VehicleDetail>(`${BASE_PATH}/vehicles/${id}/update_odometer/`, data);
  return response.data;
}

/**
 * Archive vehicle
 */
export async function archiveVehicle(id: number): Promise<VehicleDetail> {
  const response = await lifeAppApi.post<VehicleDetail>(`${BASE_PATH}/vehicles/${id}/archive/`);
  return response.data;
}

/**
 * Unarchive vehicle
 */
export async function unarchiveVehicle(id: number): Promise<VehicleDetail> {
  const response = await lifeAppApi.post<VehicleDetail>(`${BASE_PATH}/vehicles/${id}/unarchive/`);
  return response.data;
}

/**
 * Get vehicle dashboard data
 */
export async function getVehicleDashboard(id: number): Promise<VehicleDashboard> {
  const response = await lifeAppApi.get<VehicleDashboard>(`${BASE_PATH}/vehicles/${id}/dashboard/`);
  return response.data;
}

/**
 * Upload vehicle photo
 */
export async function uploadVehiclePhoto(id: number, file: File): Promise<VehicleDetail> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await lifeAppApi.post<VehicleDetail>(`${BASE_PATH}/vehicles/${id}/upload_photo/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Delete vehicle photo
 */
export async function deleteVehiclePhoto(id: number): Promise<VehicleDetail> {
  const response = await lifeAppApi.delete<VehicleDetail>(`${BASE_PATH}/vehicles/${id}/photo/`);
  return response.data;
}

// ============================================================================
// Service Records API
// ============================================================================

/**
 * List all service records with optional filtering
 */
export async function getServiceRecords(params?: ServiceRecordsQueryParams): Promise<PaginatedResponse<ServiceRecord>> {
  const apiParams = params
    ? {
        vehicle: params.vehicle,
        service_type: params.serviceType,
        shop: params.shop,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<ServiceRecord>>(`${BASE_PATH}/service-records/`, {
    params: apiParams,
  });
  return response.data;
}

/**
 * Get single service record with details
 */
export async function getServiceRecord(id: number): Promise<ServiceRecordDetail> {
  const response = await lifeAppApi.get<ServiceRecordDetail>(`${BASE_PATH}/service-records/${id}/`);
  return response.data;
}

/**
 * Create new service record
 */
export async function createServiceRecord(data: CreateServiceRecordRequest): Promise<ServiceRecordDetail> {
  const apiData = {
    vehicle: data.vehicle,
    service_type: data.serviceType,
    shop: data.shop,
    date: data.date,
    odometer: data.odometer,
    parts_cost: data.partsCost,
    labor_cost: data.laborCost,
    notes: data.notes,
  };
  const response = await lifeAppApi.post<ServiceRecordDetail>(`${BASE_PATH}/service-records/`, apiData);
  return response.data;
}

/**
 * Update existing service record
 */
export async function updateServiceRecord(id: number, data: UpdateServiceRecordRequest): Promise<ServiceRecordDetail> {
  const apiData: Record<string, unknown> = {};
  if (data.vehicle !== undefined) apiData.vehicle = data.vehicle;
  if (data.serviceType !== undefined) apiData.service_type = data.serviceType;
  if (data.shop !== undefined) apiData.shop = data.shop;
  if (data.date !== undefined) apiData.date = data.date;
  if (data.odometer !== undefined) apiData.odometer = data.odometer;
  if (data.partsCost !== undefined) apiData.parts_cost = data.partsCost;
  if (data.laborCost !== undefined) apiData.labor_cost = data.laborCost;
  if (data.notes !== undefined) apiData.notes = data.notes;

  const response = await lifeAppApi.patch<ServiceRecordDetail>(`${BASE_PATH}/service-records/${id}/`, apiData);
  return response.data;
}

/**
 * Delete service record (soft delete)
 */
export async function deleteServiceRecord(id: number): Promise<void> {
  await lifeAppApi.delete(`${BASE_PATH}/service-records/${id}/`);
}

// ============================================================================
// Service Record Attachments API
// ============================================================================

/**
 * List attachments for a service record
 */
export async function getServiceRecordAttachments(
  serviceRecordId: number
): Promise<PaginatedResponse<ServiceRecordAttachment>> {
  const response = await lifeAppApi.get<PaginatedResponse<ServiceRecordAttachment>>(
    `${BASE_PATH}/service-records/${serviceRecordId}/attachments/`
  );
  return response.data;
}

/**
 * Create attachment for a service record (from existing URL)
 */
export async function createServiceRecordAttachment(
  serviceRecordId: number,
  data: CreateAttachmentRequest
): Promise<ServiceRecordAttachment> {
  const apiData = {
    file_url: data.fileUrl,
    file_name: data.fileName,
    file_size: data.fileSize,
    content_type: data.contentType,
  };
  const response = await lifeAppApi.post<ServiceRecordAttachment>(
    `${BASE_PATH}/service-records/${serviceRecordId}/attachments/`,
    apiData
  );
  return response.data;
}

/**
 * Upload file and create attachment for a service record
 */
export async function uploadServiceRecordAttachment(
  serviceRecordId: number,
  file: File
): Promise<ServiceRecordAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await lifeAppApi.post<ServiceRecordAttachment>(
    `${BASE_PATH}/service-records/${serviceRecordId}/attachments/upload/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

/**
 * Delete attachment
 */
export async function deleteServiceRecordAttachment(serviceRecordId: number, attachmentId: number): Promise<void> {
  await lifeAppApi.delete(`${BASE_PATH}/service-records/${serviceRecordId}/attachments/${attachmentId}/`);
}

// ============================================================================
// Service Types API
// ============================================================================

/**
 * List all service types (system + user's custom)
 */
export async function getServiceTypes(params?: ServiceTypesQueryParams): Promise<PaginatedResponse<ServiceType>> {
  const apiParams = params
    ? {
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<ServiceType>>(`${BASE_PATH}/service-types/`, {
    params: apiParams,
  });
  return response.data;
}

/**
 * Get single service type
 */
export async function getServiceType(id: number): Promise<ServiceType> {
  const response = await lifeAppApi.get<ServiceType>(`${BASE_PATH}/service-types/${id}/`);
  return response.data;
}

/**
 * Create custom service type
 */
export async function createServiceType(data: CreateServiceTypeRequest): Promise<ServiceType> {
  const apiData = {
    name: data.name,
    description: data.description,
    display_order: data.displayOrder,
  };
  const response = await lifeAppApi.post<ServiceType>(`${BASE_PATH}/service-types/`, apiData);
  return response.data;
}

/**
 * Update custom service type
 */
export async function updateServiceType(id: number, data: UpdateServiceTypeRequest): Promise<ServiceType> {
  const apiData: Record<string, unknown> = {};
  if (data.name !== undefined) apiData.name = data.name;
  if (data.description !== undefined) apiData.description = data.description;
  if (data.displayOrder !== undefined) apiData.display_order = data.displayOrder;

  const response = await lifeAppApi.patch<ServiceType>(`${BASE_PATH}/service-types/${id}/`, apiData);
  return response.data;
}

/**
 * Delete custom service type (soft delete)
 */
export async function deleteServiceType(id: number): Promise<void> {
  await lifeAppApi.delete(`${BASE_PATH}/service-types/${id}/`);
}

// ============================================================================
// Shops API
// ============================================================================

/**
 * List all user's shops
 */
export async function getShops(params?: ShopsQueryParams): Promise<PaginatedResponse<Shop>> {
  const apiParams = params
    ? {
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<Shop>>(`${BASE_PATH}/shops/`, { params: apiParams });
  return response.data;
}

/**
 * Get single shop with details
 */
export async function getShop(id: number): Promise<ShopDetail> {
  const response = await lifeAppApi.get<ShopDetail>(`${BASE_PATH}/shops/${id}/`);
  return response.data;
}

/**
 * Create new shop
 */
export async function createShop(data: CreateShopRequest): Promise<ShopDetail> {
  const apiData = {
    name: data.name,
    address: data.address,
    phone: data.phone,
    google_place_id: data.googlePlaceId,
    display_order: data.displayOrder,
  };
  const response = await lifeAppApi.post<ShopDetail>(`${BASE_PATH}/shops/`, apiData);
  return response.data;
}

/**
 * Update existing shop
 */
export async function updateShop(id: number, data: UpdateShopRequest): Promise<ShopDetail> {
  const apiData: Record<string, unknown> = {};
  if (data.name !== undefined) apiData.name = data.name;
  if (data.address !== undefined) apiData.address = data.address;
  if (data.phone !== undefined) apiData.phone = data.phone;
  if (data.googlePlaceId !== undefined) apiData.google_place_id = data.googlePlaceId;
  if (data.displayOrder !== undefined) apiData.display_order = data.displayOrder;

  const response = await lifeAppApi.patch<ShopDetail>(`${BASE_PATH}/shops/${id}/`, apiData);
  return response.data;
}

/**
 * Delete shop (soft delete)
 */
export async function deleteShop(id: number): Promise<void> {
  await lifeAppApi.delete(`${BASE_PATH}/shops/${id}/`);
}

// ============================================================================
// Reminders API
// ============================================================================

/**
 * List all reminders with optional filtering
 */
export async function getReminders(params?: RemindersQueryParams): Promise<PaginatedResponse<ReminderSummary>> {
  const apiParams = params
    ? {
        vehicle: params.vehicle,
        service_type: params.serviceType,
        status: params.status,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<ReminderSummary>>(`${BASE_PATH}/reminders/`, {
    params: apiParams,
  });
  return response.data;
}

/**
 * Get single reminder with details
 */
export async function getReminder(id: number): Promise<ReminderDetail> {
  const response = await lifeAppApi.get<ReminderDetail>(`${BASE_PATH}/reminders/${id}/`);
  return response.data;
}

/**
 * Create new reminder
 */
export async function createReminder(data: CreateReminderRequest): Promise<ReminderDetail> {
  const apiData = {
    vehicle: data.vehicle,
    service_type: data.serviceType,
    mileage_interval: data.mileageInterval,
    time_interval_months: data.timeIntervalMonths,
    last_completed_date: data.lastCompletedDate,
    last_completed_odometer: data.lastCompletedOdometer,
    notes: data.notes,
  };
  const response = await lifeAppApi.post<ReminderDetail>(`${BASE_PATH}/reminders/`, apiData);
  return response.data;
}

/**
 * Update existing reminder
 */
export async function updateReminder(id: number, data: UpdateReminderRequest): Promise<ReminderDetail> {
  const apiData: Record<string, unknown> = {};
  if (data.vehicle !== undefined) apiData.vehicle = data.vehicle;
  if (data.serviceType !== undefined) apiData.service_type = data.serviceType;
  if (data.mileageInterval !== undefined) apiData.mileage_interval = data.mileageInterval;
  if (data.timeIntervalMonths !== undefined) apiData.time_interval_months = data.timeIntervalMonths;
  if (data.lastCompletedDate !== undefined) apiData.last_completed_date = data.lastCompletedDate;
  if (data.lastCompletedOdometer !== undefined) apiData.last_completed_odometer = data.lastCompletedOdometer;
  if (data.notes !== undefined) apiData.notes = data.notes;

  const response = await lifeAppApi.patch<ReminderDetail>(`${BASE_PATH}/reminders/${id}/`, apiData);
  return response.data;
}

/**
 * Delete reminder (soft delete)
 */
export async function deleteReminder(id: number): Promise<void> {
  await lifeAppApi.delete(`${BASE_PATH}/reminders/${id}/`);
}

/**
 * Mark reminder as complete with current date/odometer
 */
export async function completeReminder(id: number): Promise<ReminderDetail> {
  const response = await lifeAppApi.post<ReminderDetail>(`${BASE_PATH}/reminders/${id}/complete/`);
  return response.data;
}

// ============================================================================
// Notes API
// ============================================================================

/**
 * List all notes with optional filtering
 */
export async function getNotes(params?: NotesQueryParams): Promise<PaginatedResponse<NoteSummary>> {
  const apiParams = params
    ? {
        vehicle: params.vehicle,
        search: params.search,
        ordering: params.ordering,
        limit: params.limit,
        cursor: params.cursor,
      }
    : undefined;

  const response = await lifeAppApi.get<PaginatedResponse<NoteSummary>>(`${BASE_PATH}/notes/`, { params: apiParams });
  return response.data;
}

/**
 * Get single note
 */
export async function getNote(id: number): Promise<Note> {
  const response = await lifeAppApi.get<Note>(`${BASE_PATH}/notes/${id}/`);
  return response.data;
}

/**
 * Create new note
 */
export async function createNote(data: CreateNoteRequest): Promise<Note> {
  const apiData = {
    vehicle: data.vehicle,
    content: data.content,
    odometer: data.odometer,
    image_url: data.imageUrl,
  };
  const response = await lifeAppApi.post<Note>(`${BASE_PATH}/notes/`, apiData);
  return response.data;
}

/**
 * Update existing note
 */
export async function updateNote(id: number, data: UpdateNoteRequest): Promise<Note> {
  const apiData: Record<string, unknown> = {};
  if (data.vehicle !== undefined) apiData.vehicle = data.vehicle;
  if (data.content !== undefined) apiData.content = data.content;
  if (data.odometer !== undefined) apiData.odometer = data.odometer;
  if (data.imageUrl !== undefined) apiData.image_url = data.imageUrl;

  const response = await lifeAppApi.patch<Note>(`${BASE_PATH}/notes/${id}/`, apiData);
  return response.data;
}

/**
 * Delete note (soft delete)
 */
export async function deleteNote(id: number): Promise<void> {
  await lifeAppApi.delete(`${BASE_PATH}/notes/${id}/`);
}

/**
 * Upload note image
 */
export async function uploadNoteImage(id: number, file: File): Promise<Note> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await lifeAppApi.post<Note>(`${BASE_PATH}/notes/${id}/upload_image/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Delete note image
 */
export async function deleteNoteImage(id: number): Promise<Note> {
  const response = await lifeAppApi.delete<Note>(`${BASE_PATH}/notes/${id}/image/`);
  return response.data;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get service records for a specific vehicle
 */
export async function getVehicleServiceRecords(
  vehicleId: number,
  params?: Omit<ServiceRecordsQueryParams, 'vehicle'>
): Promise<PaginatedResponse<ServiceRecord>> {
  return getServiceRecords({ ...params, vehicle: vehicleId });
}

/**
 * Get reminders for a specific vehicle
 */
export async function getVehicleReminders(
  vehicleId: number,
  params?: Omit<RemindersQueryParams, 'vehicle'>
): Promise<PaginatedResponse<ReminderSummary>> {
  return getReminders({ ...params, vehicle: vehicleId });
}

/**
 * Get notes for a specific vehicle
 */
export async function getVehicleNotes(
  vehicleId: number,
  params?: Omit<NotesQueryParams, 'vehicle'>
): Promise<PaginatedResponse<NoteSummary>> {
  return getNotes({ ...params, vehicle: vehicleId });
}

/**
 * Get overdue reminders for all vehicles
 */
export async function getOverdueReminders(): Promise<PaginatedResponse<ReminderSummary>> {
  return getReminders({ status: 'overdue', ordering: 'next_due_date' });
}

/**
 * Get due soon reminders for all vehicles
 */
export async function getDueSoonReminders(): Promise<PaginatedResponse<ReminderSummary>> {
  return getReminders({ status: 'due_soon', ordering: 'next_due_date' });
}
