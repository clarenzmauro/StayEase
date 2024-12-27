import React from 'react';

'use client'

interface ImageUpload {
  label: string;
  file: File | null;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (images: ImageUpload[]) => void;
}

export function UploadModal({ isOpen, onClose, onSave }: UploadModalProps) {
  const [uploads, setUploads] = React.useState<ImageUpload[]>([{ label: '', file: null }]);

  if (!isOpen) return null;

  const handleAddMore = () => {
    setUploads([...uploads, { label: '', file: null }]);
  };

  const handleRemove = (index: number) => {
    setUploads(uploads.filter((_, i) => i !== index));
  };

  const handleLabelChange = (index: number, value: string) => {
    const newUploads = [...uploads];
    newUploads[index].label = value;
    setUploads(newUploads);
  };

  const handleFileChange = (index: number, file: File | null) => {
    const newUploads = [...uploads];
    newUploads[index].file = file;
    setUploads(newUploads);
  };

  const handleSave = () => {
    onSave(uploads);
    onClose();
    setUploads([{ label: '', file: null }]);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>Upload Images</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          {uploads.map((upload, index) => (
            <div key={index} className="upload-item">
              <div className="upload-item-header">
                <label htmlFor={`label-${index}`}>Image {index + 1} Label</label>
                {index > 0 && (
                  <button 
                    className="remove-button"
                    onClick={() => handleRemove(index)}
                  >
                    ×
                  </button>
                )}
              </div>
              <input
                id={`label-${index}`}
                value={upload.label}
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
            </div>
          ))}
          <button className="add-button" onClick={handleAddMore}>
            + Add Another Image
          </button>
        </div>
        <div className="modal-footer">
          <button className="save-button" onClick={handleSave}>
            Save Images
          </button>
        </div>
      </div>
    </div>
  );
}

