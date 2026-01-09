// Express server for Reaper's Smokehouse
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const app = express();
const PORT = process.env.PORT || 3000;

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

// Health check endpoint for Kubernetes
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'reapers-smokehouse'
    });
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
app.post('/api/contact', contactLimiter, contactValidation, (req, res) => {
    // Check for validation errors
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

    const { name, email, message } = req.body;
    
    // In a production environment, you would:
    // 1. ✅ Validate the input (DONE)
    // 2. Send an email using a service like SendGrid, AWS SES, etc.
    // 3. Store in database (sanitized data)
    // 4. Return appropriate response (DONE)
    
    // Log sanitized data (no sensitive information in production logs)
    // In production, use a proper logging library like Winston or Pino
    if (process.env.NODE_ENV === 'development') {
        console.log('Contact form submission received:', { 
            name: name.substring(0, 20) + '...', // Truncate for logging
            email: email.substring(0, 10) + '...', // Truncate for logging
            messageLength: message.length 
        });
    }
    
    // TODO: Send email notification
    // TODO: Store in database
    
    res.json({ 
        success: true, 
        message: 'Thank you for your message! We will get back to you soon.' 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Don't leak error details in production
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

// Start server
app.listen(PORT, () => {
    console.log(`🔥 Reaper's Smokehouse server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

