# Pie Party

Pie Party is a real-time web app for collecting one-word conversation topics and visualizing them as a live pie chart.

## What it does

- Serves a simple web UI for entering a topic word
- Broadcasts updates in real time with Socket.IO
- Displays the current topic distribution as a doughnut chart
- Persists topic counts to Firestore

## Tech stack

- Node.js
- Express
- Socket.IO
- Firebase Admin / Firestore
- Chart.js

## Project structure

- `server.js` – Express + Socket.IO server and Firestore integration
- `public/index.html` – frontend UI and live chart rendering
- `test/helpers.test.js` – unit tests for pure helper functions
- `render.yaml` – Render deployment config

## Running locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set `FIREBASE_SERVICE_ACCOUNT` to a JSON service account string
3. Start the server:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000`

## Running tests

```bash
npm test
```

Current tests cover:
- `normalize()`
- `snapshot()`

## API

- `GET /api/status` – returns the current in-memory counts
- `POST /api/seed` – seeds counts in non-production environments
