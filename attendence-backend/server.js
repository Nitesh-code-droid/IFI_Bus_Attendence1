const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from your Expo app
app.use(express.json()); // Parse JSON request bodies

// Database configuration from .env file
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Use SSL for security
        trustServerCertificate: true , // Change to true for self-signed certs
        enableArithAbort: true
    },
     
    pool: {
        max: 10, // Maximum connections
        min: 0,
        idleTimeoutMillis: 30000
    },
     authentication: {  // Add this section
        type: 'default'
    }
};

// Test database connection
async function testConnection() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('✅ Database connected successfully');
        await pool.close();
        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        return false;
    }
}

// Test endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Bus Attendance API is running',
        endpoints: {
            scan: 'POST /api/scan',
            scans: 'GET /api/scans',
            health: 'GET /api/health'
        }
    });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// SCAN ENDPOINT - Your React Native app will call this
app.post('/api/scan', async (req, res) => {
    console.log('📥 Received scan request:', req.body);
    
    try {
        const { employeeId, scanDateTime, scanType, deviceInfo } = req.body;
        
        // Validate required fields
        if (!employeeId || !scanDateTime) {
            return res.status(400).json({ 
                success: false, 
                message: 'Employee ID and scan time are required' 
            });
        }
        
        // Validate employeeId format (optional)
        if (employeeId.length < 3 || employeeId.length > 50) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID must be between 3 and 50 characters'
            });
        }
        
        // Connect to database
        const pool = await sql.connect(dbConfig);
        
        // SQL Query - ADJUST TABLE AND COLUMN NAMES HERE
        // You need to get these details from your IT team
        const sqlQuery = `
            INSERT INTO AttendanceScans 
            (EmployeeID, ScanDateTime, BarcodeType, DeviceInfo, CreatedAt) 
            VALUES 
            (@employeeId, @scanDateTime, @scanType, @deviceInfo, GETDATE())
        `;
        
        // Create request with parameters
        const request = new sql.Request(pool);
        
        // Add parameters to prevent SQL injection
        request.input('employeeId', sql.VarChar(50), employeeId);
        request.input('scanDateTime', sql.DateTime2, new Date(scanDateTime));
        request.input('scanType', sql.VarChar(20), scanType || 'UNKNOWN');
        request.input('deviceInfo', sql.VarChar(100), deviceInfo || 'Mobile Scanner');
        
        // Execute the query
        const result = await request.query(sqlQuery);
        
        console.log(`✅ Scan recorded for employee: ${employeeId}`);
        
        // Return success response
        res.status(201).json({
            success: true,
            message: 'Scan recorded successfully',
            data: {
                employeeId,
                scanDateTime,
                scanType,
                recordedAt: new Date().toISOString()
            }
        });
        
        // Close connection
        await pool.close();
        
    } catch (error) {
        console.error('❌ Database error:', error);
        
        // Provide specific error messages
        let errorMessage = 'Failed to record scan';
        let statusCode = 500;
        
        if (error.code === 'ELOGIN') {
            errorMessage = 'Database login failed. Check credentials.';
            statusCode = 401;
        } else if (error.code === 'ESOCKET') {
            errorMessage = 'Cannot connect to SQL Server. Check server address and firewall.';
            statusCode = 503;
        } else if (error.number === 208) { // Invalid object name
            errorMessage = 'Table not found. Check table name in database.';
        } else if (error.number === 547) { // Foreign key violation
            errorMessage = 'Employee ID not found in system.';
            statusCode = 400;
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message,
            errorCode: error.code || error.number
        });
    }
});

// GET all scans (for testing/admin)
app.get('/api/scans', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request(pool);
        
        // Get latest 50 scans
        const result = await request.query(`
            SELECT TOP 50 
                EmployeeID, 
                ScanDateTime, 
                BarcodeType,
                DeviceInfo,
                CreatedAt
            FROM AttendanceScans 
            ORDER BY ScanDateTime DESC
        `);
        
        await pool.close();
        
        res.json({
            success: true,
            count: result.recordset.length,
            scans: result.recordset
        });
        
    } catch (error) {
        console.error('Error fetching scans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch scans'
        });
    }
});

// GET scans by employee ID
app.get('/api/scans/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request(pool);
        
        request.input('employeeId', sql.VarChar, employeeId);
        
        const result = await request.query(`
            SELECT * FROM AttendanceScans 
            WHERE EmployeeID = @employeeId
            ORDER BY ScanDateTime DESC
        `);
        
        await pool.close();
        
        res.json({
            success: true,
            employeeId,
            count: result.recordset.length,
            scans: result.recordset
        });
        
    } catch (error) {
        console.error('Error fetching employee scans:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Scan endpoint: http://localhost:${PORT}/api/scan`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    
    // Test database connection on startup
    testConnection();
});