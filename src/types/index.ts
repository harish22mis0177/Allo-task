export type WarehouseWithStock = {
  id: string;
  name: string;
  location: string;
  imageUrl: string | null;
};

export type StockEntry = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reserved: number;
  available: number;
};

export type ProductWithStock = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  sku: string;
  category: string;
  stock: StockEntry[];
  totalAvailable: number;
};

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'RELEASED';

export type ReservationDetail = {
  id: string;
  status: ReservationStatus;
  quantity: number;
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    price: number;
    sku: string;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
};

export type ApiError = {
  error: string;
  code?: string;
};
