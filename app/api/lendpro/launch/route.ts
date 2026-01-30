import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

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

export async function POST(request: NextRequest) {
  try {
    const body: LaunchFinancingRequest = await request.json();

    // Get LendPro credentials from environment variables
    const config = {
      apiUrl: process.env.LENDPRO_API_URL || 'https://apisg.mylendpro.com',
      username: process.env.LENDPRO_USERNAME || '',
      password: process.env.LENDPRO_PASSWORD || '',
      storeId: process.env.LENDPRO_STORE_ID || '',
      salesId: process.env.LENDPRO_SALES_ID || '',
      salesName: process.env.LENDPRO_SALES_NAME || '',
    };

    // Validate required credentials
    if (!config.username || !config.password) {
      console.error('[LendPro API] Missing credentials');
      return NextResponse.json(
        { error: 'LendPro credentials not configured' },
        { status: 500 }
      );
    }

    // Create Basic Auth header
    const credentials = `${config.username}:${config.password}`;
    const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

    // Format phone number (remove non-digits)
    const formatPhone = (phone: string): string => {
      return phone.replace(/\D/g, '');
    };

    // Build LendPro API payload according to their spec
    const payload = {
      language: 'en',
      storeId: config.storeId,
      salesId: config.salesId,
      salesName: config.salesName,
      applicationId: null,
      purchaseId: null,
      firstName: body.customer.firstName,
      middleInit: '',
      lastName: body.customer.lastName,
      address1: body.customer.streetAddress,
      address2: '',
      city: body.customer.city,
      state: body.customer.state,
      zipcode: body.customer.zipCode,
      homePhone: '',
      mobilePhone: formatPhone(body.customer.mobilePhone),
      email: body.customer.email,
      customerKey: body.orderId,
      invoiceNumber: body.orderId,
      purchaseAmount: body.totalAmount,
      fees: body.fees,
      salesTax: body.tax,
      shipping: body.shipping,
      downPayment: 0,
      promoCode: '',
      shipFirstName: body.customer.firstName,
      shipLastName: body.customer.lastName,
      shipAddress1: body.customer.streetAddress,
      shipAddress2: '',
      shipCity: body.customer.city,
      shipState: body.customer.state,
      shipZipcode: body.customer.zipCode,
      purchaseItems: body.items.map(item => ({
        sku: '',
        upc: '',
        description: item.name,
        condition: 'new',
        itemType: '',
        unitPrice: item.price,
        quantity: item.quantity,
        salesTax: 0,
        leasable: true,
        deliveryDate: null,
        delivered: false,
      })),
    };

    console.log('[LendPro API] Launching financing with payload:', JSON.stringify(payload, null, 2));

    // Make API request to LendPro /page/api-launch endpoint
    const response = await axios.post(
      `${config.apiUrl}/page/api-launch`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        timeout: 30000,
      }
    );

    console.log('[LendPro API] Response status:', response.status);
    console.log('[LendPro API] Response data:', JSON.stringify(response.data, null, 2));

    // LendPro API returns nested structure: { error, data: { status, launchURL, ... } }
    const responseData = response.data?.data || response.data;

    if (responseData && responseData.launchURL) {
      console.log('[LendPro API] Successfully extracted launchURL:', responseData.launchURL);
      return NextResponse.json({
        launchURL: responseData.launchURL,
        applicationId: responseData.application?.applicationId,
        purchaseId: responseData.purchase?.purchaseId,
      });
    }

    // Log the full response for debugging
    console.error('[LendPro API] No launchURL found in response. Full response:', {
      status: response.status,
      data: response.data,
      dataKeys: Object.keys(response.data || {}),
      nestedDataKeys: Object.keys(responseData || {}),
    });

    return NextResponse.json(
      { error: `Invalid response from LendPro API: No launchURL received` },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('[LendPro API] Launch financing error:', error.response?.data || error.message);

    if (error.response?.data) {
      return NextResponse.json(
        { error: `LendPro API error: ${JSON.stringify(error.response.data)}` },
        { status: error.response.status || 500 }
      );
    }

    return NextResponse.json(
      { error: `Failed to launch financing: ${error.message}` },
      { status: 500 }
    );
  }
}
