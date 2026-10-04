# F-LINK: Forward Logistics Intelligence & Network

Tactical logistics decision-support platform designed for forward military installations, automated resupply predictions, multi-echelon inventory, weather-aware route risk analysis, and role-based operational coordination.

---

## 🚀 One-Click Deploy to Render

This repository is pre-configured for deployment on [Render](https://render.com) with the included `render.yaml` blueprint.

### Method 1: Web Service Deployment (Recommended)
1. Go to your **[Render Dashboard](https://dashboard.render.com/)** (log into your new Render account).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `f-link` (or any name you choose)
   - **Environment**: `Node`
   - **Region**: Any (e.g., Singapore, Frankfurt, Oregon)
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: (Click *Generate* or enter any secure random string)
   - `DB_PATH`: `./flink.db`
6. Click **Deploy Web Service**!

---

## 👥 Demo Access Portals & Credentials

| Role | Username | Password | Operational Access |
|---|---|---|---|
| **Logistics Officer** | `logistics` | `demo123` | Route approval, resupply scheduling, operational risk dashboard |
| **Supply Officer** | `supply` | `demo123` | Multi-category inventory allocation, depot & post stock tracking |
| **Transport Coordinator** | `transport` | `demo123` | Fleet status, vehicle maintenance, active delivery monitoring |
| **System Administrator** | `admin` | `admin123` | System settings, user management, audit log, data quality |

---

## 🛠️ Local Development

### 1. Install & Build
```bash
# Install all dependencies and build client
npm run build
```

### 2. Start Application
```bash
# Starts Express server on port 3001 and serves the built React frontend
npm start
```
Open [http://localhost:3001](http://localhost:3001) in your browser.
