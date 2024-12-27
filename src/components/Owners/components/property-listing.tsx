import React from "react";
import { UploadModal } from "./upload-modal";

'use client'

interface Image {
  url: string;
  label: string;
}

export function PropertyListing() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [images, setImages] = React.useState<Image[]>([]);
  const [title, setTitle] = React.useState("");
  const [location, setLocation] = React.useState("");

  const handleImageSave = (uploads: { label: string; file: File | null }[]) => {
    const newImages = uploads
      .filter((upload) => upload.file)
      .map((upload) => ({
        url: URL.createObjectURL(upload.file as File),
        label: upload.label,
      }));
    setImages([...images, ...newImages]);
  };

  return (
    <div className="property-container">
      <div className="header">
        <div className="title-section">
          <input
            type="text"
            placeholder="Property Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="title-input"
          />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="location-input"
          />
        </div>
        <button className="heart-button">♡</button>
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

      {isModalOpen && (
        <UploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleImageSave}
        />
      )}
    </div>
  );
}

