# SplitNest

SplitNest is a MERN stack app for managing shared group expenses, balances, and payments. It is built for hostel rooms, flats, and small groups that need a simple shared ledger with admin controls, member views, group joining, and transaction history.

## Stack

- Frontend: React, React Router, Axios, React Hot Toast, Recharts, date-fns
- Backend: Node.js, Express, Mongoose, JWT, bcryptjs, Nodemailer, node-cron
- Database: MongoDB

## Main Features

- Authentication with login, registration, forgot password, and reset password
- Multi-group support with active group switching
- Create groups and browse available groups
- Join request flow for groups
- Admin tools for approving requests, removing members, transferring admin, and monthly reset
- Expense tracking with equal split and percentage split
- Payment tracking and balance updates
- Group-wise balances and transaction history
- Dark and light theme support
- Responsive frontend UI
- Cron job to auto-clear old expense descriptions after 21 days

## Project Structure

```text
SplitNest/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- utils/
|   |-- package.json
|   `-- server.js
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- App.js
|   |   `-- index.css
|   `-- package.json
`-- README.md
```

## Frontend Pages

- `LoginPage`
- `DashboardPage`
- `GroupsPage`
- `GroupRequestsPage`
- `MyRequestsPage`
- `MembersPage`
- `ExpensesPage`
- `PaymentsPage`
- `BalancesPage`
- `HistoryPage`
- `JoinPage`
- `ForgotPasswordPage`
- `ResetPasswordPage`

## Backend Models

- `User`
- `Group`
- `Expense`
- `Payment`
- `JoinRequest`
- `InviteToken`
- `PasswordResetToken`

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB local instance or MongoDB Atlas

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Create backend environment file

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/splitnest
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
EMAIL_FROM=no-reply@example.com

CRON_SCHEDULE=0 0 * * *
```

Notes:

- `MONGODB_URI`, `JWT_SECRET`, and `JWT_EXPIRE` are required by the backend.
- `CLIENT_URL` supports comma-separated origins if you need more than one frontend host.
- Email variables are needed for forgot-password emails.

### 3. Optional frontend environment file

Create `frontend/.env` if you want to override the default API URL:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

If this file is missing, the frontend already falls back to `http://localhost:5000/api`.

## Run the App

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm start
```

App URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Build the Frontend

```bash
cd frontend
npm run build
```

## Backend Scripts

```bash
npm run dev
npm start
```

## Frontend Scripts

```bash
npm start
npm run build
```

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/switch-group`
- `POST /api/auth/forgot-password`
- `GET /api/auth/reset-password/:token`
- `POST /api/auth/reset-password/:token`

### Groups

- `GET /api/groups`
- `GET /api/groups/my`
- `GET /api/groups/requests/my`
- `POST /api/groups`
- `GET /api/groups/:id`
- `PUT /api/groups/:id`
- `DELETE /api/groups/:id`
- `POST /api/groups/:id/request`
- `GET /api/groups/:id/requests`
- `PUT /api/groups/:id/requests/:reqId`
- `POST /api/groups/:id/leave`
- `PUT /api/groups/:id/transfer-admin`
- `DELETE /api/groups/:id/members/:memberId`
- `POST /api/groups/:id/reset`

### Group Expenses

- `GET /api/groups/:groupId/expenses`
- `GET /api/groups/:groupId/expenses/stats`
- `POST /api/groups/:groupId/expenses`
- `PUT /api/groups/:groupId/expenses/:id`
- `DELETE /api/groups/:groupId/expenses/:id`

### Group Payments

- `GET /api/groups/:groupId/payments`
- `POST /api/groups/:groupId/payments`
- `DELETE /api/groups/:groupId/payments/:id`

### Group Balances

- `GET /api/groups/:groupId/balances`
- `GET /api/groups/:groupId/balances/history`

## Business Logic Notes

- Expenses update balances based on selected members and split mode.
- Percentage split is supported in addition to equal split.
- Payments reduce outstanding balances and are recorded in group history.
- The backend runs a scheduled job that clears expense descriptions after 21 days while keeping the transaction itself.

## Deployment Notes

You can deploy the backend and frontend separately.

- Backend: Render, Railway, VPS, or any Node host
- Frontend: Vercel, Netlify, or any static hosting provider

Make sure production environment variables are configured for:

- MongoDB connection
- JWT secret
- frontend/backend URLs
- email provider credentials

## Current Status

This repository already includes:

- modern login/register flow
- group discovery and request handling
- grouped expenses and payments
- balances and history pages
- responsive UI redesign work in progress

## License

This project is currently private/internal unless you choose to add a license.
