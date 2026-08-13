# CMRG DataVault - Phone Testing Guide

## Overview

This guide will get you from zero to testing data collection on your phone in 30 minutes.

## Prerequisites

- Android phone (Android 7.0+ recommended)
- USB cable for initial setup
- CMRG DataVault server running (or use ngrok for remote access)
- ODK Collect APK built with CMRG branding

---

## Step 1: Build CMRG Collect APK

### Option A: Using Build Script (Recommended)

**Windows:**
```bash
cd odk-collect-fork
build-cmrg-collect.bat
```

**Mac/Linux:**
```bash
cd odk-collect-fork
chmod +x build-cmrg-collect.sh
./build-cmrg-collect.sh
```

### Option B: Manual Build with Android Studio

1. Open Android Studio
2. Select "Open an Existing Project"
3. Navigate to `odk-collect-fork/cmrg-collect`
4. Wait for Gradle sync to complete
5. Go to `Build > Build APK(s)`
6. APK will be at `cmrg-collect/collect_app/build/outputs/apk/debug/collect_app-debug.apk`

---

## Step 2: Install on Your Phone

### Method 1: USB Install (Fastest)

1. **Enable Developer Options on your phone:**
   - Go to `Settings > About Phone`
   - Tap `Build Number` 7 times until you see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to `Settings > Developer Options`
   - Enable `USB Debugging`

3. **Connect phone to computer:**
   ```bash
   adb install -r odk-collect-fork/cmrg-collect/collect_app/build/outputs/apk/debug/collect_app-debug.apk
   ```

4. **Allow installation:**
   - On your phone, you may see a prompt "Allow USB debugging?"
   - Tap "OK" or "Allow"

### Method 2: Direct APK Install (No Computer Needed)

1. **Get the APK file:**
   - Copy `collect_app-debug.apk` to your phone via:
     - Email it to yourself
     - Upload to Google Drive/Dropbox
     - Upload to CMRG dashboard (if implemented)

2. **Enable Unknown Sources:**
   - Go to `Settings > Security`
   - Enable `Unknown Sources` or `Install Unknown Apps`
   - Select your browser/file manager

3. **Install APK:**
   - Open the APK file on your phone
   - Tap "Install"
   - Wait for installation to complete

---

## Step 3: Configure CMRG DataVault Server

1. **Open CMRG Collect app** on your phone
2. **Tap the menu icon (≡)** in top-left
3. **Tap "General Settings"**
4. **Tap "Server"**
5. **Tap "Add server"**
6. **Enter server details:**
   - **Server Name:** CMRG DataVault
   - **Server URL:** `http://YOUR_SERVER_IP:3000` (see options below)

### Server URL Options:

