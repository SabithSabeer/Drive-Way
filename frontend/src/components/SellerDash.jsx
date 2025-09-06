// src/components/SellerDash.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const SellerDash = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [listings, setListings] = useState([]);
  const [newListing, setNewListing] = useState({
    title: '',
    description: '',
    price: '',
    make: '',
    model: '',
    year: '',
    mileage: '',
    condition: 'new',
    images: []
  });
  const [profile, setProfile] = useState({
    username: user?.username || '',
    phone: '',
    location: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch seller's listings
  useEffect(() => {
    const fetchListings = async () => {
      if (activeTab !== 'listings' && activeTab !== 'dashboard') return;
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:5002/api/my-listings', {
          withCredentials: true // Include cookies for session
        });
        setListings(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch listings');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [activeTab]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5002/api/auth/logout', {}, { withCredentials: true });
      logout();
      window.location.href = '/login';
    } catch (err) {
      setError(err.response?.data?.error || 'Logout failed');
    }
  };

  // Handle input changes for new listing form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewListing(prev => ({ ...prev, [name]: value }));
  };

  // Handle file input for images
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5); // Limit to 5 images
    setNewListing(prev => ({ ...prev, images: files }));
  };

  // Handle form submission for new listing
  const handleSubmitListing = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', newListing.title);
      formData.append('description', newListing.description);
      formData.append('price', newListing.price);
      formData.append('make', newListing.make);
      formData.append('model', newListing.model);
      formData.append('year', newListing.year);
      formData.append('condition', newListing.condition);
      if (newListing.condition === 'used') {
        formData.append('mileage', newListing.mileage);
      }
      newListing.images.forEach(file => formData.append('images', file));

      await axios.post('http://localhost:5002/api/listings', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Refresh listings
      const response = await axios.get('http://localhost:5002/api/my-listings', { withCredentials: true });
      setListings(response.data);
      setNewListing({
        title: '',
        description: '',
        price: '',
        make: '',
        model: '',
        year: '',
        mileage: '',
        condition: 'new',
        images: []
      });
      setError(null);
      alert('Listing submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit listing');
    } finally {
      setLoading(false);
    }
  };

  // Handle listing deletion
  const handleDeleteListing = async (id) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      try {
        await axios.delete(`http://localhost:5002/api/listings/${id}`, { withCredentials: true });
        setListings(listings.filter(listing => listing.id !== id));
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete listing');
      }
    }
  };

  // Handle profile input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.patch('http://localhost:5002/api/profile', profile, { withCredentials: true });
      setError(null);
      alert('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#a0a0a0';
    }
  };

  return (
    <div className="seller-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Seller Dashboard</h1>
          <div className="user-actions">
            <span className="welcome-text">Welcome, {user?.username || user?.email}</span>
            <button onClick={handleLogout} className="logout-btn" disabled={loading}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="error-message" style={{ color: '#ef4444', textAlign: 'center', padding: '1rem' }}>
          {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <button
          className={activeTab === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'listings' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('listings')}
        >
          My Listings
        </button>
        <button
          className={activeTab === 'add' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('add')}
        >
          Add New Vehicle
        </button>
        <button
          className={activeTab === 'profile' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <h2>Overview</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Listings</h3>
                    <p className="stat-number">{listings.length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Approved Listings</h3>
                    <p className="stat-number">{listings.filter(l => l.status === 'approved').length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Pending Approval</h3>
                    <p className="stat-number">{listings.filter(l => l.status === 'pending').length}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Views</h3>
                    <p className="stat-number">{listings.reduce((sum, listing) => sum + listing.views, 0)}</p>
                  </div>
                </div>

                <div className="recent-listings">
                  <h3>Recent Listings</h3>
                  <div className="listings-table">
                    {listings.slice(0, 3).map(listing => (
                      <div key={listing._id} className="listing-row">
                        <div className="listing-info">
                          <h4>{listing.title}</h4>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(listing.status) }}>
                            {listing.status}
                          </span>
                        </div>
                        <div className="listing-stats">
                          <span>LKR {listing.price}M</span>
                          <span>{listing.views} views</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Listings Management */}
        {activeTab === 'listings' && (
          <div className="tab-content">
            <h2>My Listings</h2>
            {loading ? (
              <p>Loading...</p>
            ) : (
              <div className="listings-container">
                {listings.map(listing => (
                  <div key={listing._id} className="listing-card">
                    <div className="listing-image">
                      {listing.images.length > 0 ? (
                        <img src={`http://localhost:5002${listing.images[0]}`} alt={listing.title} />
                      ) : (
                        <div className="image-placeholder">Vehicle Image</div>
                      )}
                    </div>
                    <div className="listing-details">
                      <h3>{listing.title}</h3>
                      <p className="listing-price">LKR {listing.price}M</p>
                      <div className="listing-meta">
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(listing.status) }}>
                          {listing.status}
                        </span>
                        <span>{listing.views} views</span>
                      </div>
                    </div>
                    <div className="listing-actions">
                      <button className="action-btn edit">Edit</button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteListing(listing._id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add New Vehicle */}
        {activeTab === 'add' && (
          <div className="tab-content">
            <h2>Add New Vehicle</h2>
            <form onSubmit={handleSubmitListing} className="vehicle-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Vehicle Title</label>
                  <input
                    type="text"
                    name="title"
                    value={newListing.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price (LKR Millions)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="price"
                    value={newListing.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Condition</label>
                  <select
                    name="condition"
                    value={newListing.condition}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Make</label>
                  <input
                    type="text"
                    name="make"
                    value={newListing.make}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    name="model"
                    value={newListing.model}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    name="year"
                    value={newListing.year}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {newListing.condition === 'used' && (
                <div className="form-group">
                  <label>Mileage (km)</label>
                  <input
                    type="number"
                    name="mileage"
                    value={newListing.mileage}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={newListing.description}
                  onChange={handleInputChange}
                  rows="4"
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label>Upload Images (Max 5)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={handleFileChange}
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Listing'}
              </button>
            </form>
          </div>
        )}

        {/* Profile Management */}
        {activeTab === 'profile' && (
          <div className="tab-content">
            <h2>Profile Settings</h2>
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={profile.username}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={profile.location}
                  onChange={handleProfileChange}
                  placeholder="Enter your location"
                />
              </div>
              <button type="submit" className="save-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}
      </main>

      <style jsx>{`
        .seller-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #101c34, #1c2b4c);
          color: #a0a0a0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .dashboard-header {
          background: #1a2845;
          padding: 1rem 2rem;
          border-bottom: 1px solid #2a3a5a;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header h1 {
          color: #52a8ff;
          margin: 0;
          font-size: 1.8rem;
        }

        .user-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .welcome-text {
          color: #e0e0e0;
        }

        .logout-btn {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid #ef4444;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }

        .dashboard-nav {
          display: flex;
          justify-content: center;
          background: #1a2845;
          border-bottom: 1px solid #2a3a5a;
          padding: 0 2rem;
        }

        .nav-btn {
          background: none;
          border: none;
          color: #a0a0a0;
          padding: 1rem 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }

        .nav-btn:hover, .nav-btn.active {
          color: #52a8ff;
          border-bottom: 2px solid #52a8ff;
        }

        .dashboard-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .tab-content h2 {
          color: #52a8ff;
          margin-top: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: #1a2845;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid #2a3a5a;
        }

        .stat-card h3 {
          color: #e0e0e0;
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .stat-number {
          color: #52a8ff;
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }

        .recent-listings {
          background: #1a2845;
          border-radius: 8px;
          padding: 1.5rem;
          border: 1px solid #2a3a5a;
        }

        .recent-listings h3 {
          color: #e0e0e0;
          margin-top: 0;
        }

        .listing-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid #2a3a5a;
        }

        .listing-row:last-child {
          border-bottom: none;
        }

        .listing-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .listing-info h4 {
          color: #e0e0e0;
          margin: 0;
        }

        .status-badge {
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .listing-stats {
          display: flex;
          gap: 1.5rem;
          color: #a0a0a0;
        }

        .listings-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .listing-card {
          background: #1a2845;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #2a3a5a;
        }

        .listing-image {
          height: 180px;
          background: #2a3a5a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .listing-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          color: #a0a0a0;
        }

        .listing-details {
          padding: 1rem;
        }

        .listing-details h3 {
          color: #e0e0e0;
          margin: 0 0 0.5rem 0;
        }

        .listing-price {
          color: #52a8ff;
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }

        .listing-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .listing-actions {
          padding: 1rem;
          border-top: 1px solid #2a3a5a;
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }

        .action-btn.edit {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid #10b981;
        }

        .action-btn.delete {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid #ef4444;
        }

        .vehicle-form, .profile-form {
          background: #1a2845;
          border-radius: 8px;
          padding: 1.5rem;
          border: 1px solid #2a3a5a;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 1rem;
        }

        .form-group label {
          color: #e0e0e0;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-group input, .form-group textarea, .form-group select {
          background: #2a3a5a;
          border: 1px solid #3a4a6a;
          border-radius: 4px;
          padding: 0.75rem;
          color: #e0e0e0;
          font-family: inherit;
        }

        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          outline: none;
          border-color: #52a8ff;
          box-shadow: 0 0 0 2px rgba(82, 168, 255, 0.2);
        }

        .image-upload {
          border: 2px dashed #3a4a6a;
          border-radius: 4px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .image-upload:hover {
          border-color: #52a8ff;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          color: #a0a0a0;
        }

        .submit-btn, .save-btn {
          background: #52a8ff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover, .save-btn:hover {
          background: #3b8fd9;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .dashboard-nav {
            overflow-x: auto;
            justify-content: flex-start;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 480px) {
          .dashboard-header {
            padding: 1rem;
          }

          .dashboard-content {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SellerDash;