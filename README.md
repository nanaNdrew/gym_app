# Gym App 💪

An offline-first, privacy-focused workout tracker built with React Native and Expo. 

This app is designed to get out of your way so you can focus on lifting. It features an automatic linear progression system, daily recovery check-ins, and a historical calendar view to track your gains over time.

## ✨ Features

- **Quick-Start Templates:** Pre-configured A/B/C workout templates modeled after classic 5x5 linear progression strength training.
- **Auto-Progression:** Seamlessly tracks your previous lifts and automatically suggests the next weight (+5 lbs / +2.5 kg) for your next session.
- **Offline First:** 100% of your data lives on your device using `AsyncStorage`. No accounts, no cloud sync, no tracking.
- **Draft Recovery:** If your phone dies mid-workout, your current session is saved as a draft and instantly restores when you reopen the app.
- **Interactive Calendar:** A built-in history calendar to visualize past workouts and manually back-log missed sessions on specific dates.
- **Recovery Tracking:** Quick pre-workout check-ins for resting heart rate, soreness, and sleep quality.

## 🛠 Tech Stack

- **Framework:** React Native / Expo (SDK 54)
- **Language:** TypeScript
- **Icons:** `lucide-react-native`
- **UI Components:** Built entirely with standard React Native primitives (zero heavy UI libraries) for maximum performance.
- **Calendar:** `react-native-calendars`
- **Storage:** `@react-native-async-storage/async-storage`

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Xcode (for iOS physical device builds)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nanaNdrew/gym_app.git
cd gym_app
```

2. Install dependencies:
```bash
npm install
```

3. Start the Metro bundler:
```bash
npx expo start
```

### Running on a Physical iOS Device (Free Apple Developer Account)

Since physical iOS devices require code signing, follow these steps to build the app natively to your iPhone via USB:

1. Open the iOS workspace in Xcode:
   ```bash
   open ios/gymapp.xcworkspace
   ```
2. In Xcode, click the **gymapp** project in the left sidebar, navigate to the **Signing & Capabilities** tab, check "Automatically manage signing", and select your Apple ID from the Team dropdown.
3. Plug in your iPhone via USB (make sure it's unlocked and you've selected "Trust This Computer").
4. Select your physical iPhone from the device dropdown at the very top of the Xcode window.
5. Hit the **Play (▶)** button in Xcode to compile and install the app to your device!
6. Once the app opens on your phone, start your terminal server (`npx expo start`) so the app can fetch the Javascript bundle.

*(Note: If you are on iOS 16+, ensure **Developer Mode** is turned on in your iPhone's Settings > Privacy & Security).*

## 🏋️‍♂️ Workout Templates

* **Workout A:** Squat (3x5), Bench Press (3x5), Deadlift (1x5)
* **Workout B:** Squat (3x5), Overhead Press (3x5), Power Clean (5x3)
* **Workout C:** Squat (3x5), Overhead Press (3x5), Deadlift (1x5)

