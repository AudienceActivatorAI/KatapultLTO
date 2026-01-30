export interface CartItem {
  id: string;
  type: 'tire' | 'wheel';
  brand: string;
  model: string;
  sku: string;
  price: number;
  image: string;
  description: string;
  quantity: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  image?: string;
  price: number;
  quantity: number;
  type: 'tire' | 'wheel';
  details: Record<string, any>;
}

export interface CheckoutData {
  products: Product[];
  vehicle: {
    year: number;
    make: string;
    model: string;
  };
  total: number;
}
