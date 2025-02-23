import mongoose from 'mongoose';

const propertyPhotoSchema = new mongoose.Schema({
  label: { type: String, required: true },
  photoURL: {
    type: mongoose.Schema.Types.Mixed,  // Can be either Buffer or String
    required: true,
    validate: {
      validator: function(v) {
        // Valid if it's either a Buffer or a URL string
        return Buffer.isBuffer(v) || (typeof v === 'string' && v.startsWith('http'));
      },
      message: 'PhotoURL must be either a Buffer or a valid URL'
    }
  }
}, {
  timestamps: true
});

// Ensure the model is properly initialized
export default mongoose.models.PropertyPhoto || mongoose.model('PropertyPhoto', propertyPhotoSchema, 'propertyPhotos');