# Ophthal Ledger

A comprehensive clinic management app for ophthalmology practices, designed to streamline patient billing, track procedures and medications, and maintain financial records.

## Features

- **Dashboard Analytics**: Monthly and annual income tracking from all revenue sources (OP visits, IP visits, procedures, surgeries, pharmacy)
- **Patient Billing**: Quick entry form for patient consultations with support for multiple visit types
- **Procedure & Surgery Tracking**: Log all procedures and surgeries with smart pricing suggestions
- **Pharmacy Management**: Track medications with buy and sell prices, quantities, and margin calculations
- **Quick-Fill Memory**: Automatic suggestions for frequently used procedures, surgeries, and medications based on history
- **Local Data Persistence**: All data stored securely in browser's localStorage
- **CSV Export**: Export billing records by month, year, or all-time
- **Mobile-Optimized**: Responsive design built with Tailwind CSS, works seamlessly on smartphones and tablets
- **Native Android App**: Packaged as a native app using Capacitor

## Tech Stack

- **Frontend**: React 18.3.1
- **Build Tool**: Vite 5.4.10
- **Styling**: Tailwind CSS 3.4.17
- **Icons**: lucide-react
- **Mobile**: Capacitor for Android packaging
- **State Management**: React Hooks

## Installation & Development

### Prerequisites
- Node.js 16+ and npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/drvigneshs/Ophthal-Ledger.git
cd Ophthal-Ledger

# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

### Build for Production

```bash
# Build the web app
npm run build

# The optimized build will be in the dist/ folder
```

## Android APK Build

### Prerequisites
- Java Development Kit (JDK 11 or later)
- Android SDK
- Gradle

### Build Steps

```bash
# Build the web app first
npm run build

# Sync web assets to Android project
npx cap sync android

# Generate debug APK
cd android
./gradlew assembleDebug

# The APK will be at: android/app/build/outputs/apk/debug/app-debug.apk

# For release APK (requires signing certificate)
./gradlew assembleRelease
```

## App Usage

### Dashboard
- View monthly and annual income summaries
- Track revenue by source (consultations, procedures, pharmacy)
- Select different dates to view filtered analytics

### New Bill
1. Enter patient name and consultation date
2. Toggle OP/IP visits and enter fees
3. Add procedures/surgeries with amounts
4. Add medications with quantities and buy/sell prices
5. Click "Save Complete Patient Bill" to record the encounter

### Quick-Fill Suggestions
- As you type procedure, surgery, or medication names, the app suggests previously used entries
- Click a suggestion to auto-fill all related fields (name, price, quantity)
- Suggestions are built from your encounter history

### Ledger & Export
- View all recorded patient encounters
- Export data to CSV by time period
- Use exported CSV for accounting and reporting

## Data Storage

All data is stored locally in your browser's localStorage:
- `ophthalClinicData`: Patient encounters and billing records
- `ophthalQuickFillMemory`: Quick-fill suggestion history

**Important**: Clear browser data will delete the app data. Export to CSV regularly for backups.

## Mobile App

The app is optimized for mobile devices and can be installed as a native Android application. The native app version provides:
- Full offline functionality
- App store installation
- System-level permissions
- Better performance

## Contributing

Contributions are welcome! Feel free to fork this repository and submit pull requests.

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
