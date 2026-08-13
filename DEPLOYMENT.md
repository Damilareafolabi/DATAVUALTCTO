# CMRG DataVault - Deployment Guide

## Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore enabled
- (Optional) Firebase service account key for server-side Admin SDK

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Configure Firebase:**
   - Update `firebase-applet-config.json` with your Firebase project credentials
   - For production, set `GOOGLE_APPLICATION_CREDENTIALS` env var to your service account key path

3. **Configure Firestore Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=production
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Copy your web app config to `firebase-applet-config.json`
5. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Firestore Collections

The app uses these collections:
- `organizations` - Organization data
- `users` - User profiles and roles
- `projects` - Project management
- `forms` - Form definitions
- `form_versions` - Form version history
- `submissions` - Collected data
- `assignments` - Form assignments to enumerators
- `invitations` - User invitation tokens

## ODK Collect Integration

To use with ODK Collect:

1. Configure ODK Collect server URL to: `https://your-domain.com/formList`
2. Forms must have status `Deployed` to appear in ODK Collect
3. Use the OpenRosa endpoints:
   - `GET /formList` - List available forms
   - `GET /manifest?formID=<id>` - Get form media manifest
   - `POST /submission` - Submit form data

## XLSForm Upload

Upload XLSForm files (.xlsx) through the Forms page:
1. Click "Upload XLSForm" button
2. Select your .xlsx file
3. The form will be parsed and imported with all fields

Supported XLSForm sheets:
- `survey` - Form fields and questions
- `choices` - Choice options for select fields
- `settings` - Form settings

## Production Deployment

### Option 1: PM2 (Recommended)

```bash
npm run build
pm2 start dist/server.cjs --name cmrg-datavault
pm2 save
pm2 startup
```

### Option 2: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

### Option 3: Azure App Service

1. Build the app: `npm run build`
2. Deploy the `dist` folder and `server.cjs` to Azure App Service
3. Set startup command: `node dist/server.cjs`
4. Configure environment variables in Azure portal

## Security Notes

- Always use HTTPS in production
- Never expose Firebase Admin credentials
- Use strong JWT secrets
- Enable Firebase App Check for additional security
- Regularly audit Firestore security rules
- Implement rate limiting for public endpoints

## Troubleshooting

**Server won't start:**
- Check Firebase credentials are configured
- Ensure port 3000 is available
- Check logs for specific error messages

**Forms not syncing to ODK Collect:**
- Verify form status is "Deployed"
- Check `/formList` endpoint returns XML
- Ensure CORS is configured for your ODK Collect domain

**Build fails:**
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Ensure Node.js version is 18+
- Check for TypeScript errors: `npx tsc --noEmit`
