/**
 * API Service Layer
 * Provides helper functions for fetching product prices and other API calls
 */

export const apiService = {
  /**
   * Get product price by SKU
   * In a production environment, this would call your backend API
   * For now, returns reasonable mock prices based on product type
   */
  async getProductPrice(sku: string, type?: 'tire' | 'wheel'): Promise<number> {
    // Mock implementation - returns reasonable prices for demo
    // In production, this would make an API call to your backend
    console.log(`[API] Fetching price for ${type} SKU: ${sku}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Return mock prices based on type
    // Tires typically range from $100-$500, wheels from $200-$1000+
    return type === 'tire' ? 299.99 : 549.99;
  },

  /**
   * Generate financing application URL (if needed for direct links)
   */
  getFinancingUrl(cartTotal: number, zipCode: string): string {
    const params = new URLSearchParams({
      amount: cartTotal.toFixed(2),
      zip: zipCode,
      source: 'autosync_visualizer',
    });
    return `https://secure.lendpro.com/apply?${params.toString()}`;
  },
};
