# University Analytics Dashboard
*Alumni Influencers Application*

This project has been upgraded to a **Server-Side Rendered (SSR) MVC Architecture** utilizing EJS templates, matching the required boilerplate specifications.

## Key Features Implemented
1. **Premium Dashboard UI:** Complete Vanilla CSS + EJS Layouts.
2. **8 Interactive Charts:** Data aggregated on backend via Sequelize `GROUP BY` and passed instantly to Chart.js.
3. **Advanced Filtering:** Alumni and Charts can be filtered by `programme`, `graduation_year`, and `industry_sector`.
4. **Data Export:** Generate CSV and PDF reports via `/export` endpoint.
5. **API Key Management:** UI explicitly designed for Scoped API Keys (e.g. `read:alumni`).
6. **Security Hardened:** Includes a robust CSRF verification token system alongside the existing security measures (Bcrypt, Helmet, Rate Limiting).

## Quick Start Configuration

```bash
# 1. Install Dependencies
npm install

# 2. Database Setup
# Configure your `.env` to match your local MySQL credentials.
# Then run the seeder script, which will drop tables, recreate them, and insert 100 fake profiles for the charts.
node utils/seedData.js

# 3. Start Server
npm run dev
```

> **Default Admin Login:** `admin@westminster.ac.uk` / `password123`

## Tech Stack

- **Runtime**: Node.js with Express.js 5
- **Database**: MySQL (via XAMPP) with Sequelize ORM
- **Auth**: Session-based (express-session) + Bearer tokens for API
- **Email**: Nodemailer with Gmail SMTP
- **Docs**: Swagger/OpenAPI at `/api-docs`
- **Security**: Helmet, CORS, rate limiting, bcrypt, XSS sanitisation

## Setup

```bash
npm install
```

Create a MySQL database:
```sql
CREATE DATABASE alumni_influencers;
```

Copy `.env.example` to `.env` and update your credentials:
```bash
cp .env.example .env
```

Start the development server:
```bash
npm run dev
```

Tables are auto-created via Sequelize sync on startup.

## API Documentation

Interactive Swagger docs available at: `http://localhost:3000/api-docs`

## Endpoints

### Authentication
- `POST /auth/register` - Register new alumni account
- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout and destroy session
- `GET /auth/verify?token=xxx` - Verify email address
- `POST /auth/forgot-password` - Request password reset email
- `POST /auth/reset-password` - Reset password with token

### Profile Management
- `GET /profiles` - List all alumni profiles (public)
- `GET /profile/me` - Get my profile with completion status
- `GET /profile/:id` - Get profile by user ID
- `POST /profile` - Create or update profile
- `DELETE /profile/entry/:type/:id` - Delete a sub-entry (degree, certification, licence, course, employment)

### Bidding System
- `GET /bids` - Get bidding data (today's bid, status, tomorrow slot, monthly stats)
- `POST /bid` - Place or update bid (increase only)
- `DELETE /bid` - Cancel today's pending bid
- `GET /bid/history` - Full bid history

### API Client Management
- `GET /api/clients` - List my API clients
- `POST /api/client` - Generate new bearer token
- `PUT /api/client/:id/revoke` - Revoke a token
- `GET /api/client/:id/usage` - View usage statistics

### Public API
- `GET /api/v1/featured` - Get today's featured alumnus (bearer token required)

## Project Structure

```
alumni-influencers/
├── controllers/        # Business logic (MVC pattern)
│   ├── auth/
│   ├── profile/
│   ├── bid/
│   ├── api/
│   └── main/
├── routes/             # Express Router definitions
│   ├── authRoutes.js
│   ├── profileRoutes.js
│   ├── bidRoutes.js
│   └── apiRoutes.js
├── models/             # Sequelize models
├── middleware/         # Auth, API auth, rate limiter, validators
├── utils/             # Email, token generator, cron jobs
├── lib/               # Boot loader (lecturer boilerplate)
├── public/uploads/    # Profile image uploads
├── index.js           # Entry point
├── db.js              # Database connection
└── swagger.js         # API documentation
```

## Author

W P Sanjula Sunath
