import type { CartItem } from "@/types";

const CART_STORAGE_KEY = "katapult_cart";

class CartService {
  async getCart(): Promise<CartItem[]> {
    try {
      if (typeof window === "undefined") return [];
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to get local cart:", error);
      return [];
    }
  }

  private saveCart(items: CartItem[]): void {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save local cart:", error);
    }
  }

  async addItem(product: Omit<CartItem, "quantity">): Promise<void> {
    const items = await this.getCart();
    const existingIndex = items.findIndex((item) => item.id === product.id);

    if (existingIndex >= 0) {
      items[existingIndex].quantity += 1;
    } else {
      items.push({ ...product, quantity: 1 });
    }

    this.saveCart(items);
  }

  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    const items = await this.getCart();
    const index = items.findIndex((item) => item.id === itemId);

    if (index >= 0) {
      if (quantity <= 0) {
        items.splice(index, 1);
      } else {
        items[index].quantity = quantity;
      }
      this.saveCart(items);
    }
  }

  async removeItem(itemId: string): Promise<void> {
    const items = await this.getCart();
    const filtered = items.filter((item) => item.id !== itemId);
    this.saveCart(filtered);
  }

  async clearCart(): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}

export const cartService = new CartService();
