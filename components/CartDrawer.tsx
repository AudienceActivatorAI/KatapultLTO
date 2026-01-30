"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { CartItem } from "@/types";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  open,
  onOpenChange,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08; // 8% tax estimate
  const total = subtotal + tax;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Shopping Cart
            {items.length > 0 && (
              <Badge variant="secondary">{items.length} {items.length === 1 ? 'item' : 'items'}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        <SheetClose />

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="font-bold text-xl mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add products from the visualizer to get started
            </p>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 group">
                    {/* Product Image */}
                    <div className="w-20 h-20 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                      <img
                        src={item.image}
                        alt={`${item.brand} ${item.model}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect fill="%23ddd" width="80" height="80"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="12" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E' + item.type.toUpperCase() + '%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm leading-tight truncate">
                            {item.brand} {item.model}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                          <Badge 
                            variant={item.type === 'tire' ? 'default' : 'secondary'}
                            className="mt-1 text-xs"
                          >
                            {item.type === 'tire' ? 'Tire' : 'Wheel'}
                          </Badge>
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </Button>
                      </div>

                      {/* Quantity and Price */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-katapult-pink">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">
                              ${item.price.toFixed(2)} each
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Cart Summary */}
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-lg text-katapult-pink">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button 
                className="w-full font-bold text-base h-12 bg-katapult-pink hover:bg-katapult-pink/90"
                onClick={onCheckout}
              >
                Proceed to Checkout
              </Button>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
