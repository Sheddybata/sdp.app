# SDP Member Portal

A **mobile-first PWA** for the Social Democratic Party (SDP): **Member Enrollment** and **Admin Command Center**.

## Features

### 1. Member Enrollment PWA
- **Multi-step wizard** (5 steps) with prominent progress indicator
- **Step 1:** Identity (Title, Surname, First, Other Names)
- **Step 2:** Contact & Age (Phone, Email, DOB)
- **Step 3:** Political Geography (Join Date auto-filled, State → LGA → Ward cascading dropdowns)
- **Step 4:** Verification (Voter Registration Number with inline validation; optional portrait via `capture="user"`)
- **Step 5:** Preview — **Digital ID Badge** with barcode and **“Download My Membership Card”** (image/PDF)
- Single-column layout, labels above fields, WCAG 2.1 Level AA–friendly
- Thumb-friendly buttons (min 44px height)
- PWA manifest for standalone “App” experience

### 2. Admin Command Center
- **North Star Dashboard:** 4 KPI cards (Total Members, Female/Male, Top State, Growth This Week), bar chart of member density by state
- **Master Member Table:** Server-side–style sorting and filtering (Global Search, State, LGA, Ward, Date Range); clickable rows open a **slide-over (Sheet)** with full profile and digital badge
- **Access Control:** Manage State Admins (who registers members per region)
- **Export:** CSV and PDF that respect current filters

## Tech Stack
- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **Radix UI** (Select, Dialog/Sheet, Label)
- **React Hook Form** + **Zod** for enrollment validation
- **Recharts** for dashboard chart
- **JsBarcode** for member card barcode
- **jsPDF** for PDF export
- **html2canvas** for card image download (optional)

## Design
- **Primary:** SDP `#f48735` (action color)
- **Accent:** `#01a85a` (success/secondary)
- White-space first, institutional, WCAG 2.1 AA

## Getting Started

```bash
npm install
npm run dev
```

- **Enrollment:** [http://localhost:3000/enroll](http://localhost:3000/enroll)
- **Admin:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Home:** [http://localhost:3000](http://localhost:3000)

## PWA Icons
Add `public/icon-192.png` and `public/icon-512.png` (PNG, 192×192 and 512×512) for install prompt. The manifest is at `app/manifest.ts`.

## Nigeria Geography (States, LGA, Wards)
- **Permanently embedded:** The app uses **`lib/nigeria-wards-embedded.json`** with **all 37 states, 775 LGAs, and 8,798 wards** (no runtime fetch, no 404). Data is loaded once from the bundle.
- **Regenerating embedded data:** To refresh from the public Gist (Nigerian states/LGA/wards):
  ```bash
  npm run embed-full-wards
  ```
  This overwrites `lib/nigeria-wards-embedded.json`.
- **Optional:** `public/nigeria-wards.json` and `npm run generate-default-wards` / `npm run extract-wards` are kept for PDF-based extraction; the enrollment Geography step uses only the embedded JSON.

## License
MIT
