"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { cartService, type CartItem } from "@/services/cartService";

interface CartContextType {
  cartItems: CartItem[];
  isLoading: boolean;
  totalItems: number;
  addToCart: (product: Omit<CartItem, "quantity">) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCart = async () => {
    try {
      const items = await cartService.getCart();
      setCartItems(items);
    } catch (error) {
      console.error("Failed to load cart:", error);
      toast.error("Failed to load cart");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const addToCart = async (product: Omit<CartItem, "quantity">) => {
    try {
      await cartService.addItem(product);
      await loadCart();
      toast.success("Added to cart");
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      await cartService.updateQuantity(itemId, quantity);
      await loadCart();
    } catch (error) {
      console.error("Failed to update quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await cartService.removeItem(itemId);
      await loadCart();
      toast.success("Removed from cart");
    } catch (error) {
      console.error("Failed to remove item:", error);
      toast.error("Failed to remove item");
    }
  };

  const clearCart = async () => {
    try {
      await cartService.clearCart();
      setCartItems([]);
      toast.success("Cart cleared");
    } catch (error) {
      console.error("Failed to clear cart:", error);
      toast.error("Failed to clear cart");
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isLoading,
        totalItems,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}

export type { CartItem };
