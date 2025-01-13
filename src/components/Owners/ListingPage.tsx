'use client'

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, addDoc, collection, GeoPoint, arrayUnion, Timestamp } from 'firebase/firestore';
import { supabase } from '../../supabase/supabase';
import axios from 'axios'; // Import axios
import './ListingPage.css';
import ListingOwnerSection from './ListingOwnerSection';
import { get } from 'firebase/database';
import PropertyPage from '../Property Page/PropertyPage';

interface Image {
  url: string;
  label: string;
  file: File | null;
}

interface PropertyDetails {
  name: string;
  location: string;
  mapsLink: string; // Add this new field
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
    mapsLink: "", // Add this new field
    type: 'Dormitory',
    bedrooms: 0,
    bathrooms: 0,
    description: 'Enter Property Description',
    tags: [],
    views: 0,
    price: 0,
    availableFrom: "",
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

  useEffect(() => {
    if (window.location.pathname === `/property/${id}/edit-property`) {
      console.log("Is editing");
      setIsEditing(true);
      fetchPropertyData(id);
    }
  }, [id]);

  const fetchPropertyData = async (propertyId? : string) => {
    try{
      if (!propertyId) {
        alert('Property ID is undefined.');
        return; // Exit the function if propertyId is not defined
      }
      
      const docRef = doc(db, 'properties', propertyId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const propertyData = docSnap.data();
        
        const parseDate = (dateValue: any) => {
          if (dateValue instanceof Timestamp) {
            return dateValue.toDate(); // Convert Firestore Timestamp to Date
          } else if (typeof dateValue === 'string') {
            const parsedDate = new Date(dateValue);
            if (isNaN(parsedDate.getTime())) {
              throw new Error('Invalid date format');
            }
            return parsedDate;
          } else {
            console.error('Invalid date format:', dateValue);
            return new Date(); // Fallback to current date if parsing fails
          }
        };
  
        const availableDate = propertyData.dateAvailability 
        ? parseDate(propertyData.dateAvailability) 
        : new Date();

        const photos = [];
for (let i = 0; i < propertyData.count; i++) {
  const photo = propertyData.propertyPhotos[`photo${i}`];
  if (photo) {
    photos.push({
      label: photo.label,
      url: photo.pictureUrl,
      file: null, // Set file to null if not available
    });
  }
}


        setDetails({
          name: propertyData.propertyName || "Enter Property Name",
          location: propertyData.propertyLocation || "Enter Property Location",
          mapsLink: propertyData.propertyLocationGeoPoint || "",
          type: propertyData.propertyType || 'Dormitory',
          bedrooms: propertyData.bedroomCount || 0,
          bathrooms: propertyData.bathroomCount || 0,
          description: propertyData.propertyDesc || 'Enter Property Description',
          tags: propertyData.propertyTags || [],
          views: propertyData.viewCount || 0,
          price: propertyData.propertyPrice || 0,
          availableFrom: availableDate.toISOString().split('T')[0],
          maxOccupants: propertyData.maxOccupants || 0,
          floorLevel: propertyData.floorLevel || 0,
          furnishing: propertyData.furnishingStatus || "Enter Furnishing Status",
          allowViewing: propertyData.allowViewing !== undefined ? propertyData.allowViewing : true,
          allowChat: propertyData.allowChat !== undefined ? propertyData.allowChat : true,
          size: propertyData.propertySize || 0,
          securityDeposit: propertyData.securityDeposit || 0,
          leaseTerm: propertyData.leaseTerm || 0,
          lifestyle: propertyData.lifestyle || "Mixed Gender",
        });


        setImages(photos);
        setHouseRules(propertyData.houseRules || []);
        setSelectedTags(propertyData.propertyTags || []);
      } else {
        alert('No such Property');
      }
    }catch (error){
      console.error('Error fetching', error);
      alert("Error fetching");
    }
  }

