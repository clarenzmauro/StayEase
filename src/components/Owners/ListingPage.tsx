'use client'

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, addDoc, collection, GeoPoint, arrayUnion } from 'firebase/firestore';
import { supabase } from '../../supabase/supabase';
import './ListingPage.css';
import ListingOwnerSection from './ListingOwnerSection';

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
const furnishingOptions = ['Not Furnished', 'Semi-Furnished', 'Fully Furnished'];
const lifestyleOptions = ['Male', 'Female', 'Mixed Gender'];
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
  const [allowChatting, setAllowChatting] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [houseRules, setHouseRules] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('Basic Amenities');
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
        allowChat: allowChatting,
        isVerified: false,
        viewCount: 0,
        interestedCount: 0,
        interestedApplicants: [],
        comments: [],
        propertyPhotos: {
          count: images.length,
        },
        propertyTags: selectedTags,
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

  const handleChange = (name: string, value: string | number | boolean) => {
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleTagChange = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="property-container">
    {/* For Submit Button */}
      <div className="header">
        <button className="complete-button" onClick={handleSubmit}>Submit Listing</button>
      </div>

    {/* Left Side - Property Form */}
    <div className="property-form">
        <div className="card">
          <h2>Property Details</h2>
          <div className="form-group">
            <label htmlFor="name">Property Name</label>
            <input
              id="name"
              value={details.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter property name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="location">Property Location</label>
            <input
              id="location"
              value={details.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="Enter property location"
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Property Description</label>
            <textarea
              id="description"
              value={details.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter property description"
            />
          </div>
        </div>

        <div className="card">
          <h2>Additional Info</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="type">Property Type</label>
              <select
                id="type"
                value={details.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                {propertyTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="availableFrom">Available From</label>
              <input
                id="availableFrom"
                type="date"
                value={details.availableFrom}
                onChange={(e) => handleChange('availableFrom', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="maxOccupants">Max Occupants</label>
              <input
                id="maxOccupants"
                type="number"
                value={details.maxOccupants}
                onChange={(e) => handleChange('maxOccupants', parseInt(e.target.value))}
                min={1}
              />
            </div>
            <div className="form-group">
              <label htmlFor="floorLevel">Floor Level</label>
              <input
                id="floorLevel"
                type="number"
                value={details.floorLevel}
                onChange={(e) => handleChange('floorLevel', parseInt(e.target.value))}
                min={1}
              />
            </div>
            <div className="form-group">
              <label htmlFor="furnishing">Furnishing</label>
              <select
                id="furnishing"
                value={details.furnishing}
                onChange={(e) => handleChange('furnishing', e.target.value)}
              >
                {furnishingOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="lifestyle">Lifestyle</label>
              <select
                id="lifestyle"
                value={details.lifestyle}
                onChange={(e) => handleChange('lifestyle', e.target.value)}
              >
                {lifestyleOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="size">Size (sqm)</label>
              <input
                id="size"
                type="number"
                value={details.size}
                onChange={(e) => handleChange('size', parseInt(e.target.value))}
                min={0}
              />
            </div>
            <div className="form-group">
              <label htmlFor="bedroomCount">Bedroom Count</label>
              <input
                id="bedroomCount"
                type="number"
                value={details.bedrooms}
                onChange={(e) => handleChange('bedrooms', parseInt(e.target.value))}
                min={0}
              />
            </div>
            <div className="form-group">
              <label htmlFor="bathroomCount">Bathroom Count</label>
              <input
                id="bathroomCount"
                type="number"
                value={details.bathrooms}
                onChange={(e) => handleChange('bathrooms', parseInt(e.target.value))}
                min={0}
              />
            </div>
            <div className="form-group checkbox-group">
              <input
                id="allowViewing"
                type="checkbox"
                checked={details.allowViewing}
                onChange={(e) => handleChange('allowViewing', e.target.checked)}
              />
              <label htmlFor="allowViewing">Allow Viewing</label>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>What the Place Offers</h2>
          <div className="tabs">
            {Object.keys(tagCategories).map((category) => (
              <button
                key={category}
                className={`tab ${activeTab === category ? 'active' : ''}`}
                onClick={() => setActiveTab(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="tag-grid">
            {tagCategories[activeTab as keyof typeof tagCategories].map((tag) => (
              <div key={tag} className="tag-item">
                <input
                  type="checkbox"
                  id={tag}
                  checked={selectedTags.includes(tag)}
                  onChange={() => handleTagChange(tag)}
                />
                <label htmlFor={tag}>{tag}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
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

        <div className="card">
          <h2>Pricing</h2>
          <div className="form-group">
            <label htmlFor="price">Price per Month</label>
            <input
              id="price"
              type="number"
              value={details.price}
              onChange={(e) => handleChange('price', parseInt(e.target.value))}
              min={0}
            />
          </div>
          <div className="form-group">
            <label htmlFor="securityDeposit">Security Deposit</label>
            <input
              id="securityDeposit"
              type="number"
              value={details.securityDeposit}
              onChange={(e) => handleChange('securityDeposit', parseInt(e.target.value))}
              min={0}
            />
          </div>
          <div className="form-group">
            <label htmlFor="leaseTerm">Lease Term (months)</label>
            <input
              id="leaseTerm"
              type="number"
              value={details.leaseTerm}
              onChange={(e) => handleChange('leaseTerm', parseInt(e.target.value))}
              min={1}
            />
          </div>
        </div>
      </div>
    {/* Left Side - Property Form */}
    
    {/* For the image */}
      <div className="image-grid">
        <div
          onClick={() => setIsModalOpen(true)}
          className="main-image">
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
              className="thumbnail">
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
    {/* For the image */}
        
        <ListingOwnerSection
          ownerId= { id || '' }
          onAllowChattingChange={setAllowChatting}
        />

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
    </div>
  );
}

export default ListingPage;