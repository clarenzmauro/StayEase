import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin for server-side operations
let serviceAccount = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the JSON from environment variable
    const parsedAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    // Handle the private key specifically - this is often the source of issues
    if (parsedAccount.private_key) {
      // Ensure private key has proper newlines
      parsedAccount.private_key = parsedAccount.private_key.replace(/\\n/g, '\n');
    }
    
    serviceAccount = parsedAccount;
    console.log("[Server] Firebase service account loaded from environment variable");
  }
} catch (error) {
  console.error("[Server] Error parsing Firebase service account from environment variable:", error.message);
  
  // In Vercel environment, we don't try to load from a local file
  if (process.env.NODE_ENV !== 'production') {
    // Only try loading from a file in development environment
    try {
      const serviceAccountPath = '/Users/clarenzmauro/Desktop/stayease-ca1cb-firebase-adminsdk-dg5uv-74e5cd4c1e.json';
      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log("[Server] Firebase service account loaded from file");
      }
    } catch (fileError) {
      console.error("[Server] Error loading Firebase service account from file:", fileError.message);
    }
  }
}

if (serviceAccount) {
  try {
    // Initialize Firebase Admin with the service account
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("[Server] Firebase Admin initialized successfully");
  } catch (initError) {
    console.error("[Server] Error initializing Firebase Admin:", initError);
    serviceAccount = null;
  }
} else {
  console.warn('[Server] Firebase service account not configured. Scheduled availability notifications will not work.');
}

const firestore = serviceAccount ? getFirestore() : null;

app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // For parsing application/json

// Connect to MongoDB only if MONGODB_URI is provided
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.warn('[Server] MongoDB URI not provided. Database features will not work.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  secure: true,
  tls: {
    // Do not fail on invalid certificates
    rejectUnauthorized: false
  },
  debug: false, // Disable debug output in production
  logger: false // Disable logging in production
});

// Verify transporter connection at startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('[Server] Nodemailer verification failed:', error);
    if (error.code === 'EAUTH') {
      console.error('[Server] Authentication error - check your email credentials');
    }
  } else {
    console.log('[Server] Nodemailer server is ready');
  }
});

