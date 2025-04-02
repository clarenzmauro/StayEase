import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // For parsing application/json

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// PropertyPhoto model
const propertyPhotoSchema = new mongoose.Schema({
    label: { type: String, required: true }, // Keep the label field
    photoURL: { type: Buffer, required: true }, // Store image as binary data
});

const PropertyPhoto = mongoose.model('PropertyPhoto', propertyPhotoSchema, 'propertyPhotos');

// Route to update an existing image
app.put('/api/property-photos/:id', upload.single('image'), async (req, res) => {
    try {
        const { label } = req.body;
        const propertyPhoto = await PropertyPhoto.findById(req.params.id);

        if (!propertyPhoto) {
            return res.status(404).json({ message: 'Property photo not found' });
        }

        // Update label if provided
        if (label) {
            propertyPhoto.label = label;
        }

        // If a new image is uploaded, update the binary data
        if (req.file) {
            propertyPhoto.photoURL = req.file.buffer;
        }

        const updatedPhoto = await propertyPhoto.save();
        res.json(updatedPhoto);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route to upload an image
app.post('/api/property-photos/upload', upload.single('image'), async (req, res) => {
    const { label } = req.body; // Remove uid
    const photoURL = req.file.buffer; // Get the binary data from the uploaded file

    const newPropertyPhoto = new PropertyPhoto({ label, photoURL }); // Remove uid

    try {
        const savedPhoto = await newPropertyPhoto.save();
        res.status(201).json(savedPhoto);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route to get the image
app.get('/api/property-photos/:id/image', async (req, res) => {
    try {
        const propertyPhoto = await PropertyPhoto.findById(req.params.id);
        if (!propertyPhoto || !propertyPhoto.photoURL) {
            return res.status(404).send('Property photo not found');
        }
        res.set('Content-Type', 'image/jpeg'); // Set the content type based on your image type
        res.send(propertyPhoto.photoURL); // Send the binary data as a response
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route to get the label of a property photo
app.get('/api/property-photos/:id/label', async (req, res) => {
    try {
        const propertyPhoto = await PropertyPhoto.findById(req.params.id);
        if (!propertyPhoto || !propertyPhoto.label) {
            return res.status(404).json({ message: 'Label not found' });
        }
        res.json({ label: propertyPhoto.label });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route to delete multiple property photos
app.delete('/api/property-photos/bulk-delete', async (req, res) => {
    try {
        const { photoIds } = req.body;
        if (!photoIds || !Array.isArray(photoIds)) {
            return res.status(400).json({ message: 'photoIds array is required' });
        }

        const result = await PropertyPhoto.deleteMany({ _id: { $in: photoIds } });
        res.json({ message: `${result.deletedCount} photos deleted successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// System Health Monitoring Endpoints

// MongoDB health check endpoint
app.get('/api/system/health/mongodb', async (req, res) => {
    try {
        // Check MongoDB connection by performing a simple operation
        const startTime = Date.now();
        await mongoose.connection.db.admin().ping();
        const endTime = Date.now();
        
        res.json({
            status: 'operational',
            service: 'MongoDB',
            responseTime: endTime - startTime,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('MongoDB health check failed:', error);
        res.status(500).json({
            status: 'degraded',
            service: 'MongoDB',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// General API health check endpoint
app.get('/api/system/health', async (req, res) => {
    try {
        // Check MongoDB connection
        let mongoStatus = 'operational';
        let mongoError = null;
        
        try {
            await mongoose.connection.db.admin().ping();
        } catch (error) {
            mongoStatus = 'degraded';
            mongoError = error.message;
        }
        
        // Return overall system health
        res.json({
            status: mongoStatus === 'operational' ? 'operational' : 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                api: {
                    status: 'operational',
                    uptime: process.uptime()
                },
                mongodb: {
                    status: mongoStatus,
                    error: mongoError
                }
            },
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        console.error('System health check failed:', error);
        res.status(500).json({
            status: 'degraded',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Performance metrics endpoint
app.post('/api/system/metrics', async (req, res) => {
    try {
        const { metric, value, tags } = req.body;
        
        if (!metric || typeof value !== 'number') {
            return res.status(400).json({ message: 'Invalid metric data' });
        }
        
        // In a real implementation, you would store this in a time-series database
        // For now, we'll just log it
        console.log(`METRIC: ${metric} = ${value}`, tags);
        
        res.status(201).json({ message: 'Metric recorded' });
    } catch (error) {
        console.error('Failed to record metric:', error);
        res.status(500).json({ message: error.message });
    }
});

// System logs endpoint
app.post('/api/system/logs', async (req, res) => {
    try {
        const { level, message, source, details } = req.body;
        
        if (!level || !message || !source) {
            return res.status(400).json({ message: 'Invalid log data' });
        }
        
        // Validate log level
        if (!['info', 'warning', 'error', 'debug'].includes(level)) {
            return res.status(400).json({ message: 'Invalid log level' });
        }
        
        // In a real implementation, you would store this in a log management system
        // For now, we'll just log it with the appropriate level
        switch (level) {
            case 'error':
                console.error(`[${source}] ${message}`, details);
                break;
            case 'warning':
                console.warn(`[${source}] ${message}`, details);
                break;
            case 'debug':
                console.debug(`[${source}] ${message}`, details);
                break;
            default:
                console.log(`[${source}] ${message}`, details);
        }
        
        res.status(201).json({ message: 'Log recorded' });
    } catch (error) {
        console.error('Failed to record log:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get recent system logs
app.get('/api/system/logs', async (req, res) => {
    try {
        const { level, source, limit = 100 } = req.query;
        
        // In a real implementation, you would query your log storage system
        // For now, we'll just return a mock response
        const mockLogs = [
            {
                level: 'info',
                message: 'Server started successfully',
                source: 'server',
                timestamp: new Date(Date.now() - 3600000).toISOString()
            },
            {
                level: 'warning',
                message: 'High memory usage detected',
                source: 'system-monitor',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                details: { memoryUsage: '85%' }
            },
            {
                level: 'error',
                message: 'Failed to process payment',
                source: 'payment-service',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                details: { errorCode: 'PAYMENT_FAILED' }
            }
        ];
        
        // Filter logs based on query parameters
        let filteredLogs = [...mockLogs];
        
        if (level) {
            filteredLogs = filteredLogs.filter(log => log.level === level);
        }
        
        if (source) {
            filteredLogs = filteredLogs.filter(log => log.source === source);
        }
        
        // Limit the number of logs returned
        filteredLogs = filteredLogs.slice(0, Math.min(parseInt(limit), 1000));
        
        res.json(filteredLogs);
    } catch (error) {
        console.error('Failed to retrieve logs:', error);
        res.status(500).json({ message: error.message });
    }
});

// User Management API Endpoints

// Middleware to check admin role
const checkAdminRole = (req, res, next) => {
    // In a real implementation, you would verify the user's token and check their role
    // For now, we'll use a simple API key approach for demonstration
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
    }
    
    next();
};

// Get users with pagination and filtering
app.get('/api/admin/users', checkAdminRole, async (req, res) => {
    try {
        const { 
            query = '', 
            role = 'all', 
            status = 'all',
            sortBy = 'createdAt',
            sortDirection = 'desc',
            page = 1,
            pageSize = 10
        } = req.query;
        
        // In a real implementation, you would query your database
        // For now, we'll return mock data
        const mockUsers = [
            {
                id: 'user1',
                email: 'user1@example.com',
                displayName: 'User One',
                role: 'user',
                status: 'active',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'user2',
                email: 'owner@example.com',
                displayName: 'Property Owner',
                role: 'owner',
                status: 'active',
                createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'user3',
                email: 'admin@example.com',
                displayName: 'Admin User',
                role: 'admin',
                status: 'active',
                createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 'user4',
                email: 'suspended@example.com',
                displayName: 'Suspended User',
                role: 'user',
                status: 'suspended',
                createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
                lastLogin: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        // Filter users based on query parameters
        let filteredUsers = [...mockUsers];
        
        if (query) {
            filteredUsers = filteredUsers.filter(user => 
                user.email.toLowerCase().includes(query.toLowerCase()) ||
                (user.displayName && user.displayName.toLowerCase().includes(query.toLowerCase()))
            );
        }
        
        if (role !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.role === role);
        }
        
        if (status !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.status === status);
        }
        
        // Sort users
        filteredUsers.sort((a, b) => {
            const aValue = a[sortBy];
            const bValue = b[sortBy];
            
            if (sortDirection === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
        
        // Paginate results
        const startIndex = (page - 1) * pageSize;
        const paginatedUsers = filteredUsers.slice(startIndex, startIndex + parseInt(pageSize));
        
        res.json({
            users: paginatedUsers,
            total: filteredUsers.length,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalPages: Math.ceil(filteredUsers.length / pageSize)
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID
app.get('/api/admin/users/:userId', checkAdminRole, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // In a real implementation, you would query your database
        const mockUsers = {
            'user1': {
                id: 'user1',
                email: 'user1@example.com',
                displayName: 'User One',
                role: 'user',
                status: 'active',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    lastIpAddress: '192.168.1.1',
                    lastDevice: 'Desktop',
                    lastBrowser: 'Chrome',
                    lastOs: 'Windows'
                }
            },
            'user2': {
                id: 'user2',
                email: 'owner@example.com',
                displayName: 'Property Owner',
                role: 'owner',
                status: 'active',
                createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                metadata: {
                    lastIpAddress: '192.168.1.2',
                    lastDevice: 'Mobile',
                    lastBrowser: 'Safari',
                    lastOs: 'iOS'
                }
            }
        };
        
        const user = mockUsers[userId];
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error(`Error fetching user ${req.params.userId}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Update user
app.put('/api/admin/users/:userId', checkAdminRole, async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        
        // Validate required fields
        if (!updates) {
            return res.status(400).json({ message: 'No update data provided' });
        }
        
        // In a real implementation, you would update the user in your database
        // For now, we'll just return success
        
        // Log this administrative action
        console.log(`Admin updated user ${userId}:`, updates);
        
        res.json({ message: 'User updated successfully', userId });
    } catch (error) {
        console.error(`Error updating user ${req.params.userId}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Update user status
app.put('/api/admin/users/:userId/status', checkAdminRole, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        
        // Validate status
        if (!status || !['active', 'suspended', 'inactive'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        
        // In a real implementation, you would update the user's status in your database
        // For now, we'll just return success
        
        // Log this administrative action
        console.log(`Admin updated user ${userId} status to ${status}`);
        
        res.json({ message: `User status updated to ${status}`, userId });
    } catch (error) {
        console.error(`Error updating status for user ${req.params.userId}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Update user role
app.put('/api/admin/users/:userId/role', checkAdminRole, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        
        // Validate role
        if (!role || !['user', 'owner', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role value' });
        }
        
        // In a real implementation, you would update the user's role in your database
        // For now, we'll just return success
        
        // Log this administrative action
        console.log(`Admin updated user ${userId} role to ${role}`);
        
        res.json({ message: `User role updated to ${role}`, userId });
    } catch (error) {
        console.error(`Error updating role for user ${req.params.userId}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Delete user
app.delete('/api/admin/users/:userId', checkAdminRole, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // In a real implementation, you would delete the user from your database
        // For now, we'll just return success
        
        // Log this administrative action
        console.log(`Admin deleted user ${userId}`);
        
        res.json({ message: 'User deleted successfully', userId });
    } catch (error) {
        console.error(`Error deleting user ${req.params.userId}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Get user activity history
app.get('/api/admin/users/:userId/activity', checkAdminRole, async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20 } = req.query;
        
        // In a real implementation, you would query your database
        // For now, we'll return mock data
        const mockActivities = [
            {
                id: 'act1',
                userId,
                action: 'login',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                ipAddress: '192.168.1.1',
                device: 'Desktop',
                browser: 'Chrome',
                os: 'Windows'
            },
            {
                id: 'act2',
                userId,
                action: 'password_changed',
                timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                ipAddress: '192.168.1.1',
                device: 'Desktop',
                browser: 'Chrome',
                os: 'Windows'
            },
            {
                id: 'act3',
                userId,
                action: 'profile_updated',
                timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                ipAddress: '192.168.1.2',
                device: 'Mobile',
                browser: 'Safari',
                os: 'iOS',
                details: { fields: ['displayName', 'photoURL'] }
            }
        ];
        
        res.json(mockActivities.slice(0, parseInt(limit)));
    } catch (error) {
        console.error(`Error fetching activity for user ${req.params.userId}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Send password reset email
app.post('/api/admin/users/:userId/reset-password', checkAdminRole, async (req, res) => {
    try {
        const { userId } = req.params;
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        // In a real implementation, you would send a password reset email
        // For now, we'll just return success
        
        // Log this administrative action
        console.log(`Admin initiated password reset for user ${userId} (${email})`);
        
        res.json({ message: 'Password reset email sent successfully', userId });
    } catch (error) {
        console.error(`Error sending password reset for user ${req.params.userId}:`, error);
        res.status(500).json({ message: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Middleware for tracking API performance
app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Add a listener for when the response is completed
    res.on('finish', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Log the API request performance
        console.log(`API ${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`);
        
        // In a real implementation, you would store this metric
    });
    
    next();
});
