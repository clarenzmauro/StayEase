'use client'

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, addDoc, collection, GeoPoint, arrayUnion } from 'firebase/firestore';
import { supabase } from '../../supabase/supabase';
import './ListingPage.css';

interface Image {
  url: string;
  label: string;
  file: File | null;
}

interface PropertyDetails {
  name: string;
  location: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  tags: string[];
  views: number;
  price: number;
  availableFrom: string;
  maxOccupants: number;
  floorLevel: number;
  furnishing: string;
  allowViewing: boolean;
  allowChat: boolean;
  size: number;
  securityDeposit: number;
  leaseTerm: number;
  lifestyle?: string;
}

const propertyTypes = ['Dormitory', 'Apartment', 'Room', 'House', 'Condo'];

const tagCategories = {
  'Basic Amenities': ['Pet Friendly', 'With Parking', 'With Wi-fi', 'With Aircon', 'With Kitchen', 'With Laundry'],
  'Proximity': ['Near Campus', 'Near Grocery', 'Near Church', 'Near Hospital', 'Near Restaurant', 'Near Gym', 'Near Park', 'Near Public Transpo'],
  'Room Features': ['Single Room', 'Shared Room', 'With Balcony', 'With Storage', 'With Study Desk'],
  'Safety': ['With Guard', 'With CCTV', 'With Curfew'],
  'Payment': ['Electric Bill Included', 'Water Bill Included', 'No Security Deposit', 'Flexible Payment Terms']
};

