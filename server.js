import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
