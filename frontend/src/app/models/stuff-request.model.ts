export interface StuffRequest {
  id?: string;
  passengerId: string;
  itemDescription: string;
  itemCategory?: string;
  estimatedWeight?: number;
  size?: string;
  pickupLocation: string;
  deliveryLocation: string;
  estimatedDistance?: number;
  requestedPickupDate: string;
  requestedDeliveryDate?: string;
  priority?: string;
  specialInstructions?: string;
  status?: string;
  approvedQuoteId?: string;
  createdAt?: string;
  updatedAt?: string;
  quotes?: StuffQuote[];
}

export interface StuffQuote {
  id?: string;
  stuffRequestId: string;
  ownerId: string;
  vehicleId?: string;
  quotedPrice: number;
  notes?: string;
  estimatedPickupTime?: string;
  estimatedDeliveryTime?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  stuffRequest?: StuffRequest;
}

export interface CreateStuffRequest {
  passengerId: string;
  itemDescription: string;
  itemCategory?: string;
  estimatedWeight?: number;
  size?: string;
  pickupLocation: string;
  deliveryLocation: string;
  estimatedDistance?: number;
  requestedPickupDate: string;
  requestedDeliveryDate?: string;
  priority?: string;
  specialInstructions?: string;
}

export interface CreateStuffQuote {
  stuffRequestId: string;
  ownerId: string;
  vehicleId?: string;
  quotedPrice: number;
  notes?: string;
  estimatedPickupTime?: string;
  estimatedDeliveryTime?: string;
}
