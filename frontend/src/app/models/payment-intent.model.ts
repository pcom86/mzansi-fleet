export interface PaymentIntent {
  id: string;
  payerId: string;
  amount: number;
  currency?: string;
  state?: string;
  createdAt: Date;
}

export interface CreatePaymentIntentCommand {
  payerId: string;
  amount: number;
  currency?: string;
  state?: string;
  createdAt: Date;
}
