export interface LaunchFinancingRequest {
  orderId: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  fees: number;
  shipping: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    mobilePhone: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface LaunchFinancingResponse {
  launchURL: string;
  applicationId?: string;
  purchaseId?: string;
}

/**
 * Launch LendPro financing application
 */
export async function launchFinancing(
  request: LaunchFinancingRequest
): Promise<LaunchFinancingResponse> {
  const response = await fetch('/api/lendpro/launch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to launch financing: ${response.statusText}`
    );
  }

  return response.json();
}
