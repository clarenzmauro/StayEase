import mongoose from 'mongoose';

const propertyPhotoSchema = new mongoose.Schema({
  label: { type: String, required: true },
  photoURL: { type: Buffer, required: true },
});

export default mongoose.models.PropertyPhoto || 
  mongoose.model('PropertyPhoto', propertyPhotoSchema, 'propertyPhotos');