Mzansi Fleet Mobile (Expo)

Quick start

1. Install dependencies

```bash
cd frontend-mobile
npm install
```

2. Start Expo

```bash
npx expo start
```

3. Configure backend URL

Edit `src/config.js` and set `API_URL` to your backend base (e.g. https://api.example.com/api)

Notes
- This scaffold includes auth context, API client, basic onboarding screens, and image picker to upload base64 images to existing backend endpoints.
- **Charts:** owner dashboard and vehicle performance now display graphs. Install additional packages:
  ```bash
  npm install react-native-chart-kit
  expo install react-native-svg
  ```

  **After adding new native dependencies you must restart the Expo bundler** (stop & `npm start` again) to load them.
