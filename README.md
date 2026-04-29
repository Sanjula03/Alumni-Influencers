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
# Then run the seeder script, which will drop tables, recreate them, and insert 10 Sri Lankan profiles for the charts.
node utils/seedData.js

# 3. Start Server
npm run dev
```

> **Default Admin Login:** `admin@eastminster.ac.uk` / `password123`

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
- `GET /auth/register` - View registration page
- `POST /auth/register` - Register new alumni account
- `GET /auth/login` - View login page
- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout and destroy session
- `GET /auth/verify?token=xxx` - Verify email address

### Profile Management
- `GET /profiles` - List all alumni profiles (public)
- `GET /profile/me` - Get my profile with completion status
- `POST /profile` - Create or update profile
- `DELETE /profile/entry/:type/:id` - Delete a sub-entry (degree, certification, etc.)

### Bidding System
- `GET /bids` - View bidding dashboard (SSR)
- `POST /bid` - Place or update bid via API
- `DELETE /bid` - Cancel today's pending bid
- `GET /bid/history` - Full bid history

### API Client Management
- `GET /api/clients` - List my API clients
- `POST /api/client` - Generate new bearer token

## Project Structure

```
alumni-influencers/
├── routes/             # Main application logic (Route-based architecture)
│   ├── authRoutes.js   # Authentication & session logic
│   ├── profileRoutes.js # Profile management & sponsorship
│   ├── bidRoutes.js    # Bidding API endpoints
│   └── apiRoutes.js    # API Key & Token management
├── controllers/        # Shared controllers & SSR views
│   ├── dashboard/      # Main dashboard rendering
│   ├── analytics/      # Chart data aggregation
│   ├── bids/           # Bidding UI logic (SSR)
│   └── export/         # CSV/PDF export logic
├── models/             # Sequelize database models
├── middleware/         # Security, CSRF, & Auth guards
├── utils/              # Email, cron jobs, & seed scripts
├── public/uploads/     # Profile images
├── index.js            # Main entry point
└── swagger.js          # API documentation setup
```

## Author

W P Sanjula Sunath
