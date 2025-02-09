import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// Initialize Express App
const app = express();

// CORS Configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000", // Default if not set
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // Allow more methods
}));

// Middleware
app.use(express.json({ limit: "16kb" }));  // JSON body parsing
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // Form-data parsing
app.use(express.static("public")); // Serve static files
app.use(cookieParser()); // Parse cookies
app.use(morgan('dev')); // Log requests

// Routes Import
import userRouter from './routes/user.routes.js';

// Routes Declaration
app.use("/api/v1/users", userRouter);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({ success: false, message: err.message });
});

export { app };