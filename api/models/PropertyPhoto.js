import mongoose from 'mongoose';

const propertyPhotoSchema = new mongoose.Schema({
  label: { 
    type: String, 
    required: true 
  },
  photoURL: { 
    type: Buffer,
    required: true
  }
}, {
  timestamps: true
});

// Ensure the model is properly initialized
const PropertyPhoto = mongoose.models.PropertyPhoto || 
  mongoose.model('PropertyPhoto', propertyPhotoSchema, 'propertyPhotos');

export default PropertyPhoto;