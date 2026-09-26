# WattShare

**Electricity Generator Subscription Management Platform**

## Overview

In many neighborhoods, electricity comes from privately owned generators, and subscriptions, meter readings and bills are still tracked by hand in notebooks and spreadsheets. This leads to billing disputes, lost records and slow approvals. WattShare replaces that with one platform: subscribers request and manage their subscription, managers approve requests and log meter readings, bills are generated automatically from those readings, and admins oversee users, pricing and revenue.

## Live Demo

**https://wattshare-ivory.vercel.app**

## Key Features

- **Role-based dashboards** — separate dashboards for **Admin**, **Manager** and **Subscriber**, each showing only what that role needs to do.
- **Subscription lifecycle with manager approval** — a subscriber requests a subscription (status `pending`), a manager approves it and records the payment method (cash, Whish or OMT), and it becomes `active`. Admins and managers can also activate or deactivate subscriptions.
- **Meter reading and automatic billing** — managers submit readings and a bill is generated automatically: `consumption (kWh) × tariff rate + flat fee`, where the flat fee follows the admin-controlled price per ampere.
- **Downloadable invoices** — subscribers and admins can download any bill as an invoice image.
- **Revenue overview** — admins see total collected and outstanding amounts, updated as bills are marked as paid.
- **Ampere change requests** — subscribers request a different ampere plan and a manager approves it, which recalculates the flat fee.
- **Building filters** — managers can search subscribers by name and filter them by building and status.
- **Phone number registration** — sign up and log in with either an email or a Lebanese phone number (`+961` followed by 8 digits).
- **Issue reporting** — subscribers report outages or billing problems, and managers track them to resolution.
- **Pricing control** — admins set the price per ampere.

## AI Features

WattShare uses Google's **Gemini API** for two features. Both use the `gemini-3.5-flash-lite` model.

### Meter scanner (OCR)
Managers can photograph a subscriber's meter from the Subscribers page. Gemini reads the number in the image and pre-fills the reading field. The result is never submitted automatically: the manager reviews it and confirms it through the normal reading form, so a misread can't silently create a wrong bill.

### AI chatbot assistant
Subscribers get a floating assistant on their dashboard. It answers questions about their own subscription and their last 12 bills (for example, "Why is this month's bill higher?"). It only sees the signed-in subscriber's data, and it is instructed to answer only from that data. Conversations are limited to the last 20 turns and 1,000 characters per message.

### Bill forecast
Separately from Gemini, the subscriber dashboard predicts the next bill with a linear regression model (scikit-learn) trained on the subscriber's billing history.

## Multi-language Support

The whole interface is available in **English**, **Arabic** and **French**, with full **right-to-left (RTL)** layout support for Arabic. The language is detected from the browser on the first visit, can be changed at any time with the language switcher, and is remembered afterwards. Backend error messages are returned as error codes and translated on the frontend, so users see errors in their chosen language.

## Tech Stack

| Area | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, React Router, i18next / react-i18next, Framer Motion, Recharts, Axios, Lucide icons |
| **Backend** | Python 3.12, FastAPI, MongoDB (PyMongo), Pydantic, JWT authentication (python-jose), bcrypt password hashing, scikit-learn |
| **AI** | Google Gemini API (`google-genai` SDK) |
| **Testing** | pytest + mongomock (backend), Vitest (frontend) |
| **Deployment** | Render with Docker (backend), Vercel (frontend) |

## Project Structure

```
wattshare/
├── backend/
│   ├── main.py               # FastAPI app: all endpoints, grouped into labeled sections
│   ├── models.py             # Pydantic request/response models
│   ├── auth.py               # Password hashing, JWT creation, current-user dependency
│   ├── requirements.txt      # Production dependencies
│   ├── requirements-dev.txt  # Adds the test dependencies
│   ├── Dockerfile            # Container image used for deployment
│   ├── pytest.ini
│   └── tests/                # Auth, subscriptions, billing, OCR and chatbot tests
└── frontend/
    ├── src/
    │   ├── pages/            # Landing, Login, Register, Subscribe
    │   │   ├── dashboard/    # Subscriber dashboard pages
    │   │   ├── owner/        # Manager dashboard pages
    │   │   └── admin/        # Admin dashboard pages
    │   ├── components/       # LanguageSwitcher, ProtectedRoute, Toast, ConfirmModal
    │   ├── i18n/             # i18next setup and the en / ar / fr translation files
    │   ├── services/         # Axios API client
    │   ├── hooks/            # Shared React hooks
    │   └── utils/            # Helpers such as API error handling
    ├── public/
    └── vercel.json           # Single-page-app routing for Vercel
```

## Getting Started

### Prerequisites

- Python 3.12 or newer
- Node.js 20 or newer
- A MongoDB database (a local instance or a free MongoDB Atlas cluster)
- A [Gemini API key](https://aistudio.google.com/) (only needed for the OCR scanner and the chatbot)

### Backend

```bash
cd backend
python -m venv venv

# Activate the virtual environment
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=wattshare
SECRET_KEY=replace-with-a-long-random-string
GEMINI_API_KEY=your-gemini-api-key
```

Start the API:

```bash
uvicorn main:app --reload
```

The API runs at http://127.0.0.1:8000, and interactive documentation is available at http://127.0.0.1:8000/docs.

> **First admin account:** self-registration only creates subscriber accounts. Create the first admin by inserting a user with the role `admin` (and a bcrypt-hashed password) directly into the `users` collection. Admins can then create manager accounts from the dashboard.

### Frontend

```bash
cd frontend
npm install
```

Create a `frontend/.env` file:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

The app runs at http://localhost:5173.

## Running Tests

**Backend** (pytest). The tests use an in-memory fake MongoDB and a mocked Gemini client, so they need no database, network or API key:

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

**Frontend** (Vitest):

```bash
cd frontend
npm test
```

The frontend also has a linter and a production build check:

```bash
npm run lint
npm run build
```

## Deployment

- **Backend:** deployed on **Render** as a Docker service using `backend/Dockerfile`. Set `MONGO_URI`, `DB_NAME`, `SECRET_KEY` and `GEMINI_API_KEY` as environment variables in the Render dashboard. The frontend's URL must be included in the allowed CORS origins in `backend/main.py`.
- **Frontend:** deployed on **Vercel**. Set `VITE_API_URL` to the backend's public URL. `vercel.json` rewrites all routes to `index.html` so client-side routing works.

## Author

**Amin Kassem** — [@kassemamin22-creator](https://github.com/kassemamin22-creator)

WattShare was built as a graduation project.
