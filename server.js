// Express server for Reaper's Smokehouse
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const ContactSubmission = require('./models/contactSubmission');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Prefer MONGODB_URI. Otherwise build from MONGO_USERNAME + MONGO_PASSWORD (e.g. Kubernetes secrets)
 * so passwords do not need to be embedded in a single URI string.
 */
function resolveMongoUri() {
    const explicit = process.env.MONGODB_URI;
    if (explicit && String(explicit).trim() !== '') {
        return explicit.trim();
    }
    const user = process.env.MONGO_USERNAME;
    const pass = process.env.MONGO_PASSWORD;
    const host = process.env.MONGO_HOST || '127.0.0.1';
    const port = process.env.MONGO_PORT || '27017';
    const db = process.env.MONGO_DATABASE || 'reapers_smokehouse';
    const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';
    if (user && pass) {
        return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${db}?authSource=${encodeURIComponent(authSource)}`;
    }
    return null;
}

const MONGODB_URI = resolveMongoUri();

// Security Middleware
// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow for static assets
}));

// Rate limiting - prevent brute force and DoS attacks
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 contact form submissions per hour
    message: 'Too many contact form submissions, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(generalLimiter);

// Body parsing middleware with size limits
app.use(express.json({ limit: '10kb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Limit URL-encoded payload size

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve CSS files
app.use('/css', express.static(path.join(__dirname, 'css')));

// Serve JavaScript files
app.use('/js', express.static(path.join(__dirname, 'js')));

// Serve assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

function mongoStatus() {
    const state = mongoose.connection.readyState;
    const labels = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    return labels[state] || 'unknown';
}

// Liveness: process is up (does not depend on MongoDB)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'reapers-smokehouse',
        mongodb: mongoStatus(),
    });
});

// Readiness: MongoDB available for contact form and related traffic
app.get('/ready', (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            ready: false,
            mongodb: mongoStatus(),
        });
    }
    res.status(200).json({ ready: true, mongodb: 'connected' });
});

// Input validation and sanitization rules for contact form
const contactValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name contains invalid characters')
        .escape(), // Sanitize to prevent XSS
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 254 })
        .withMessage('Email address is too long'),
    body('message')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Message must be between 1 and 2000 characters')
        .escape(), // Sanitize to prevent XSS
];

// API endpoint for contact form with security measures
app.post('/api/contact', contactLimiter, contactValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }

    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: 'Service temporarily unavailable. Please try again later.',
        });
    }

    const { name, email, message } = req.body;

    if (process.env.NODE_ENV === 'development') {
        console.log('Contact form submission received:', {
            name: name.substring(0, 20) + '...',
            email: email.substring(0, 10) + '...',
            messageLength: message.length
        });
    }

    try {
        await ContactSubmission.create({ name, email, message });
    } catch (err) {
        console.error('Failed to save contact submission:', err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred processing your request',
        });
    }

    res.json({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    console.error('Error:', isDevelopment ? err : 'An error occurred');

    res.status(err.status || 500).json({
        success: false,
        message: isDevelopment ? err.message : 'An error occurred processing your request',
        ...(isDevelopment && { stack: err.stack })
    });
});

// Catch all handler: send back index.html file for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let server;

async function connectMongoWithRetry(uri, maxAttempts = 12, delayMs = 2500) {
    mongoose.set('strictQuery', true);
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await mongoose.connect(uri);
            console.log('Connected to MongoDB');
            return;
        } catch (err) {
            lastErr = err;
            console.error(
                `MongoDB connection attempt ${attempt}/${maxAttempts} failed:`,
                err.message
            );
            if (attempt < maxAttempts) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
    }
    throw lastErr;
}

async function start() {
    if (!MONGODB_URI) {
        console.error(
            'MongoDB is not configured. Set MONGODB_URI or MONGO_USERNAME and MONGO_PASSWORD.'
        );
        process.exit(1);
    }

    try {
        await connectMongoWithRetry(MONGODB_URI);
    } catch (err) {
        console.error('MongoDB connection failed after retries:', err.message);
        process.exit(1);
    }

    server = app.listen(PORT, () => {
        console.log(`🔥 Reaper's Smokehouse server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

function shutdown(signal) {
    console.log(`${signal} received: closing HTTP server`);
    if (!server) {
        process.exit(0);
        return;
    }
    server.close(async () => {
        try {
            await mongoose.connection.close();
            console.log('MongoDB connection closed');
        } catch (e) {
            console.error('Error closing MongoDB:', e.message);
        }
        process.exit(0);
    });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
