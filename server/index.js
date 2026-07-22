const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/engineers', require('./routes/engineers'));
app.use('/api/visits',    require('./routes/visits'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() })
);

// Serve APK download endpoint for mobile users
app.get('/download-apk', (req, res) => {
  const apkPath = path.join(__dirname, '../client/android/app/build/outputs/apk/debug/app-debug.apk');
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, 'fsm-field-service.apk');
  } else {
    res.status(404).send('APK file not found. Please build the Android project first.');
  }
});

// Serve static client build if it exists
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Fallback to React Router routing for frontend pages
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`\n🚀  FSM Server  →  http://localhost:${PORT} (Bound to 0.0.0.0 for network access)\n`);
});
