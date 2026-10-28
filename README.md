# group81-project3

Bubble tea POS system (CSCE 331 Project 3, Group 81).

Live site: https://csce331-project3-squad81.onrender.com/

## Tech Stack

- **Frontend:** JavaScript, HTML, CSS
- **UI framework:** React with React Router
- **Build tool:** Vite
- **Backend:** Node.js and Express
- **Database:** PostgreSQL 
- **Version control:** GitHub (class organization)
- **Web host:** Render

## Interface Views

| Route | View |
|---|---|
| `/` | Portal Hub (links to all other views) |
| `/manager` | Manager Dashboard |
| `/cashier` | Cashier Screen |
| `/kiosk` | Customer Kiosk |
| `/kitchen` | Kitchen Display |

Only the Portal Hub links to the other views.

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root with the database credentials:
   ```
   PSQL_USER=
   PSQL_HOST=
   PSQL_DATABASE=
   PSQL_PASSWORD=
   PSQL_PORT=
   ```

### Development

Run both the backend and the frontend dev server with one command:

```bash
npm run dev
```

Open http://localhost:3001. This starts:

- **Vite** on port 3001 to serve the React app with fast refresh during development.
- **Express** on port 3000 to provide the `/api` endpoints and connect to PostgreSQL.

Both are needed because the React app is served by Vite during development, while its API requests are handled by Express. Vite proxies `/api` requests to Express. In production, `npm run build` creates the React assets and Express serves those assets as well as the API, so only `npm start` is needed.

### Production build

```bash
npm run build   # builds React into dist/
npm start       # serves everything on http://localhost:3000
```

### Deploying to Render

- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npm start`
- Add the `PSQL_*` variables under Environment.

## Project Structure

```
src/
  main.jsx        React entry point
  App.jsx         Routes
  pages/          One file per interface view, plus pages.css
index.html        HTML entry for Vite
index.js          Express server and API routes
vite.config.mjs
```
