# Katapult LTO - Wheel & Tire Visualizer with Financing

A modern Next.js application featuring an interactive wheel and tire visualizer powered by Autosync, integrated with LendPro financing for lease-to-own options.

## Features

- 🎨 Interactive 3D wheel and tire visualizer
- 💳 Dual payment options: LendPro Financing & Credit Card
- 📱 Fully responsive (mobile, tablet, desktop)
- 🎯 Real-time product selection and pricing
- ⚡ Pre-qualification modal for instant financing decisions
- 🔒 Secure checkout process

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Visualizer:** Autosync Widget
- **Financing:** LendPro API Integration
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/KatapultLTO.git
cd KatapultLTO
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your credentials:
```env
LENDPRO_USERNAME=your_username
LENDPRO_PASSWORD=your_password
LENDPRO_STORE_ID=your_store_id
LENDPRO_SALES_ID=your_sales_id
LENDPRO_SALES_NAME=your_sales_name
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This app is optimized for deployment on Vercel:

```bash
vercel
```

Make sure to add your environment variables in the Vercel dashboard.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LENDPRO_USERNAME` | LendPro API username |
| `LENDPRO_PASSWORD` | LendPro API password |
| `LENDPRO_STORE_ID` | Your store ID |
| `LENDPRO_SALES_ID` | Sales representative ID |
| `LENDPRO_SALES_NAME` | Sales representative name |

## License

MIT
