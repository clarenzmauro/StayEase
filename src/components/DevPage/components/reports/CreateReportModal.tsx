import React, { useState } from 'react';
import './ReportStyles.css';
import { ReportCategory } from '../../hooks/reports/useReportData';

interface CreateReportModalProps {
  onClose: () => void;
  onSubmit: (reportData: ReportData) => void;
  isSubmitting?: boolean;
}

interface ReportData {
  title: string;
  description: string;
  category: ReportCategory;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({ 
  onClose, 
  onSubmit,
  isSubmitting = false 
}) => {
  const [formData, setFormData] = useState<ReportData>({
    title: '',
    description: '',
    category: 'bug'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container report-modal">
        <div className="modal-header">
          <h2>Create New Report</h2>
          <button className="modal-close" onClick={onClose} disabled={isSubmitting}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-group">
            <label htmlFor="title">Title <span className="required">*</span></label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={errors.title ? 'input-error' : ''}
              placeholder="Enter a clear and concise title"
              disabled={isSubmitting}
            />
            {errors.title && <div className="error-message">{errors.title}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Category <span className="required">*</span></label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              disabled={isSubmitting}
            >
              <option value="bug">Bug</option>
              <option value="feature_request">Feature Request</option>
              <option value="enhancement">Enhancement</option>
              <option value="payment">Payment Issue</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description <span className="required">*</span></label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={errors.description ? 'input-error' : ''}
              placeholder="Provide detailed information about the issue or request"
              rows={6}
              disabled={isSubmitting}
            />
            {errors.description && <div className="error-message">{errors.description}</div>}
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 