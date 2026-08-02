# Udhaar Wise Backend Foundation

Udhaar Wise is an AI-powered digital udhaar (credit ledger) platform for small shopkeepers. This repository contains the Node.js + Express.js backend system containing Supabase client initialization, relational database schema blueprints, and Meta WhatsApp Business Cloud Webhook Integration.

---

## Folder Structure

The project follows a clean, modular, and scalable folder structure designed for easy expansion:

```
Backend/
├── src/
│   ├── config/             # Config variables & client instances (Supabase, Env)
│   │   ├── env.js          # Env variables parser & validator
│   │   └── supabase.js     # Supabase JS client configuration
│   ├── controllers/        # Express handlers (WhatsApp webhook endpoints)
│   │   └── whatsappController.js
│   ├── database/           # Database schema representations
│   │   └── schema.sql      # Postgres SQL schema design
│   ├── routes/             # Express routes mount list
│   │   └── whatsappRoutes.js
│   ├── services/           # External service integration wrapper
│   │   └── whatsappService.js
│   ├── utils/              # Project wide utilities (Logger)
│   │   └── logger.js
│   └── index.js            # Express app initialization point and middleware setups
├── .env                    # Active local environment variables
├── .env.example            # Environment variables template
├── package.json            # Node project configuration
└── README.md               # Backend structure guide
```

---

## Database Design

The schema is configured inside `src/database/schema.sql`. It defines:
1. **`users`**: Shopkeepers/Merchants (mapped to authentication IDs).
2. **`customers`**: Borrowers/buyers linked to a shopkeeper. Includes `current_balance` for quick ledger checks.
3. **`inventory`**: Products and stock tracked by the merchant.
4. **`orders`**: Sale receipts capturing transactional totals and item list connections.
5. **`order_items`**: Line items associating orders with inventory units.
6. **`transactions`**: Ledger entries auditing individual credit loans (`credit`) or loan repayments (`payment`). Includes an **automatic database trigger** (`fn_update_customer_balance`) that manages customer balances dynamically.
7. **`schemes`**: Promotional rules (discounts, late penalties) governing shop credit.

To apply this schema, execute the contents of `src/database/schema.sql` directly inside the **Supabase SQL Editor**.

---

## Verifying Setup Locally

### 1. Installation
Install core packages:
```bash
npm install
```

### 2. Run in Development Mode
Start the development server with live reload:
```bash
npm run dev
```

### 3. Verify Server & Supabase Connection
To audit that the database is reachable and variables are parsed correctly, query the diagnostics endpoint:
- **URL**: `GET http://localhost:5000/api/diagnostics`
- **Output**:
```json
{
  "timestamp": "2026-07-29T21:34:09Z",
  "env": "development",
  "services": {
    "supabase": {
      "ok": true,
      "reason": "success"
    },
    "whatsapp": {
      "isConfigured": false
    }
  }
}
```

### 4. Verify WhatsApp Webhook Handshake (GET Verification)
Meta validates your webhook domain by sending a GET request with a verification token that must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.

You can test this locally using `curl`:
```bash
curl -G "http://localhost:5000/api/whatsapp/webhook" \
  --data-urlencode "hub.mode=subscribe" \
  --data-urlencode "hub.verify_token=udhaar_wise_webhook_secret_verification_token" \
  --data-urlencode "hub.challenge=test_challenge_code_12345"
```
*Expected Response (Plain text, status 200)*:
```
test_challenge_code_12345
```

### 5. Verify Webhook Event Processing (POST Payload)
Test incoming text message routing by sending a mock Meta payload:
```bash
curl -X POST "http://localhost:5000/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [
      {
        "id": "1234567890",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "15550000000",
                "phone_number_id": "123456789"
              },
              "contacts": [
                {
                  "profile": { "name": "Ramesh Kumar" },
                  "wa_id": "919999999999"
                }
              ],
              "messages": [
                {
                  "from": "919999999999",
                  "id": "wamid.HBgLOTE5OTk5OTk5OTk5FQIAERgSRUFCM0Y4MTREMjkxM0IxOTRCAA==",
                  "timestamp": "1672531199",
                  "text": { "body": "Namaste, here is my payment confirmation." },
                  "type": "text"
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```
*Expected Response*: Status `200 OK` return JSON payload `{"status":"success"}` while printing formatting event logs in console stdout.
