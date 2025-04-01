import React, { useState, useEffect } from 'react';
import { ReportsList } from './components/reports/ReportsList';
import { CreateReportModal } from './components/reports/CreateReportModal';
import { ReportCategory, Report, ReportStatus } from './hooks/reports/useReportData';
import { useReportData } from './hooks/reports/useReportData';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

// Mock staff members data (in a real app, this would come from a hook or API)
const mockStaffMembers = [
  { id: 'staff1', name: 'John Doe' },
  { id: 'staff2', name: 'Jane Smith' },
  { id: 'staff3', name: 'Michael Johnson' },
  { id: 'staff4', name: 'Sarah Williams' },
];

// Interface for the data received from the CreateReportModal
interface ReportData {
  title: string;
  description: string;
  category: ReportCategory;
}

export const ReportsTab: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState(mockStaffMembers);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use the report data hook to access the reports
  const { reports } = useReportData();
  // Access the authenticated user
  const { user } = useAuth();

  // In a real application, you would fetch staff members here
  // useEffect(() => {
  //   const fetchStaffMembers = async () => {
  //     try {
  //       const response = await fetch('/api/staff');
  //       const data = await response.json();
  //       setStaffMembers(data);
  //     } catch (error) {
  //       console.error('Error fetching staff members:', error);
  //     }
  //   };
  //
  //   fetchStaffMembers();
  // }, []);

  const handleCreateReport = async (reportData: ReportData) => {
    setIsSubmitting(true);
    
    try {
      if (!user) {
        throw new Error("You must be logged in to create a report");
      }
      
      // Create a new report object with required fields
      const newReport = {
        ...reportData,
        status: 'new' as ReportStatus,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        userId: user.uid,
        userName: user.displayName || 'Anonymous User',
        comments: []
      };
      
      // Add the document to Firestore
      const docRef = await addDoc(collection(db, 'reports'), newReport);
      
      console.log('Report created with ID: ', docRef.id);
      setIsCreateModalOpen(false);
      
      // Show success message
      alert('Report created successfully!');
      
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Failed to create report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleExportData = () => {
    // Convert reports to CSV format
    if (reports.length === 0) {
      alert('No reports data to export.');
      return;
    }
    
    // Define CSV headers
    const headers = ['ID', 'Title', 'Category', 'Status', 'Description', 'Created At', 'User', 'Assigned To', 'Comments'];
    
    // Convert reports to CSV rows
    const rows = reports.map(report => [
      report.id,
      `"${report.title.replace(/"/g, '""')}"`, // Escape double quotes for CSV
      report.category,
      report.status,
      `"${report.description.replace(/"/g, '""')}"`, // Escape double quotes for CSV
      report.createdAt.toDate().toISOString(),
      report.userName,
      report.assignedToName || 'Unassigned',
      report.comments?.length || 0
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create a Blob containing the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reports-export-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-tab">
      <div className="tab-header">
        <h2 className="tab-title">Reports Management</h2>
        <div className="tab-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <i className="fas fa-plus"></i> Create Report
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleExportData}
          >
            <i className="fas fa-download"></i> Export Data
          </button>
        </div>
      </div>

      {/* Reports List Component with all functionality */}
      <ReportsList staffMembers={staffMembers} />

      {/* Create Report Modal */}
      {isCreateModalOpen && (
        <CreateReportModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateReport}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default ReportsTab;
