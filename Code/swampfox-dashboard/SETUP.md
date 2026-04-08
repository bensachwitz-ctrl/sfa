# Swamp Fox Agency Dashboard — Complete Setup Guide

---

## What You'll Need Before Starting

- A Windows PC with internet access
- Your Microsoft 365 / Azure account credentials (admin access preferred)
- A free FMCSA API key (takes 2 minutes)
- Your Power BI Workspace ID and Report IDs (once reports are built)
- Optional: Microsoft Fabric SQL endpoint (once data pipeline is ready)

---

## STEP 1 — Install Node.js

1. Open your browser and go to: **https://nodejs.org**
2. Click the big green **"LTS"** download button (e.g., Node.js 20 LTS)
3. Run the downloaded installer — click Next through all screens, keep all defaults
4. When done, open **Command Prompt** (press Windows key, type `cmd`, press Enter)
5. Type this and press Enter to confirm it worked:
   ```
   node --version
   ```
   You should see something like `v20.11.0`. If you do, Node.js is installed. ✓

---

## STEP 2 — Open the Project Folder

1. Open **Command Prompt**
2. Type the following and press Enter:
   ```
   cd "C:\Users\Benjamin\OneDrive - Swamp Fox Agency\Claude\Code\swampfox-dashboard"
   ```
3. Install all dependencies by typing:
   ```
   npm install
   ```
   This will take 1–2 minutes. You'll see a lot of text scroll by — that's normal.

---

## STEP 3 — Create Your Environment File

1. In the project folder, find the file called `.env.local.example`
2. Make a copy of it and rename the copy to `.env.local`
   - Right-click → Copy → Paste → Rename to `.env.local`
   - **Important:** The file must be named exactly `.env.local` (with the dot)
3. Open `.env.local` in Notepad or VS Code — you'll fill in the values in the next steps

---

## STEP 4 — Set Up Azure AD App Registration

This allows the dashboard to log in using your Microsoft 365 accounts.

1. Go to: **https://portal.azure.com**
2. Sign in with your Microsoft 365 admin account
3. In the search bar at the top, search for **"App registrations"** and click it
4. Click **"+ New registration"**
5. Fill in:
   - **Name:** `Swamp Fox Dashboard`
   - **Supported account types:** Select "Accounts in this organizational directory only"
   - **Redirect URI:** Select "Single-page application (SPA)" and enter: `http://localhost:3000`
6. Click **Register**
7. You'll see a summary page. **Copy these two values into your `.env.local`:**
   - **Application (client) ID** → paste as `NEXT_PUBLIC_AZURE_CLIENT_ID=`
   - **Directory (tenant) ID** → paste as `NEXT_PUBLIC_AZURE_TENANT_ID=`

8. Now add Power BI permissions:
   - In the left sidebar, click **"API permissions"**
   - Click **"+ Add a permission"**
   - Click **"Power BI Service"**
   - Check these boxes: `Report.Read.All`, `Dataset.Read.All`
   - Click **"Add permissions"**
   - Click **"Grant admin consent for [your org]"** → Yes

---

## STEP 5 — Get Your Power BI Workspace and Report IDs

### Find Your Workspace ID
1. Go to: **https://app.powerbi.com**
2. Open the workspace that contains your Fabric reports
3. Look at the URL — it will look like:
   `https://app.powerbi.com/groups/`**`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`**`/list`
4. That bold part is your Workspace ID → paste as `NEXT_PUBLIC_PBI_WORKSPACE_ID=`

### Find Each Report ID
For each report (Overview, Claims, Policies, Drivers, Risk Alerts, Companies):
1. Open the report in Power BI
2. Look at the URL — it will look like:
   `https://app.powerbi.com/groups/{workspaceId}/reports/`**`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`**`/...`
3. That bold part is the Report ID → paste it into the matching `.env.local` line

If you haven't built the Power BI reports yet, leave those blank for now.
The dashboard will show a placeholder until the IDs are filled in.

---

## STEP 6 — Get Your Free FMCSA API Key

This enables the DOT number lookup on the Companies page.

1. Go to: **https://ai.fmcsa.dot.gov/SMS/Tools/WebServices.aspx**
2. Click **"Register for a web service account"**
3. Fill in your name, email, and company info
4. You'll receive an API key by email within a few minutes
5. Paste it into `.env.local` as: `FMCSA_API_KEY=your-key-here`

---

## STEP 7 — (Optional) Connect Microsoft Fabric SQL

Do this once your Applied Epic data is flowing into Fabric.

1. In Microsoft Fabric, open your **Lakehouse**
2. Click **"SQL analytics endpoint"** in the top toolbar
3. The connection string will look like:
   `your-workspace-name.datawarehouse.fabric.microsoft.com`
4. Paste that as `FABRIC_SQL_ENDPOINT=` in `.env.local`
5. Set `FABRIC_DATABASE=` to your Lakehouse name