// Email API endpoint
app.post('/api/email/nodemailer/send', async (req, res) => {
  const { to, subject, html, attachments } = req.body;

  if (!to || !subject || !html) {
    console.error('[Server] Missing required email fields');
    return res.status(400).json({ message: 'Missing required fields: to, subject, or html' });
  }
  
  const mailOptions = {
    from: `"StayEase" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments: attachments || []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Server] Email sent successfully to ${to}`);
    res.status(200).json({ 
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('[Server] Error sending email:', error.message);
    res.status(500).json({ 
      message: 'Failed to send email', 
      error: error.message,
      code: error.code
    });
  }
});

// Test endpoint for email sending (sends to self)
app.get('/api/email/test', async (req, res) => {
  try {
    const testMailOptions = {
      from: `"StayEase Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'StayEase Email Test ' + new Date().toLocaleTimeString(),
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4a6ee0; text-align: center;">StayEase Test Email</h2>
          <div style="line-height: 1.6; margin: 20px 0;">
            <p>This is a test email to verify the Nodemailer configuration.</p>
            <p>Test timestamp: ${new Date().toISOString()}</p>
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777; margin-top: 20px; border-top: 1px solid #ddd;">
            <p>This is an automated test email from StayEase.</p>
            <p>&copy; ${new Date().getFullYear()} StayEase. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(testMailOptions);
    console.log(`[Server] Test email sent to self (${process.env.EMAIL_USER})`);
    
    res.json({
      success: true,
      message: 'Test email sent',
      details: {
        messageId: info.messageId
      }
    });
  } catch (error) {
    console.error('[Server] Error sending test email:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

// Test endpoint for email sending to a specific email address
app.get('/api/email/test-to/:email', async (req, res) => {
  const targetEmail = req.params.email;
  
  if (!targetEmail || !targetEmail.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address provided'
    });
  }
  
  try {
    const testMailOptions = {
      from: `"StayEase Test" <${process.env.EMAIL_USER}>`,
      to: targetEmail,
      subject: 'StayEase Email Test to User ' + new Date().toLocaleTimeString(),
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4a6ee0; text-align: center;">StayEase Test Email</h2>
          <div style="line-height: 1.6; margin: 20px 0;">
            <p>This is a test email to verify the Nodemailer configuration.</p>
            <p>Test timestamp: ${new Date().toISOString()}</p>
            <p>This email was sent to: ${targetEmail}</p>
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777; margin-top: 20px; border-top: 1px solid #ddd;">
            <p>This is an automated test email from StayEase.</p>
            <p>&copy; ${new Date().getFullYear()} StayEase. All rights reserved.</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(testMailOptions);
    console.log(`[Server] Test email sent to ${targetEmail}`);
    
    res.json({
      success: true,
      message: `Test email sent to ${targetEmail}`,
      details: {
        messageId: info.messageId
      }
    });
  } catch (error) {
    console.error('[Server] Error sending test email:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

// Add a test endpoint to verify Firestore connection
app.get('/api/test-firebase', async (req, res) => {
  if (!firestore) {
    return res.status(500).json({
      success: false,
      message: 'Firebase is not initialized'
    });
  }
  
  try {
    // Attempt to make a simple Firestore query
    const snapshot = await firestore.collection('properties').limit(1).get();
    
    return res.json({
      success: true,
      message: 'Firebase connection successful',
      count: snapshot.size,
      working: true
    });
  } catch (error) {
    console.error('[Server] Error testing Firebase connection:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error connecting to Firebase',
      error: error.message
    });
  }
});

// Function to check for properties that will be available in 3 days and send notifications
async function checkPropertyAvailability() {
  console.log('[Server] Running property availability check');
  
  if (!firestore) {
    console.error('[Server] Firebase not initialized, skipping availability check');
    return;
  }
  
  try {
    // Get current date and calculate target date (3 days from now)
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    // Set time to beginning of day for accurate comparison
    threeDaysFromNow.setHours(0, 0, 0, 0);
    
    // Calculate the timestamp ranges for the target date (start and end of day)
    const startOfTargetDay = Math.floor(threeDaysFromNow.getTime() / 1000);
    const endOfTargetDay = startOfTargetDay + (24 * 60 * 60 - 1); // End of the day (23:59:59)
    
    // Query Firestore for properties with availability date in the target range
    const propertiesSnapshot = await firestore.collection('properties')
      .where('dateAvailability.seconds', '>=', startOfTargetDay)
      .where('dateAvailability.seconds', '<=', endOfTargetDay)
      .get();
    
    console.log(`[Server] Found ${propertiesSnapshot.size} properties with upcoming availability`);
    
    // Process each property
    for (const doc of propertiesSnapshot.docs) {
      const property = { id: doc.id, ...doc.data() };
      
      // Only process properties with interested applicants
      if (!property.interestedApplicants || property.interestedApplicants.length === 0) {
        continue;
      }
      
      // Exact availability date for the email
      const availabilityDate = new Date(property.dateAvailability.seconds * 1000);
      
      // For each interested user, fetch their data and send an email
      for (const userId of property.interestedApplicants) {
        try {
          const userDoc = await firestore.collection('accounts').doc(userId).get();
          
          if (!userDoc.exists) {
            continue;
          }
          
          const userData = userDoc.data();
          
          if (!userData.email) {
            continue;
          }
          
          // Prepare and send email
          const emailSubject = `Property Alert: ${property.propertyName} will be available soon!`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
              <h2 style="color: #4a6ee0; text-align: center;">StayEase Property Alert</h2>
              <div style="line-height: 1.6; margin: 20px 0;">
                <p>Hello ${userData.username || 'there'},</p>
                <p>Good news! <strong>${property.propertyName}</strong> that you're interested in will be available in 3 days (${availabilityDate.toLocaleDateString()}).</p>
                <p>Property details:</p>
                <ul>
                  <li>Location: ${property.propertyLocation || 'N/A'}</li>
                  <li>Price: $${property.propertyPrice ? property.propertyPrice.toLocaleString() : 'N/A'}</li>
                  <li>Type: ${property.propertyType || 'N/A'}</li>
                  <li>Size: ${property.propertySize ? `${property.propertySize} sq ft` : 'N/A'}</li>
                </ul>
                <p>Don't miss this opportunity! Log in to StayEase to take action on this property.</p>
                <p>Best regards,<br/>The StayEase Team</p>
              </div>
              <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777; margin-top: 20px; border-top: 1px solid #ddd;">
                <p>This is an automated email from StayEase. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} StayEase. All rights reserved.</p>
              </div>
            </div>
          `;
          
          const mailOptions = {
            from: `"StayEase" <${process.env.EMAIL_USER}>`,
            to: userData.email,
            subject: emailSubject,
            html: emailHtml
          };
          
          // Send the email
          const info = await transporter.sendMail(mailOptions);
          console.log(`[Server] Sent availability notification to ${userData.email} for property ${property.propertyName}`);
          
        } catch (userError) {
          console.error(`[Server] Error processing user notification:`, userError);
        }
      }
    }
    
    console.log('[Server] Completed property availability check');
    
  } catch (error) {
    console.error('[Server] Error checking property availability:', error);
  }
}

// Schedule the availability check to run daily at 8:00 AM
cron.schedule('0 8 * * *', () => {
  console.log('[Server] Running scheduled availability check');
  checkPropertyAvailability();
});

// Add an endpoint to manually trigger the availability check (for testing)
app.get('/api/availability-check', async (req, res) => {
  try {
    await checkPropertyAvailability();
    res.json({
      success: true,
      message: 'Property availability check completed successfully'
    });
  } catch (error) {
    console.error('[Server] Error during availability check:', error);
    res.status(500).json({
      success: false,
      message: 'Error during property availability check',
      error: error.message
    });
  }
});

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
            return res.status(400).json({
              message: 'photoIds array is required'
            });
        }

        const result = await PropertyPhoto.deleteMany({ _id: { $in: photoIds } });
        res.json({ message: `${result.deletedCount} photos deleted successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  // Only start the server in development mode
  // In Vercel, this file is imported as a serverless function
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Email configured for: ${process.env.EMAIL_USER}`);
    console.log('Server initialization complete');
  });
}

// Export the Express app for Vercel serverless functions
export default app;
