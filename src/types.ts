export type OrderType = "ekspor" | "impor" | "repo";
export type OrderStatus = "open" | "in_progress" | "done";
export type TripStatus = "pre_trip" | "on_trip" | "end_trip";
export type UnitStatus = "utilized" | "standby" | "downtime";

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  customer: string;
  origin: string;
  destination: string;
  unitType: string;
  eta: string;
  source?: string;
  bookingDate?: string;
  quantity?: number;
  notes?: string;
}

export interface Shipment {
  id: string;
  orderRef: string;
  type: OrderType;
  tripStatus: TripStatus;
  unit: string;
  driver: string;
  currentLocation: string;
  eta: string;
  customer?: string;
  quantity?: number;
}

export interface FleetUnit {
  unitId: string;
  unitType: string;
  status: UnitStatus;
  lastLocation: string;
  lastUpdate: string;
  downtimeCategory?: string;
}