export function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [houseRules, setHouseRules] = useState<string[]>([]);
  const [details, setDetails] = useState<PropertyDetails>({
    name: "Enter Property Name",
    location: "Enter Property Location",
    type: 'Dormitory',
    bedrooms: 0,
    bathrooms: 0,
    description: 'Enter Property Description',
    tags: [],
    views: 0,
    price: 0,
    availableFrom: "Enter Date of Availability",
    maxOccupants: 0,
    floorLevel: 0,
    furnishing: "Enter Furnishing Status",
    allowViewing: true,
    allowChat: true,
    size: 0,
    securityDeposit: 0,
    leaseTerm: 0,
    lifestyle: "Mixed Gender"
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async () => {
    try {

      const propertyData = {
        propertyName: details.name,
        propertyLocation: details.location,
        propertyLocationGeo: new GeoPoint(0, 0),
        propertyDesc: details.description,
        propertyType: details.type,
        ownerId: id,
        datePosted: new Date(),
        bedroomCount: details.bedrooms,
        bathroomCount: details.bathrooms,
        propertyPrice: details.price,
        dateAvailability: new Date(details.availableFrom),
        maxOccupants: details.maxOccupants,
        floorLevel: details.floorLevel,
        furnishingStatus: details.furnishing,
        propertyLifestyle: details.lifestyle,
        propertySize: details.size,
        securityDeposit: details.securityDeposit,
        leaseTerm: details.leaseTerm,
        allowViewing: details.allowViewing,
        allowChat: true,
        isVerified: false,
        viewCount: 0,
        interestedCount: 0,
        interestedApplicants: [],
        comments: [],
        propertyPhotos: {
          count: images.length,
        },
        propertyTags: details.tags,
        houseRules: houseRules
      };

      const propertyRef = collection(db, 'properties');
      const docRef = await addDoc(propertyRef, propertyData);

      const imagesData: { [key: string]: { pictureUrl: string; label: string } } = {};
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (image.file) {
          try {
            // Upload to Supabase
            const filePath = `${docRef.id}/photo${i}`;
            const { error } = await supabase.storage
              .from('properties')
              .upload(filePath, image.file, {
                cacheControl: '3600',
                upsert: false // Set to true if you want to allow overwriting
              });
      
            if (error) {
              throw error;
            }
      
            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
              .from('properties')
              .getPublicUrl(filePath);
      
            imagesData[`photo${i}`] = {
              pictureUrl: publicUrl,
              label: image.label
            };
          } catch (error) {
            console.error('Error uploading image:', error);
            // Handle error appropriately
          }
        } else {
          console.warn('No file selected for image', i);
        }
      }

      await updateDoc(docRef, {
        propertyPhotos: imagesData,
        count: images.length
      });
      
      console.log('Document written with ID: ', docRef.id);
  alert('Property added successfully!');

  if (!id) {
    throw new Error('Owner ID is undefined or invalid.');
  }

  const ownerDoc = await getDoc(doc(db, 'accounts', id));
  if (ownerDoc.exists()) {
    const ownerData = ownerDoc.data();
    const dashboardId = ownerData.dashboardId;

    if (dashboardId) {
      const dashboardRef = doc(db, 'dashboards', dashboardId);

      await updateDoc(dashboardRef, {
        listedDorms: arrayUnion(docRef.id),
      });

      console.log('Dashboard updated successfully!');
    } else {
      console.error('Dashboard ID not found.');
    }
  } else {
    console.error('Owner document does not exist.');
  }
} catch (error) {
  console.error('Error adding document: ', error);
  alert('Error adding property. Please try again.');
}
  };

  const handleAddRule = () => {
    setHouseRules([...houseRules, '']);
  };

  const handleRemoveRule = (index: number) => {
    setHouseRules(houseRules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, value: string) => {
    const newRules = [...houseRules];
    newRules[index] = value;
    setHouseRules(newRules);
  };

  const handleImageSave = () => {
    setIsModalOpen(false);
  };

  const handleAddMore = () => {
    setImages([...images, { url: '', label: '', file: null }]);
  };

  const handleRemove = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleLabelChange = (index: number, value: string) => {
    const newImages = [...images];
    newImages[index].label = value;
    setImages(newImages);
  };

  const handleFileChange = (index: number, file: File | null) => {
    const newImages = [...images];
    if (file) {
      newImages[index] = {
        url: URL.createObjectURL(file),
        label: newImages[index].label || file.name,
        file: file
      };
    }
    setImages(newImages);
  };

  const handleEditSubmit = (updatedDetails: PropertyDetails) => {
    setDetails(updatedDetails);
    setIsEditModalOpen(false);
  };

  return (
    <div className="property-container">
      <div className="header">
        <div className="title-section">
          <input
            type="text"
            value={details.name}
            onChange={(e) => setDetails({...details, name: e.target.value})}
            className="title-input"
            placeholder="Property Title"
          />
          <input
            type="text"
            value={details.location}
            onChange={(e) => setDetails({...details, location: e.target.value})}
            className="location-input"
            placeholder="Location"
          />
        </div>
        <button className="complete-button" onClick={handleSubmit}>Submit Listing</button>
      </div>

      <div className="image-grid">
        <div
          onClick={() => setIsModalOpen(true)}
          className="main-image"
        >
          {images[0] ? (
            <img
              src={images[0].url}
              alt={images[0].label}
              className="image"
            />
          ) : (
            <p className="placeholder-text">Click to add images</p>
          )}
        </div>
        <div className="thumbnail-grid">
          {[1, 2, 3, 4].map((index) => (
            <div
              key={index}
              onClick={() => setIsModalOpen(true)}
              className="thumbnail"
            >
              {images[index] && (
                <img
                  src={images[index].url}
                  alt={images[index].label}
                  className="image"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="content-wrapper">
        <button className="edit-button" onClick={() => setIsEditModalOpen(true)}>Edit Property</button>
        <div className="main-content">
          <div className="host-section">
            <h2>Hosted by Mann Lester Magbuhos</h2>
            <div className="property-stats">
              <span>{details.bedrooms} bedroom</span>
              <span>•</span>
              <span>{details.bathrooms} bath</span>
              <span>•</span>
              <span>{details.views} views</span>
            </div>
          </div>

          <div className="about-section">
            <h2>About this place</h2>
            <p>{details.description}</p>
          </div>

          <div className="offers-section">
            <h2>What this place offers</h2>
            <div className="amenities-grid">
              {details.tags.map((tag, index) => (
                <div key={index} className="amenity-item">
                  <span className="checkmark">✓</span>
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="house-rules-section">
  <h2>House Rules</h2>
  {houseRules.map((rule, index) => (
    <div key={index} className="house-rule-item">
      <input
        type="text"
        value={rule}
        onChange={(e) => handleRuleChange(index, e.target.value)}
        placeholder="Enter house rule"
      />
      <button onClick={() => handleRemoveRule(index)}>Remove</button>
    </div>
  ))}
  <button onClick={handleAddRule}>Add House Rule</button>
</div>

        <div className="sidebar">
          <div className="price-card">
            <div className="price-header">
              <span className="price">₱{details.price}</span>
              <span className="price-period">/month</span>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Price:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={details.price}
                    onChange={(e) => setDetails({...details, price: Number(e.target.value)})}
                    className="detail-input"
                  />
                ) : (
                  <span className="detail-value">₱{details.price}/month</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Available from:</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={details.availableFrom}
                    onChange={(e) => setDetails({...details, availableFrom: e.target.value})}
                    className="detail-input"
                  />
                ) : (
                  <span className="detail-value">{details.availableFrom}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Max occupants:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={details.maxOccupants}
                    onChange={(e) => setDetails({...details, maxOccupants: Number(e.target.value)})}
                    className="detail-input"
                  />
                ) : (
                  <span className="detail-value">{details.maxOccupants}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Floor Level:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={details.floorLevel}
                    onChange={(e) => setDetails({...details, floorLevel: Number(e.target.value)})}
                    className="detail-input"
                  />
                ) : (
                  <span className="detail-value">{details.floorLevel}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Furnishing:</span>
                {isEditing ? (
                  <select
                    value={details.furnishing}
                    onChange={(e) => setDetails({...details, furnishing: e.target.value})}
                    className="detail-input"
                  >
                    <option value="not furnished">Not furnished</option>
                    <option value="semi-furnished">Semi-furnished</option>
                    <option value="fully furnished">Fully furnished</option>
                  </select>
                ) : (
                  <span className="detail-value">{details.furnishing}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Lifestyle:</span>
                {isEditing ? (
                  <select
                    value={details.lifestyle || 'Mixed Gender'}
                    onChange={(e) => setDetails({...details, lifestyle: e.target.value})}
                    className="detail-input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Mixed Gender">Mixed Gender</option>
                  </select>
                ) : (
                  <span className="detail-value">{details.lifestyle || 'Mixed Gender'}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Size:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={details.size}
                    onChange={(e) => setDetails({...details, size: Number(e.target.value)})}
                    className="detail-input"
                  />
                ) : (
                  <span className="detail-value">{details.size}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Security Deposit:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={details.securityDeposit}
                    onChange={(e) => setDetails({...details, securityDeposit: Number(e.target.value)})}
                    className="detail-input"
                  />
                ) : (
                  <span className="detail-value">₱{details.securityDeposit}</span>
                )}
              </div>
              <div className="detail-item">
                <span className="detail-label">Lease Term:</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={details.leaseTerm}
                    onChange={(e) => setDetails({...details, leaseTerm: Number(e.target.value)})}
                    className="detail-input"
                  />
                ) : (
                  <span className="detail-value">{details.leaseTerm} months</span>
                )}
              </div>
              <div className="detail-item">
  <span className="detail-label">Allow Viewing:</span>
  {isEditing ? (
    <select
      value={details.allowViewing ? "true" : "false"} // Map boolean to string for value
      onChange={(e) =>
        setDetails({
          ...details,
          allowViewing: e.target.value === "true", // Convert string back to boolean
        })
      }
      className="detail-input"
    >
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  ) : (
    <span className="detail-value">
      {details.allowViewing ? "Yes" : "No"} {/* Display as readable text */}
    </span>
  )}
</div>
            </div>

            <div className="button-group">
              <button 
                className="edit-button" 
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Save' : 'Edit'}
              </button>
              <button 
                className="clear-button" 
                onClick={() => {
                  if (isEditing) {
                    // Reset to original values
                    setDetails({...details});
                  }
                  setIsEditing(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Manage Images</h2>
              <button className="close-button" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <div className="modal-content">
              {images.map((image, index) => (
                <div key={index} className="image-item">
                  <div className="image-preview">
                    {image.url ? (
                      <img src={image.url} alt={image.label} className="preview-image" />
                    ) : (
                      <div className="empty-preview">No image</div>
                    )}
                  </div>
                  <div className="image-details">
                    <input
                      type="text"
                      value={image.label}
                      onChange={(e) => handleLabelChange(index, e.target.value)}
                      placeholder="Enter image label"
                      className="input"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                      className="file-input"
                    />
                    <button 
                      className="remove-button"
                      onClick={() => handleRemove(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button className="add-button" onClick={handleAddMore}>
                + Add Another Image
              </button>
            </div>
            <div className="modal-footer">
              <button className="save-button" onClick={handleImageSave}>
                Save Images
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <EditPropertyModal
          details={details}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
}

interface EditPropertyModalProps {
  details: PropertyDetails;
  onClose: () => void;
  onSubmit: (updatedDetails: PropertyDetails) => void;
}

function EditPropertyModal({ details, onClose, onSubmit }: EditPropertyModalProps) {
  const [formData, setFormData] = useState<PropertyDetails>(details);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleTagChange = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal edit-modal">
        <div className="modal-header">
          <h2>Edit Property</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="form-group">
            <label htmlFor="name">Property Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="location">Location:</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="type">Property Type:</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              {propertyTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="bedrooms">Bedroom Count:</label>
            <input
              type="number"
              id="bedrooms"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleNumberChange}
              min="0"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="bathrooms">Bathroom Count:</label>
            <input
              type="number"
              id="bathrooms"
              name="bathrooms"
              value={formData.bathrooms}
              onChange={handleNumberChange}
              min="0"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Tags:</label>
            <div className="tags-container">
              {Object.entries(tagCategories).map(([category, tags]) => (
                <div key={category} className="tag-category">
                  <h4>{category}</h4>
                  {tags.map(tag => (
                    <label key={tag} className="tag-label">
                      <input
                        type="checkbox"
                        checked={formData.tags.includes(tag)}
                        onChange={() => handleTagChange(tag)}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="save-button">Save Changes</button>
            <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ListingPage;

