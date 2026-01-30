# Integrate LendPro API Setup

## Overview

Set up LendPro API integration in the Next.js app by creating API routes, a LendPro service, and updating CheckoutLightbox to use the real LendPro API instead of the mock implementation.

## Current State

The CheckoutLightbox currently has a mock/simulated financing flow. Need to integrate the actual LendPro API from lendpro-ecommerce.

## Required Changes

### 1. Create Next.js API Route for LendPro

Create `/app/api/lendpro/launch/route.ts` to proxy LendPro API calls with the exact payload structure from lendpro-ecommerce.

### 2. Create LendPro Client Service

Create `/services/lendproService.ts` for frontend API calls to the Next.js API route.

### 3. Update CheckoutLightbox

Replace the mock `startFinancing` function to call the real API and display the LendPro iframe.

### 4. Environment Variables

Add LendPro credentials to `.env.local`:
- LENDPRO_API_URL
- LENDPRO_USERNAME
- LENDPRO_PASSWORD
- LENDPRO_STORE_ID
- LENDPRO_SALES_ID
- LENDPRO_SALES_NAME

### 5. Install Dependencies

Add axios to package.json for API route.

## Files to Create/Modify

- `app/api/lendpro/launch/route.ts` - NEW: API route
- `services/lendproService.ts` - NEW: Client service
- `components/CheckoutLightbox.tsx` - UPDATE: Use real API
- `package.json` - UPDATE: Add axios
- `.env.local.example` - NEW: Environment template
