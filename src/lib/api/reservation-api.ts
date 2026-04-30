import { frappeFetch } from '../frappe-sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getList(
  doctype: string,
  fields: string[],
  filters: any[] = [],
  limit = 500,
  orderBy = ''
): Promise<any[]> {
  const params = new URLSearchParams({
    fields:            JSON.stringify(fields),
    filters:           JSON.stringify(filters),
    limit_page_length: String(limit),
  });
  if (orderBy) params.set('order_by', orderBy);
  const res = await frappeFetch(`/api/resource/${encodeURIComponent(doctype)}?${params}`);
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

async function postDoc(doctype: string, data: Record<string, any>): Promise<any> {
  const res = await frappeFetch(`/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.exception ??
      (json?._server_messages ? (() => { try { return JSON.parse(json._server_messages)?.[0]?.message; } catch { return null; } })() : null) ??
      `Failed (${res.status})`;
    throw new Error(msg);
  }
  return json.data;
}

async function putDoc(doctype: string, name: string, data: Record<string, any>): Promise<any> {
  const res = await frappeFetch(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.exception ?? `Update failed (${res.status})`);
  }
  return json.data;
}

async function deleteDoc(doctype: string, name: string): Promise<void> {
  const res = await frappeFetch(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.exception ?? `Delete failed (${res.status})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Reservation {
  name: string;
  customer_name: string;
  email_address: string;
  phone_number: string;
  party_size: string;
  reservation_date: string;
  reservation_time: string;
  duration: string;
  status: string;
  assigned_table: string;
  special_requests: string;
}

export interface ReservationForm {
  customer_name: string;
  email_address: string;
  phone_number: string;
  party_size: string;
  reservation_date: string;
  reservation_time: string;
  duration: string;
  status: string;
  assigned_table: string;
  special_requests: string;
}

export interface URYTable {
  name: string;
  table_name?: string;
  no_of_seats: number;
  seating_capacity?: number;
  minimum_seating: number;
  restaurant_room: string;   // room name = "floor" label
  occupied: number;
  is_take_away: number;
  table_shape: string;
  status?: string;
}

export interface WaitlistEntry {
  name: string;
  customer_name: string;
  party_size: string;
  phone_number: string;
  estimated_wait: string;
  special_requests: string;
  status: string;
}

export interface WaitlistForm {
  customer_name: string;
  party_size: string;
  phone_number: string;
  estimated_wait: string;
  special_requests: string;
}

export interface ReservationSettings {
  opening_time: string;
  closing_time: string;
  default_reservation_duration: string;
  time_slot_interval: string;
  maximum_party_size: string;
  advance_booking_limit: string;
  all_same_day_booking: number;
  require_phone_number: number;
  auto_confirm_reservation: number;
  enable_waitlist: number;
  maximum_waitlist_size: string;
}

const DEFAULT_SETTINGS: ReservationSettings = {
  opening_time: '12:00:00',
  closing_time: '22:00:00',
  default_reservation_duration: '120 minutes',
  time_slot_interval: '15',
  maximum_party_size: '10 Guests',
  advance_booking_limit: '1 month',
  all_same_day_booking: 1,
  require_phone_number: 0,
  auto_confirm_reservation: 1,
  enable_waitlist: 1,
  maximum_waitlist_size: '20 customers',
};

// ─────────────────────────────────────────────────────────────────────────────
// Reservations
// ─────────────────────────────────────────────────────────────────────────────

export const getReservations = async (filters: any[] = []): Promise<Reservation[]> => {
  // Add filter to exclude settings documents from reservations list
  const allFilters = [
    ['name', 'not like', '%-SETTINGS-%'],  // Exclude settings documents
    ...filters
  ];
  
  return getList(
    'Restaurant Reservation',
    ['name','customer_name','email_address','phone_number','party_size',
     'reservation_date','reservation_time','duration','status','assigned_table','special_requests'],
    allFilters,
    1000,
    'reservation_date desc, reservation_time desc'
  ) as Promise<Reservation[]>;
};

export const getReservationsForDate = (date: string) =>
  getReservations([['reservation_date', '=', date]]);

export const createReservation = (data: ReservationForm) =>
  postDoc('Restaurant Reservation', data);

export const updateReservation = (name: string, data: Partial<ReservationForm>) =>
  putDoc('Restaurant Reservation', name, data);

export const deleteReservation = (name: string) =>
  deleteDoc('Restaurant Reservation', name);

// ─────────────────────────────────────────────────────────────────────────────
// Tables  (URY Table doctype)
// ─────────────────────────────────────────────────────────────────────────────

export const getTables = async (): Promise<URYTable[]> => {
  return getList(
    'URY Table',
    ['name','no_of_seats','minimum_seating','restaurant_room','occupied','is_take_away','table_shape'],
    [],
    500,
    'name asc'
  ) as Promise<URYTable[]>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Waitlist  (Restaurant Waitlist doctype)
// ─────────────────────────────────────────────────────────────────────────────

export const getWaitlist = async (): Promise<WaitlistEntry[]> => {
  return getList(
    'Restaurant Waitlist',
    ['name','customer_name','party_size','phone_number','estimated_wait','special_requests','status'],
    [],  // Remove status filter to show all waitlist entries
    200,
    'creation asc'
  ) as Promise<WaitlistEntry[]>;
};

export const addToWaitlist = (data: WaitlistForm) =>
  postDoc('Restaurant Waitlist', { ...data, status: 'Waiting' });

export const updateWaitlistStatus = (name: string, status: string) =>
  putDoc('Restaurant Waitlist', name, { status });

export const deleteWaitlistEntry = (name: string) =>
  deleteDoc('Restaurant Waitlist', name);

// ─────────────────────────────────────────────────────────────────────────────
// Settings  (Restaurant Settings — Single DocType)
// ─────────────────────────────────────────────────────────────────────────────

export const getSettings = async (): Promise<ReservationSettings> => {
  try {
    // Try to get settings from a dedicated settings document first
    // We'll use a naming convention to identify settings documents
    const docs = await getList('Restaurant Reservation', 
      ['name','opening_time','closing_time','default_reservation_duration','time_slot_interval','maximum_party_size','advance_booking_limit','all_same_day_booking','require_phone_number','auto_confirm_reservation','enable_waitlist','maximum_waitlist_size'], 
      [['name', 'like', '%-SETTINGS-%']],  // Look for settings documents by naming pattern
      1
    );
    if (docs.length > 0) {
      return { ...DEFAULT_SETTINGS, ...docs[0] } as ReservationSettings;
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (data: ReservationSettings): Promise<void> => {
  try {
    // Try to get existing settings document first
    const docs = await getList('Restaurant Reservation', 
      ['name'], 
      [['name', 'like', '%-SETTINGS-%']], 
      1
    );
    
    // Create a settings document with all required fields filled
    const settingsData = {
      customer_name: 'SYSTEM SETTINGS',  // Required field
      reservation_date: new Date().toISOString().split('T')[0],  // Required field
      reservation_time: '12:00:00',  // Required field
      party_size: '1 Guest',  // Required field
      status: 'Completed',  // Required field
      opening_time: data.opening_time,
      closing_time: data.closing_time,
      default_reservation_duration: data.default_reservation_duration,
      time_slot_interval: data.time_slot_interval,
      maximum_party_size: data.maximum_party_size,
      advance_booking_limit: data.advance_booking_limit,
      all_same_day_booking: data.all_same_day_booking,
      require_phone_number: data.require_phone_number,
      auto_confirm_reservation: data.auto_confirm_reservation,
      enable_waitlist: data.enable_waitlist,
      maximum_waitlist_size: data.maximum_waitlist_size,
    };
    
    if (docs.length > 0) {
      // Update existing settings document
      await putDoc('Restaurant Reservation', docs[0].name, settingsData);
    } else {
      // Create a new settings document with a special name
      await postDoc('Restaurant Reservation', settingsData);
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Time slot generator (used in New Reservation modal)
// ─────────────────────────────────────────────────────────────────────────────

export const generateTimeSlotsFromSettings = (settings: ReservationSettings): string[] => {
  return generateTimeSlots(
    settings.opening_time,
    settings.closing_time,
    parseInt(settings.time_slot_interval)
  );
};

export const generateTimeSlots = (
  openingTime: string,
  closingTime: string,
  intervalMins: number
): string[] => {
  const slots: string[] = [];
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const toTime = (mins: number) => {
    const h = Math.floor(mins / 60) %24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };

  let cur  = toMins(openingTime);
  const end = toMins(closingTime);
  while (cur <= end) {
    slots.push(toTime(cur));
    cur += intervalMins;
  }
  return slots;
};