  const handleSubmit = async () => {
    try {
      let docRef;
      // Extract coordinates from the maps link if available
      let geoPoint = new GeoPoint(0, 0);
      if (details.mapsLink) {
        try {
          const response = await axios.get(`/api/expand-maps-url?url=${encodeURIComponent(details.mapsLink)}`);
          const coordinates = response.data;
          geoPoint = new GeoPoint(coordinates.latitude, coordinates.longitude);
        } catch (error) {
          console.error('Error extracting coordinates from Maps link:', error);
        }
      }

      const propertyData = {
        propertyName: details.name,
        propertyLocation: details.location,
        propertyMapsLink: details.mapsLink,
        propertyLocationGeo: geoPoint,
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
      if (isEditing) {
        if (!id) {
          alert('Property ID is undefined. Cannot update property.');
          return;
        }
        // Update existing property
        docRef = doc(db, 'properties', id); // Use the existing ID
        await updateDoc(docRef, propertyData);
        alert('Property updated successfully!');
      } else {
        // Add new property
        const propertyRef = collection(db, 'properties');
        docRef = await addDoc(propertyRef, propertyData);
        alert('Property added successfully!');
      }
         // Handle image uploads
        await handleImageUploads(docRef.id);

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

  const handleImageUploads = async (propertyId: string) => {
    const imagesData: { [key: string]: { pictureUrl: string; label: string } } = {};
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (image.file) {
        try {
          // Upload to Supabase
          const filePath = `${propertyId}/photo${i}`;
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

  await updateDoc(doc(db, 'properties', propertyId), {
    propertyPhotos: imagesData,
    count: images.length
  });
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
      {/* Header with submit button */}
      <div className="header">
        <button className="complete-button" onClick={handleSubmit}>
          {isEditing ? 'Save Edit' : 'Submit Listing'}
        </button>
      </div>

      {/* Main content wrapper */}
      <div className="content-wrapper">
        {/* Left Side - Property Form */}
        <div className="property-form">
          <div className="property-details">
            <h2>Property Details</h2>
            
            <div className="form-group">
              <label htmlFor="propertyName">Property Name</label>
              <input
                id="propertyName"
                type="text"
                placeholder="Enter Property Name"
                value={details.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="propertyLocation">Property Location</label>
              <input
                id="propertyLocation"
                type="text"
                placeholder="Enter Property Location"
                value={details.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="propertyMapsLink">Google Maps Link (optional)</label>
              <input
                id="propertyMapsLink"
                type="text"
                placeholder="Enter Google Maps Link"
                value={details.mapsLink}
                onChange={(e) => handleChange('mapsLink', e.target.value)}
              />
              <small className="input-help">Paste a Google Maps link to help display your property's location on the map</small>
            </div>

            <div className="form-group">
              <label htmlFor="propertyDescription">Property Description</label>
              <textarea
                id="propertyDescription"
                placeholder="Enter Property Description"
                value={details.description}
                onChange={(e) => handleChange('description', e.target.value)}
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
            <button className="add-house-rule-button" onClick={handleAddRule}>Add House Rule</button>
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

        {/* Right Side - Image Grid */}
        <div className="image-section">
          <h2>Property Image</h2>
          <div className="main-image" onClick={() => setIsModalOpen(true)}>
            {images[0] ? (
              <img src={images[0].url} alt={images[0].label} />
            ) : (
              <div className="placeholder-text">
                Click to add images
              </div>
            )}
          </div>
          <div className="thumbnail-grid">
            {[1, 2, 3, 4].map((index) => (
              <div 
                key={index} 
                className="thumbnail"
                onClick={() => setIsModalOpen(true)}
              >
                {images[index] ? (
                  <img src={images[index].url} alt={images[index].label} />
                ) : (
                  <div className="placeholder-text">+</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Owner Section at the bottom */}
      <div className="owner-section-wrapper">
        <ListingOwnerSection
          ownerId={id || ''}
          onAllowChattingChange={setAllowChatting}
        />
      </div>

      {/* Image Upload Modal */}
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