import mongoose from 'mongoose';

const propertyPhotoSchema = new mongoose.Schema({
  label: { type: String, required: true },
  photoURL: { type: Buffer, required: true }
}, {
  timestamps: true
});

// Ensure the model is properly initialized
export default mongoose.models.PropertyPhoto || mongoose.model('PropertyPhoto', propertyPhotoSchema, 'propertyPhotos');