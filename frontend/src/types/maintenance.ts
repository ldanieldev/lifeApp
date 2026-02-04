/**
 * TypeScript type definitions for the Vehicle Maintenance Tracker API
 *
 * These types match the backend API responses (camelCase format).
 * All timestamps are ISO 8601 strings.
 */

// ============================================================================
// API Response Types (matching backend serializers)
// ============================================================================

/**
 * Service Type - categories of maintenance services
 */
export interface ServiceType {
  id: number;
  name: string;
  description: string;
  isCustom: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shop - service locations (mechanics, dealers, etc.)
 */
export interface Shop {
  id: number;
  name: string;
  address: string;
  phone: string;
  googlePlaceId: string;
  googleMapsUrl: string | null;
  displayOrder: number;
}

/**
 * Shop detail response - includes service record count
 */
export interface ShopDetail extends Shop {
  hasGoogleMapsLink: boolean;
  serviceRecordCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vehicle - tracked vehicles
 */
export interface Vehicle {
  id: number;
  name: string;
  year: number;
  make: string;
  model: string;
  displayName: string;
  currentOdometer: number;
  photoUrl: string;
  isArchived: boolean;
  displayOrder: number;
}

/**
 * Vehicle detail response - includes upcoming reminders, recent service, and total spent
 */
export interface VehicleDetail extends Vehicle {
  vin: string;
  licensePlate: string;
  engine: string;
  trim: string;
  odometerUpdatedAt: string | null;
  fullDescription: string;
  upcomingReminders: ReminderSummary[];
  recentService: ServiceRecordSummary | null;
  totalSpent: string; // Decimal as string
  createdAt: string;
  updatedAt: string;
}

/**
 * Service Record summary - lightweight version
 */
export interface ServiceRecordSummary {
  id: number;
  date: string;
  odometer: number;
  serviceType: number;
  serviceTypeName: string;
  partsCost: string;
  laborCost: string;
  totalCost: string;
  shop: number | null;
  locationDisplay: string;
  isDiy: boolean;
  attachmentCount: number;
}

/**
 * Service Record - full maintenance record
 */
export interface ServiceRecord extends ServiceRecordSummary {
  vehicle: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service Record detail response - includes nested service type and shop
 */
export interface ServiceRecordDetail {
  id: number;
  vehicle: number;
  vehicleDisplay: string;
  date: string;
  odometer: number;
  serviceType: ServiceType;
  partsCost: string;
  laborCost: string;
  totalCost: string;
  shop: Shop | null;
  isDiy: boolean;
  locationDisplay: string;
  notes: string;
  attachments: ServiceRecordAttachment[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Service Record Attachment - files attached to service records
 */
export interface ServiceRecordAttachment {
  id: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt: string;
}

/**
 * Reminder summary - lightweight version for lists
 */
export interface ReminderSummary {
  id: number;
  serviceType: number;
  serviceTypeName: string;
  mileageInterval: number | null;
  timeIntervalMonths: number | null;
  nextDueDate: string | null;
  nextDueOdometer: number | null;
  status: ReminderStatus;
}

/**
 * Reminder - maintenance reminder
 */
export interface Reminder extends ReminderSummary {
  vehicle: number;
  lastCompletedDate: string | null;
  lastCompletedOdometer: number | null;
  notes: string;
  isManufacturerRecommended: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reminder detail response - includes nested service type
 */
export interface ReminderDetail {
  id: number;
  vehicle: number;
  vehicleDisplay: string;
  serviceType: ServiceType;
  mileageInterval: number | null;
  timeIntervalMonths: number | null;
  lastCompletedDate: string | null;
  lastCompletedOdometer: number | null;
  nextDueDate: string | null;
  nextDueOdometer: number | null;
  status: ReminderStatus;
  notes: string;
  isManufacturerRecommended: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Note summary - lightweight version for lists
 */
export interface NoteSummary {
  id: number;
  contentPreview: string;
  odometer: number | null;
  imageUrl: string;
  createdAt: string;
}

/**
 * Note - vehicle journal entry
 */
export interface Note {
  id: number;
  vehicle: number;
  vehicleDisplay: string;
  content: string;
  odometer: number | null;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vehicle Dashboard - aggregated data for a vehicle
 */
export interface VehicleDashboard {
  vehicle: VehicleDetail;
  overdueReminders: ReminderSummary[];
  upcomingReminders: ReminderSummary[];
  recentServices: ServiceRecordSummary[];
  monthlyCosts: MonthlyCost[];
  yearlyCosts: YearlyCost[];
  totalSpent: string;
}

/**
 * Monthly cost data point
 */
export interface MonthlyCost {
  month: string; // ISO date string
  total: string; // Decimal as string
}

/**
 * Yearly cost data point
 */
export interface YearlyCost {
  year: number;
  total: string; // Decimal as string
}

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Reminder status types
 */
export type ReminderStatus = 'upcoming' | 'due_soon' | 'overdue';

/**
 * Reminder status labels for UI
 */
export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  upcoming: 'Upcoming',
  due_soon: 'Due Soon',
  overdue: 'Overdue',
};

/**
 * Reminder status colors for UI
 */
export const REMINDER_STATUS_COLORS: Record<ReminderStatus, string> = {
  upcoming: '#10B981', // green-500
  due_soon: '#F59E0B', // amber-500
  overdue: '#EF4444', // red-500
};

// ============================================================================
// API Request Types (for mutations)
// ============================================================================

/**
 * Create service type request
 */
export interface CreateServiceTypeRequest {
  name: string;
  description?: string;
  displayOrder?: number;
}

/**
 * Update service type request
 */
export interface UpdateServiceTypeRequest {
  name?: string;
  description?: string;
  displayOrder?: number;
}

/**
 * Create shop request
 */
export interface CreateShopRequest {
  name: string;
  address?: string;
  phone?: string;
  googlePlaceId?: string;
  displayOrder?: number;
}

/**
 * Update shop request
 */
export interface UpdateShopRequest {
  name?: string;
  address?: string;
  phone?: string;
  googlePlaceId?: string;
  displayOrder?: number;
}

/**
 * Create vehicle request
 */
export interface CreateVehicleRequest {
  name?: string;
  year: number;
  make: string;
  model: string;
  vin?: string;
  licensePlate?: string;
  engine?: string;
  trim?: string;
  currentOdometer?: number;
  photoUrl?: string;
  displayOrder?: number;
}

/**
 * Update vehicle request
 */
export interface UpdateVehicleRequest {
  name?: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  licensePlate?: string;
  engine?: string;
  trim?: string;
  currentOdometer?: number;
  photoUrl?: string;
  isArchived?: boolean;
  displayOrder?: number;
}

/**
 * Update odometer request
 */
export interface UpdateOdometerRequest {
  odometer: number;
}

/**
 * Create service record request
 */
export interface CreateServiceRecordRequest {
  vehicle: number;
  serviceType: number;
  shop?: number | null;
  date: string;
  odometer: number;
  partsCost?: string;
  laborCost?: string;
  notes?: string;
}

/**
 * Update service record request
 */
export interface UpdateServiceRecordRequest {
  vehicle?: number;
  serviceType?: number;
  shop?: number | null;
  date?: string;
  odometer?: number;
  partsCost?: string;
  laborCost?: string;
  notes?: string;
}

/**
 * Create attachment request
 */
export interface CreateAttachmentRequest {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Create reminder request
 */
export interface CreateReminderRequest {
  vehicle: number;
  serviceType: number;
  mileageInterval?: number | null;
  timeIntervalMonths?: number | null;
  lastCompletedDate?: string | null;
  lastCompletedOdometer?: number | null;
  notes?: string;
}

/**
 * Update reminder request
 */
export interface UpdateReminderRequest {
  vehicle?: number;
  serviceType?: number;
  mileageInterval?: number | null;
  timeIntervalMonths?: number | null;
  lastCompletedDate?: string | null;
  lastCompletedOdometer?: number | null;
  notes?: string;
}

/**
 * Create note request
 */
export interface CreateNoteRequest {
  vehicle: number;
  content: string;
  odometer?: number | null;
  imageUrl?: string;
}

/**
 * Update note request
 */
export interface UpdateNoteRequest {
  vehicle?: number;
  content?: string;
  odometer?: number | null;
  imageUrl?: string;
}

// ============================================================================
// Paginated Response Type
// ============================================================================

/**
 * Paginated response wrapper
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
 * Vehicles list query parameters
 */
export interface VehiclesQueryParams {
  isArchived?: boolean;
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Service records query parameters
 */
export interface ServiceRecordsQueryParams {
  vehicle?: number;
  serviceType?: number;
  shop?: number;
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Reminders query parameters
 */
export interface RemindersQueryParams {
  vehicle?: number;
  serviceType?: number;
  status?: ReminderStatus;
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Notes query parameters
 */
export interface NotesQueryParams {
  vehicle?: number;
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Shops query parameters
 */
export interface ShopsQueryParams {
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Service types query parameters
 */
export interface ServiceTypesQueryParams {
  search?: string;
  ordering?: string;
  limit?: number;
  cursor?: string;
}

// ============================================================================
// Form Types (React Hook Form + Zod)
// ============================================================================

/**
 * Vehicle form data
 */
export interface VehicleFormData {
  name: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  licensePlate: string;
  engine: string;
  trim: string;
  currentOdometer: number;
}

/**
 * Service record form data
 */
export interface ServiceRecordFormData {
  date: Date;
  odometer: number;
  serviceTypeId: number;
  shopId: number | null;
  partsCost: number;
  laborCost: number;
  notes: string;
}

/**
 * Reminder form data
 */
export interface ReminderFormData {
  serviceTypeId: number;
  mileageInterval: number | null;
  timeIntervalMonths: number | null;
  notes: string;
}

/**
 * Note form data
 */
export interface NoteFormData {
  content: string;
  odometer: number | null;
}

/**
 * Shop form data
 */
export interface ShopFormData {
  name: string;
  address: string;
  phone: string;
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