#### Option A: Local Network (Same WiFi)
```
http://192.168.1.100:3000
```
(Replace with your computer's local IP address)

#### Option B: ngrok (Remote Access)
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```
Use the ngrok URL (e.g., `https://abc123.ngrok.io`)

#### Option C: Deployed Server
```
https://your-cmrg-server.com
```

7. **Tap "Save"**
8. **Tap "Get Blank Form"** to test connection

---

## Step 4: Create Your First Form

### In CMRG DataVault Dashboard (Web):

1. **Go to Forms > Build New Form**
2. **Add fields:**
   - Name (text)
   - Age (integer)
   - Gender (single_choice: Male/Female/Other)
   - Location (GPS)
   - Photo (image)
   - Notes (long_text)
3. **Click "Save Form"**
4. **Change status to "Deployed"** (edit form and set status)

---

## Step 5: Download Form to Phone

1. **Open CMRG Collect** on your phone
2. **Tap "Get Blank Form"**
3. **Select your form**
4. **Tap "Get Selected"**
5. **Wait for download to complete**
6. **Form appears in "Fill Blank Form" list**

---

## Step 6: Fill Out Form (Test Data Collection)

1. **Tap "Fill Blank Form"**
2. **Select your form**
3. **Fill out all fields:**
   - Enter text in Name field
   - Enter number in Age field
   - Select gender
   - Tap GPS button to capture location
   - Tap camera button to take photo
   - Enter notes
4. **Tap "Save & Complete"**
5. **Form is saved locally**

---

## Step 7: Sync Submissions to Server

### Auto-Sync (Recommended):
1. Go to `Settings > General Settings > Server`
2. Enable `Auto-sync`
3. Submissions will sync automatically when connected

### Manual Sync:
1. **Make sure phone is connected to internet**
2. **Tap menu (≡) > "Send Finalized Form"**
3. **Select forms to send**
4. **Tap "Send Selected"**
5. **Wait for "Submission successful" message**

---

## Step 8: Verify Data in Dashboard

1. **Go to CMRG DataVault dashboard**
2. **Click "Submissions"**
3. **You should see your test submission!**
4. **Click on it to view details:**
   - Answers
   - GPS coordinates
   - Photo (if captured)
   - Timestamp

---

## Testing Checklist

Use this checklist to verify everything works:

### Basic Functionality
- [ ] App opens without crashing
- [ ] Server connection works
- [ ] Form downloads successfully
- [ ] Form opens and displays all fields
- [ ] Text input works
- [ ] Number input works
- [ ] Single choice (radio) works
- [ ] Yes/No works
- [ ] GPS captures coordinates
- [ ] Camera takes photo
- [ ] Form saves locally
- [ ] Submission syncs to server
- [ ] Data appears in dashboard

### GPS Verification
- [ ] GPS coordinates are captured
- [ ] Coordinates are stored with submission
- [ ] Dashboard shows GPS on map
- [ ] Coordinates are accurate (within 10m)

### Photo Verification
- [ ] Photo captures successfully
- [ ] Photo is stored with submission
- [ ] Photo appears in dashboard
- [ ] Photo has correct timestamp
- [ ] Photo has GPS metadata

### Offline Mode
- [ ] Form can be filled offline
- [ ] Submissions queue when offline
- [ ] Submissions sync when back online
- [ ] No data loss during offline period

### Edge Cases
- [ ] Large photos upload correctly
- [ ] Long text entries save properly
- [ ] Multiple submissions work
- [ ] App survives phone restart
- [ ] App updates from dashboard

---

## Troubleshooting

### Problem: "Server connection failed"
**Solution:**
- Check server URL is correct
- Ensure server is running
- Check firewall allows port 3000
- Try using ngrok for remote access

### Problem: "Form download failed"
**Solution:**
- Check form status is "Deployed"
- Verify server URL in ODK Collect matches dashboard
- Check server logs for errors

### Problem: "GPS not working"
**Solution:**
- Enable location services on phone
- Grant camera/location permissions to app
- Go outside for better GPS signal
- Wait 30-60 seconds for GPS fix

### Problem: "Photo not uploading"
**Solution:**
- Check internet connection
- Ensure photo was taken (not just preview)
- Try smaller photo size in settings

### Problem: "Submission sync failed"
**Solution:**
- Check internet connection
- Verify server is running
- Check server logs for errors
- Try manual sync instead of auto-sync

---

## Performance Testing

### Load Test (Admin):
1. Create 50 forms in dashboard
2. Download all forms to phone
3. Fill out 100 submissions
4. Sync all submissions
5. Check dashboard loads quickly

### Stress Test (Admin):
1. Create 500 forms
2. Download to 5 phones simultaneously
3. Fill out 1000 submissions total
4. Sync all data
5. Verify no data loss

---

## Next Steps After Testing

Once basic testing passes:

1. **Test with 5-10 enumerators** for 1 week
2. **Gather feedback** on usability
3. **Fix bugs** found during pilot
4. **Add missing features** (transcription, advanced GPS verification)
5. **Scale to full CMRG deployment**

---

## Support

If you encounter issues:
1. Check server logs: `npm run dev` output
2. Check ODK Collect logs: `Settings > About > Send log`
3. Verify Firestore rules are deployed
4. Test with browser first: `http://your-server:3000`

---

## Quick Reference

| Action | ODK Collect Menu Path |
|--------|----------------------|
| Get forms | Menu > Get Blank Form |
| Fill form | Menu > Fill Blank Form |
| Send data | Menu > Send Finalized Form |
| View sent | Menu > View Sent Form |
| Settings | Menu > General Settings |
| Server config | Settings > Server |

---

**Last Updated:** 2026-08-13
**CMRG DataVault Version:** 1.0.0
**ODK Collect Version:** 2024.x (based on getodk/collect main branch)
