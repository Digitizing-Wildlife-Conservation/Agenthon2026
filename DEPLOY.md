# 🚀 Deployment Guide: Matatu Route Intelligence Agent

This guide outlines how to deploy the agent to a production environment.

## 1. Environment Configuration
Ensure your `.env` file is fully populated with production credentials:
- **Africa's Talking**: Move from `sandbox` to your live `username` and `API_KEY`.
- **Google Cloud**: Use a service account with `Vertex AI User` permissions.
- **Supabase**: Use your production project URL and `service_role` key.

## 2. Database Migration
Run the SQL in `sql/schema.sql` on your production Supabase instance.

## 3. Deployment Options

### Option A: Render (Recommended)
1. Create a new **Web Service** on Render.
2. Connect your GitHub repository.
3. Set **Environment**: `Node`.
4. Set **Build Command**: `npm install`.
5. Set **Start Command**: `npm start`.
6. Add all variables from your `.env` to the Render **Environment Variables** section.

### Option B: Railway
1. Create a new project on Railway.
2. Connect your GitHub repository.
3. Railway will automatically detect the `package.json` and `Procfile`.
4. Add your `.env` variables in the **Variables** tab.

## 4. Africa's Talking Webhook
Once your server is live (e.g., `https://matatu-agent.onrender.com`), go to your Africa's Talking dashboard:
1. Navigate to **SMS** > **SMS Callbacks** > **Inbound Message Callback**.
2. Set the URL to: `https://your-app-url.com/sms/incoming`.
3. Set the **Delivery Report Callback** to: `https://your-app-url.com/sms/delivery`.

## 5. Post-Deployment
Run the seed script on the production database:
```bash
NODE_ENV=production npm run seed
```

## 6. Verification
Send a real SMS to your shortcode or use the live dashboard at `https://your-app-url.com/dashboard`.
