export interface VehicleEarnings {
  id: string;
  vehicleId: string;
  date: string;
  amount: number;
  source: string; // e.g., "Trip", "Rental", "Delivery"
  description?: string;
  period: 'Daily' | 'Weekly' | 'Monthly';
  createdAt?: string;
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  date: string;
  amount: number;
  category: string; // e.g., "Fuel", "Maintenance", "Insurance", "Repairs"
  description?: string;
  invoiceNumber?: string;
  vendor?: string;
  createdAt?: string;
}

export interface CreateVehicleEarningsCommand {
  vehicleId: string;
  date: string;
  amount: number;
  source: string;
  description?: string;
  period: 'Daily' | 'Weekly' | 'Monthly';
}

export type CreateVehicleEarnings = CreateVehicleEarningsCommand;

export interface CreateVehicleExpenseCommand {
  vehicleId: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  invoiceNumber?: string;
  vendor?: string;
}

export type CreateVehicleExpense = CreateVehicleExpenseCommand;

export interface VehicleProfitabilityReport {
  vehicleId: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalEarnings: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number; // percentage
  earningsBreakdown: {
    source: string;
    amount: number;
    percentage: number;
  }[];
  expensesBreakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  isProfitable: boolean;
}
