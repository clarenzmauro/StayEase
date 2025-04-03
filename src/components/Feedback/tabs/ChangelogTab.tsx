import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  orderBy, 
  query, 
  serverTimestamp,
  Timestamp,
  where
} from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { User } from 'firebase/auth';
import { API_URL } from '../../../config';
import './ChangelogTab.css';

// Types
type ChangeType = 'new' | 'improvement' | 'fix';

interface ChangeItem {
  type: ChangeType;
  description: string;
}

interface ChangelogEntry {
  id: string;
  version: string;
  releaseDate: Timestamp | Date;
  title: string;
  description: string;
  imageId?: string;
  changes: ChangeItem[];
}

interface ChangelogTabProps {
  user: User | null;
}

interface NewEntryForm {
  version: string;
  title: string;
  description: string;
  changes: ChangeItem[];
}

const ChangelogTab: React.FC<ChangelogTabProps> = ({ user }) => {
  // State
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  
  // Form state
  const [newEntry, setNewEntry] = useState<NewEntryForm>({
    version: '',
    title: '',
    description: '',
    changes: [{ type: 'new', description: '' }]
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user role and changelog entries
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        return;
      }
      
      try {
        const userDocRef = await getDocs(query(collection(db, 'accounts'), where('email', '==', user.email)));
        if (!userDocRef.empty) {
          const userData = userDocRef.docs[0].data();
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    const fetchChangelog = async () => {
      try {
        setLoading(true);
        const changelogQuery = query(
          collection(db, 'changelog'),
          orderBy('releaseDate', 'desc')
        );
        
        const snapshot = await getDocs(changelogQuery);
        const changelogEntries: ChangelogEntry[] = [];
        
        snapshot.forEach(doc => {
          const data = doc.data() as Omit<ChangelogEntry, 'id'>;
          changelogEntries.push({
            id: doc.id,
            ...data
          });
        });
        
        setEntries(changelogEntries);
      } catch (error) {
        console.error('Error fetching changelog:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
    fetchChangelog();
  }, [user]);

  // Check if user is a developer
  const isDeveloper = userRole === 'developer' || userRole === 'admin';

  // Format date
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle file change for image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewEntry(prev => ({ ...prev, [name]: value }));
  };

  // Handle change type update
  const handleChangeTypeUpdate = (index: number, type: ChangeType) => {
    const updatedChanges = [...newEntry.changes];
    updatedChanges[index] = { ...updatedChanges[index], type };
    setNewEntry(prev => ({ ...prev, changes: updatedChanges }));
  };

  // Handle change description update
  const handleChangeDescriptionUpdate = (index: number, description: string) => {
    const updatedChanges = [...newEntry.changes];
    updatedChanges[index] = { ...updatedChanges[index], description };
    setNewEntry(prev => ({ ...prev, changes: updatedChanges }));
  };

  // Add new change item
  const handleAddChange = () => {
    setNewEntry(prev => ({
      ...prev,
      changes: [...prev.changes, { type: 'new', description: '' }]
    }));
  };

  // Remove change item
  const handleRemoveChange = (index: number) => {
    if (newEntry.changes.length === 1) return;
    
    const updatedChanges = newEntry.changes.filter((_, i) => i !== index);
    setNewEntry(prev => ({ ...prev, changes: updatedChanges }));
  };

  // Toggle form visibility
  const toggleForm = () => {
    setFormVisible(!formVisible);
    
    // Reset form if closing
    if (formVisible) {
      setNewEntry({
        version: '',
        title: '',
        description: '',
        changes: [{ type: 'new', description: '' }]
      });
      setImageFile(null);
      setImagePreview(null);
      setError(null);
    }
  };

  // Remove image preview
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Submit new changelog entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isDeveloper) {
      setError('You do not have permission to add changelog entries');
      return;
    }
    
    // Validate form
    if (!newEntry.version || !newEntry.title || !newEntry.description || !newEntry.changes[0].description) {
      setError('Please fill out all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      let imageId = '';
      
      // Skip image upload for now since API endpoint isn't available
      // Add entry to Firestore without image
      const entryData = {
        version: newEntry.version,
        title: newEntry.title,
        description: newEntry.description,
        changes: newEntry.changes,
        releaseDate: serverTimestamp(),
        createdBy: user?.uid,
        createdByEmail: user?.email,
      };
      
      await addDoc(collection(db, 'changelog'), entryData);
      
      // Reset form and show success message
      setNewEntry({
        version: '',
        title: '',
        description: '',
        changes: [{ type: 'new', description: '' }]
      });
      setImageFile(null);
      setImagePreview(null);
      setFormVisible(false);
      setSuccessMessage('Changelog entry added successfully!');
      
      // Fetch updated changelog
      const changelogQuery = query(
        collection(db, 'changelog'),
        orderBy('releaseDate', 'desc')
      );
      
      const snapshot = await getDocs(changelogQuery);
      const changelogEntries: ChangelogEntry[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data() as Omit<ChangelogEntry, 'id'>;
        changelogEntries.push({
          id: doc.id,
          ...data
        });
      });
      
      setEntries(changelogEntries);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error adding changelog entry:', error);
      setError('An error occurred while adding the changelog entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="changelog-tab">
      <div className="changelog-header">
        <h2>Changelog</h2>
        {isDeveloper && (
          <button 
            className="add-changelog-button" 
            onClick={toggleForm}
          >
            {formVisible ? 'Cancel' : 'Add New Entry'}
          </button>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {formVisible && isDeveloper && (
        <div className="changelog-form-container">
          <h3>Add New Changelog Entry</h3>
          <form className="changelog-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="version">Version</label>
              <input
                type="text"
                id="version"
                name="version"
                value={newEntry.version}
                onChange={handleInputChange}
                placeholder="e.g. 1.0.0"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={newEntry.title}
                onChange={handleInputChange}
                placeholder="e.g. Major Feature Release"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={newEntry.description}
                onChange={handleInputChange}
                placeholder="Brief description of this release"
                required
              ></textarea>
            </div>
            
            <div className="form-group">
              <label>Screenshot (Optional)</label>
              <div className="image-upload-container">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button 
                      type="button" 
                      className="remove-image"
                      onClick={handleRemoveImage}
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <p>Image uploads temporarily disabled</p>
                    <label className="upload-button" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                      Choose File
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label>Changes</label>
              {newEntry.changes.map((change, index) => (
                <div className="change-item-input" key={index}>
                  <select
                    value={change.type}
                    onChange={e => handleChangeTypeUpdate(index, e.target.value as ChangeType)}
                  >
                    <option value="new">New</option>
                    <option value="improvement">Improvement</option>
                    <option value="fix">Fix</option>
                  </select>
                  <input
                    type="text"
                    value={change.description}
                    onChange={e => handleChangeDescriptionUpdate(index, e.target.value)}
                    placeholder="Description of the change"
                    required={index === 0}
                  />
                  <button
                    type="button"
                    className="remove-change-button"
                    onClick={() => handleRemoveChange(index)}
                    disabled={newEntry.changes.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-change-button"
                onClick={handleAddChange}
              >
                Add Another Change
              </button>
            </div>
            
            <div className="form-actions">
              <button
                type="submit"
                className="submit-button"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Changelog Entry'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading ? (
        <div className="changelog-loading">Loading changelog...</div>
      ) : entries.length === 0 ? (
        <div className="no-entries">No changelog entries yet</div>
      ) : (
        <div className="changelog-timeline">
          {entries.map((entry, index) => (
            <div className="changelog-entry" key={entry.id}>
              <div className="changelog-header">
                <div>
                  <span className="version-badge">v{entry.version}</span>
                  <span className="entry-date">{formatDate(entry.releaseDate)}</span>
                </div>
              </div>
              
              <h3>{entry.title}</h3>
              
              {entry.imageId && (
                <div className="entry-image">
                  <img 
                    src={`${API_URL}/api/changelog-images/${entry.imageId}`} 
                    alt={`Screenshot for v${entry.version}`} 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="entry-description">
                <p>{entry.description}</p>
              </div>
              
              <ul className="changes-list">
                {entry.changes.map((change, changeIndex) => (
                  <li className={`change-item ${change.type}`} key={changeIndex}>
                    <span className="change-badge">{change.type === 'new' ? 'New' : change.type === 'improvement' ? 'Improved' : 'Fixed'}</span>
                    <span className="change-description">{change.description}</span>
                  </li>
                ))}
              </ul>
              
              {index < entries.length - 1 && <div className="entry-divider"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChangelogTab; 