**For authentication**, add a service principal (recommended):
- In Azure Portal → App Registrations → your app → Certificates & secrets
- Click "+ New client secret" → add description "Fabric Access" → Copy the Value
- Add to `.env.local`:
  ```
  AZURE_SP_TENANT_ID=   (same as NEXT_PUBLIC_AZURE_TENANT_ID)
  AZURE_SP_CLIENT_ID=   (same as NEXT_PUBLIC_AZURE_CLIENT_ID)
  AZURE_SP_CLIENT_SECRET=  (the secret you just copied)
  ```
- In Fabric, go to your Workspace Settings → give your app "Contributor" access

**Default table names** (rename in `.env.local` if yours differ):
```
FABRIC_TABLE_POLICIES=Policies
FABRIC_TABLE_CLAIMS=Claims
FABRIC_TABLE_DRIVERS=Drivers
FABRIC_TABLE_SAMSARA=SamsaraEvents
```

---

## STEP 8 — Run the Dashboard

1. Open Command Prompt in the project folder (Step 2)
2. Type:
   ```
   npm run dev
   ```
3. Open your browser and go to: **http://localhost:3000**
4. Sign in with your Microsoft 365 account
5. You should see the dashboard! If Fabric isn't connected yet, it will show demo data automatically.

---

## STEP 9 — Connect Applied Epic to Fabric

Once you're ready to use real data:

**Option A — CSV Export (quickest):**
1. In Applied Epic, go to Reports → export Policies, Claims, and Clients to CSV
2. In Microsoft Fabric, open your Lakehouse → click "Get data" → "Upload files"
3. Upload the CSVs — Fabric will auto-detect columns
4. Create Delta tables from the files (click the file → "Load to Delta table")
5. Name the tables: `Policies`, `Claims`, `Drivers` (to match defaults)

**Option B — Scheduled Pipeline (recommended for live data):**
1. In Fabric, create a new **Data Pipeline**
2. Use the **SFTP** or **REST API** connector if Epic provides an export endpoint
3. Or use **Azure Data Factory** if your IT team has that set up
4. Schedule daily refresh at off-hours (e.g., 2 AM)

**Samsara data:**
1. Use Samsara's API or CSV export to pull driver events
2. Create a `SamsaraEvents` table in your Fabric Lakehouse with columns:
   `EventID`, `DriverID`, `AccountName`, `EventType`, `EventDate`, `MaxSpeed`, `Duration`
3. Join to the `Drivers` table on `DriverID`

---

## STEP 10 — Deploy for the Team (Internal Access)

To let the whole agency access it (not just your machine):

**Option A — Azure Static Web App (easiest):**
1. Install Azure CLI: https://aka.ms/installazurecliwindows
2. Run: `npm run build`
3. Deploy: `az staticwebapp create --name swampfox-dashboard --resource-group YourRG`
4. Set all `.env.local` values as **application settings** in the Azure portal
5. Add your production URL to the Azure AD app's redirect URIs

**Option B — Vercel (free, fastest):**
1. Go to vercel.com → sign in with GitHub
2. Push this folder to a GitHub repo
3. Import the repo in Vercel
4. Add all `.env.local` values as Environment Variables in Vercel settings
5. Add your Vercel URL to the Azure AD app's redirect URIs

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "npm is not recognized" | Node.js didn't install correctly — re-run the installer |
| Sign-in popup doesn't appear | Check `NEXT_PUBLIC_AZURE_CLIENT_ID` and `TENANT_ID` in `.env.local` |
| "Access token not found" | Make sure you granted admin consent in Step 4 |
| Reports show "Configure report IDs" | Paste Power BI report IDs into `.env.local` |
| DOT lookup fails | Check `FMCSA_API_KEY` is set correctly |
| Charts show demo data | Fabric not connected yet — this is expected until Step 7 |
| Charts show "—" values | Power BI reports not yet configured — demo KPI data still loads |

---

## Quick Reference: Your `.env.local` File

```
NEXT_PUBLIC_AZURE_TENANT_ID=        ← From Step 4
NEXT_PUBLIC_AZURE_CLIENT_ID=        ← From Step 4
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000

NEXT_PUBLIC_PBI_WORKSPACE_ID=       ← From Step 5
NEXT_PUBLIC_PBI_OVERVIEW_REPORT_ID= ← From Step 5
NEXT_PUBLIC_PBI_CLAIMS_REPORT_ID=   ← From Step 5
NEXT_PUBLIC_PBI_POLICIES_REPORT_ID= ← From Step 5
NEXT_PUBLIC_PBI_DRIVERS_REPORT_ID=  ← From Step 5
NEXT_PUBLIC_PBI_RISK_REPORT_ID=     ← From Step 5
NEXT_PUBLIC_PBI_COMPANIES_REPORT_ID=← From Step 5

FMCSA_API_KEY=                      ← From Step 6

FABRIC_SQL_ENDPOINT=                ← From Step 7 (optional)
FABRIC_DATABASE=                    ← From Step 7 (optional)
AZURE_SP_TENANT_ID=                 ← From Step 7 (optional)
AZURE_SP_CLIENT_ID=                 ← From Step 7 (optional)
AZURE_SP_CLIENT_SECRET=             ← From Step 7 (optional)
```
