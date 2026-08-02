# Udhaar Wise

![Dashboard](screenshots/landing-page.png)

A comprehensive business management platform for small shopkeepers that combines AI-powered order processing, inventory management, customer intelligence, and WhatsApp Business integration.

![React](https://img.shields.io/badge/React-18-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E)
![Gemini](https://img.shields.io/badge/AI-Gemini-orange)
![Groq](https://img.shields.io/badge/Speech-Groq-purple)
![WhatsApp](https://img.shields.io/badge/API-WhatsApp-success)

## Problem Statement

Small shopkeepers in India face multiple challenges:
- Managing credit (udhaar) manually leads to errors and disputes
- Tracking inventory levels is time-consuming and error-prone
- Customer relationship management is fragmented
- Order processing through WhatsApp is manual and inefficient
- Lack of business insights and analytics

Udhaar Wise addresses these challenges by providing an integrated platform that automates order processing, inventory management, and customer intelligence through AI and WhatsApp Business integration.

## Features

### WhatsApp Business Integration
- Real-time order processing through WhatsApp messages
- Automated order confirmations and status updates
- Payment tracking and reminders via WhatsApp
- Support for text, voice, and image inputs

### AI-Powered Order Processing
- Natural language order parsing using Google Gemini API
- Fallback mechanism with Groq API for reliability
- Rule-based parser as final fallback
- Intent classification: NEW_ORDER, PAYMENT, INVENTORY_PURCHASE, ORDER_STATUS, GENERAL_MESSAGE
- Automatic amount extraction (NULL when not mentioned)

### Inventory Management
- Full CRUD operations for inventory items
- Owner-controlled inventory (no automatic creation from orders)
- Stock tracking with low-stock alerts
- Manual restock functionality
- Price and quantity management

### Customer Management
- Customer profile management
- Order history and timeline
- Payment tracking and outstanding balance
- Customer segmentation (VIP, Loyal, Growing, New)

### Customer Intelligence Hub
- AI-generated customer memory summaries
- Purchase timeline with order details
- AI insights: payment behaviour, favourite products, risk level, suggested follow-up
- Dynamic intelligence generation from database records

### Dashboard Analytics
- Monthly revenue tracking
- Pending udhaar (credit) amounts
- Unpaid orders count
- Orders this month
- Loan eligibility score
- Real-time activity feed
- Low-stock alerts

### Authentication
- Supabase Auth integration
- Secure session management
- User registration and login

### AI Memory & Timeline
- AI-generated customer memory with fallback
- Order timeline with status tracking
- Insights generation using Gemini and Groq APIs

### Real-time Updates
- Auto-refresh dashboard after all actions
- Live order feed updates
- Inventory sync on order acceptance
- Customer data refresh

## Tech Stack

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS 4.2.1** - Styling
- **Vite 6.3.5** - Build tool
- **React Router 7.18.1** - Routing
- **Radix UI** - Component library
- **Lucide React** - Icons
- **Recharts** - Charts

### Backend
- **Node.js** - Runtime
- **Express.js 4.19.2** - Web framework
- **ESM** - Module system

### Database
- **Supabase** - PostgreSQL database and authentication
- **Supabase JS 2.45.0** - Database client

### AI Services
- **Google Gemini API 2.15.0** - Primary AI for order processing
- **Groq SDK 1.4.1** - Fallback AI provider

### Messaging
- **WhatsApp Business Cloud API v19.0** - Message processing

## System Architecture

```
WhatsApp Message
    ↓
Webhook Endpoint
    ↓
AI Processing (Gemini → Groq → Rule-based)
    ↓
Intent Classification
    ↓
Backend Service (Orders/Inventory/Customers)
    ↓
Supabase Database
    ↓
Dashboard UI (Real-time updates)
```

### Data Flow
1. Customer sends WhatsApp message
2. Webhook receives and validates message
3. AI classifies intent (order, payment, inventory, etc.)
4. Appropriate service processes the request
5. Data stored in Supabase
6. Dashboard auto-refreshes with new data
7. WhatsApp response sent to customer

## Project Structure

```
Udhaar-wise Final/
├── merged-app/merged/              # Frontend React application
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── use-orders.ts      # Orders data management
│   │   │   ├── use-inventory.ts   # Inventory data management
│   │   │   ├── use-customers.ts   # Customers data management
│   │   │   └── use-dashboard.ts   # Dashboard data management
│   │   ├── lib/                   # Utilities and API client
│   │   ├── routes/                # Page components
│   │   └── styles/                # Global styles
│   ├── package.json
│   └── vite.config.ts
│
└── udhaar-wise-backend-with-inventory/udhaar-wise-backend-with-inventory/udhaar-wise-backend/
    ├── src/
    │   ├── config/                # Configuration files
    │   │   ├── env.js            # Environment variables
    │   │   ├── gemini.js         # Gemini AI client
    │   │   ├── groq.js           # Groq AI client
    │   │   └── supabase.js       # Supabase client
    │   ├── controllers/           # Request handlers
    │   │   ├── ordersController.js
    │   │   ├── customersController.js
    │   │   ├── inventoryController.js
    │   │   ├── dashboardController.js
    │   │   ├── whatsappController.js
    │   │   └── authController.js
    │   ├── database/              # Database migrations and seeds
    │   ├── middlewares/           # Express middleware
    │   │   └── auth.js           # Authentication middleware
    │   ├── routes/                # API routes
    │   ├── services/              # Business logic
    │   │   ├── ordersService.js
    │   │   ├── customersService.js
    │   │   ├── inventoryService.js
    │   │   ├── aiService.js       # AI processing logic
    │   │   └── whatsappService.js
    │   ├── utils/                 # Utilities
    │   │   ├── logger.js         # Logging utility
    │   │   └── apiResponse.js    # Response helpers
    │   └── index.js              # Application entry point
    ├── .env.example              # Environment variables template
    ├── package.json
    └── .gitignore
```

## Installation

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Supabase account
- Meta Developer account (for WhatsApp Business API)
- Google Gemini API key
- Groq API key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd udhaar-wise-backend-with-inventory/udhaar-wise-backend-with-inventory/udhaar-wise-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `GEMINI_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq API key
- `WHATSAPP_ACCESS_TOKEN` - Meta WhatsApp access token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp phone number ID
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` - Webhook verification token

5. Run database migrations in Supabase SQL editor:
```sql
-- Add order_status column if not exists
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_status VARCHAR(20) 
CHECK (order_status IN ('pending', 'accepted', 'rejected', 'completed')) 
DEFAULT 'pending';

UPDATE public.orders 
SET order_status = CASE 
  WHEN payment_status = 'fully_paid' THEN 'completed'
  ELSE 'pending'
END
WHERE order_status IS NULL OR order_status = 'pending';
```

6. Start the backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd merged-app/merged
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
VITE_API_URL=http://localhost:5000
```

4. Start the frontend development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 5000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `ALLOWED_ORIGINS` | CORS allowed origins | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `GROQ_API_KEY` | Groq API key | Yes |
| `WHATSAPP_API_VERSION` | WhatsApp API version | No |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp business account ID | No |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID | Yes |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp access token | Yes |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook verification token | Yes |

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

## Running the Project

### Backend

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Frontend

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
```

### Database

The database is hosted on Supabase. Ensure:
1. All required tables are created via Supabase dashboard
2. Row Level Security (RLS) policies are configured
3. Database migrations are applied

## Demo

### Presentation
https://canva.link/kh6sjf4xsx8oc8z

## 📸 Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Orders & Inventory
![Orders](screenshots/orders.png)

### Customer Intelligence
![Customer Intelligence](screenshots/Customers.png)

### Funding and Government Schemes
![WhatsApp](screenshots/Funding.png)

## Future Enhancements

- **One-click PDF Export**: Generate PDF reports for orders, inventory, and customer statements
- **Funding & Government Schemes**: Enhanced integration with government schemes and funding options
- **Theme/Dark Mode Preferences**: User-selectable light/dark theme
- **Additional AI Improvements**: Enhanced customer insights and predictive analytics
- **Multi-language Support**: Support for regional Indian languages
- **Mobile App**: Native mobile application for shopkeepers

## License

MIT License - See LICENSE file for details

For issues and questions, please open an issue on the GitHub repository.
