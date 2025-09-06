import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [vehicleListings, setVehicleListings] = useState([]);
  const [sellerReports, setSellerReports] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        await Promise.all([
          fetchPendingListings(),
          fetchSellerReports(),
          fetchUsers('buyer'),
          fetchUsers('seller'),
        ]);
      } catch (err) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // --- API Functions ---
  const fetchPendingListings = async () => {
    try {
      const response = await axios.get('http://localhost:5002/api/admin/pending-listings', {
        withCredentials: true,
      });
      setVehicleListings(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching pending listings:', error.response?.data?.error || error.message);
      setVehicleListings([]);
      setError('Failed to fetch pending listings');
    }
  };

  const fetchSellerReports = async () => {
    try {
      const response = await axios.get('http://localhost:5002/api/admin/seller-reports', {
        withCredentials: true,
      });
      setSellerReports(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching seller reports:', error.response?.data?.error || error.message);
      setSellerReports([]);
      setError('Failed to fetch seller reports');
    }
  };

  const fetchUsers = async (userType) => {
    try {
      const response = await axios.get(`http://localhost:5002/api/admin/users/${userType}`, {
        withCredentials: true,
      });
      console.log(`Fetched ${userType} data:`, response.data);
      if (Array.isArray(response.data)) {
        const data = response.data.map((user) => ({
          _id: user.id || user._id,
          username: user.username || 'Unknown',
          email: user.email || 'No email',
          phone: user.phone || 'No phone',
          created_at: user.created_at || user.registrationDate,
          isVerified: user.isVerified || false,
        }));
        if (userType === 'buyer') {
          setBuyers(data);
        } else {
          setSellers(data);
        }
        setError(null);
      } else {
        throw new Error(`Invalid data format for ${userType}: Expected an array`);
      }
    } catch (error) {
      console.error(`Error fetching ${userType} accounts:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (userType === 'buyer') {
        setBuyers([]);
      } else {
        setSellers([]);
      }
      setError(`Failed to fetch ${userType} accounts: ${error.response?.data?.error || error.message}`);
    }
  };

  // --- Action Handlers ---
  const handleApproveListing = async (listingId) => {
    try {
      await axios.post(
        `http://localhost:5002/api/admin/listings/${listingId}/approve`,
        {},
        { withCredentials: true }
      );
      fetchPendingListings();
      alert('Listing approved successfully!');
    } catch (error) {
      console.error('Error approving listing:', error.response?.data?.error || error.message);
      alert('Error approving listing. Please try again.');
    }
  };

  const handleDeclineListing = async (listingId) => {
    try {
      await axios.post(
        `http://localhost:5002/api/admin/listings/${listingId}/reject`,
        {},
        { withCredentials: true }
      );
      fetchPendingListings();
      alert('Listing declined successfully!');
    } catch (error) {
      console.error('Error declining listing:', error.response?.data?.error || error.message);
      alert('Error declining listing. Please try again.');
    }
  };

  const handleDeleteUser = async (userId, userType) => {
    try {
      if (window.confirm(`Are you sure you want to delete this ${userType} account?`)) {
        await axios.delete(`http://localhost:5002/api/admin/users/${userId}`, {
          withCredentials: true,
        });
        alert(`${userType} account deleted successfully.`);
        fetchUsers(userType);
      }
    } catch (error) {
      console.error('Error deleting user:', error.response?.data?.error || error.message);
      alert('Error deleting user. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5002/api/auth/logout', {}, { withCredentials: true });
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error.response?.data?.error || error.message);
      alert('Error logging out. Please try again.');
    }
  };

  const handleAddBuyer = () => {
    navigate('/add-buyer');
  };

  const handleAddSeller = () => {
    navigate('/add-seller');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li>
              <button onClick={() => navigate('/admin-dashboard')}>Dashboard</button>
            </li>
            <li>
              <button onClick={handleAddBuyer}>Add Buyer Account</button>
            </li>
            <li>
              <button onClick={handleAddSeller}>Add Seller Account</button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <header className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>

        <main className="dashboard-sections">
          {/* Manage Users Section */}
          <div className="dashboard-card user-management">
            <h2>User Management</h2>
            <p>Manage all registered buyer and seller accounts.</p>

            <div className="user-section">
              <div className="section-header">
                <h3>Buyer Accounts ({buyers.length})</h3>
                <button onClick={handleAddBuyer} className="add-user-btn">
                  Add New Buyer
                </button>
              </div>
              <div className="user-list-container">
                {buyers.length > 0 ? (
                  buyers.map((buyer) => (
                    <div key={buyer._id} className="user-item">
                      <div className="user-details">
                        <div className="user-main-info">
                          <span className="username">{buyer.username || 'Unknown'}</span>
                          <span className="email">{buyer.email || 'No email'}</span>
                        </div>
                        <div className="user-meta">
                          <span className="phone">{buyer.phone || 'No phone'}</span>
                          <span className="join-date">
                            Joined: {buyer.created_at ? new Date(buyer.created_at).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(buyer._id, 'buyer')}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-data">
                    {error ? `Error: ${error}` : 'No buyer accounts to display.'}
                  </p>
                )}
              </div>
            </div>

            <div className="user-section">
              <div className="section-header">
                <h3>Seller Accounts ({sellers.length})</h3>
                <button onClick={handleAddSeller} className="add-user-btn">
                  Add New Seller
                </button>
              </div>
              <div className="user-list-container">
                {sellers.length > 0 ? (
                  sellers.map((seller) => (
                    <div key={seller._id} className="user-item">
                      <div className="user-details">
                        <div className="user-main-info">
                          <span className="username">{seller.username || 'Unknown'}</span>
                          <span className="email">{seller.email || 'No email'}</span>
                        </div>
                        <div className="user-meta">
                          <span className="phone">{seller.phone || 'No phone'}</span>
                          <span className="join-date">
                            Joined: {seller.created_at ? new Date(seller.created_at).toLocaleDateString() : 'Unknown'}
                          </span>
                          <span className="status">
                            Status: {seller.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(seller._id, 'seller')}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-data">
                    {error ? `Error: ${error}` : 'No seller accounts to display.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Manage Vehicle Listings Section */}
          <div className="dashboard-card listing-management">
            <h2>Pending Vehicle Ads</h2>
            <p>Review and decide on new vehicle listings submitted by sellers.</p>
            {vehicleListings.length > 0 ? (
              vehicleListings.map((listing) => (
                <div key={listing._id} className="listing-item">
                  <div className="listing-details">
                    <p><strong>Car:</strong> {listing.make} {listing.model} ({listing.year})</p>
                    <p><strong>Price:</strong> {format_price_lkr(listing.price)}</p>
                    <p><strong>Seller:</strong> {listing.sellerName || 'Unknown'}</p>
                    <p><strong>Submitted:</strong> {new Date(listing.created_at).toLocaleDateString()}</p>
                    {listing.images && listing.images.length > 0 ? (
                      <div className="listing-image">
                        <img
                          src={`http://localhost:5002${listing.images[0]}`}
                          alt={listing.title}
                          onError={(e) => {
                            e.target.src = '/placeholder.jpg';
                            console.error(`Failed to load image: http://localhost:5002${listing.images[0]}`);
                          }}
                        />
                      </div>
                    ) : (
                      <p className="no-image">No image available</p>
                    )}
                  </div>
                  <div className="listing-actions">
                    <button onClick={() => handleApproveListing(listing._id)} className="approve-btn">
                      Approve
                    </button>
                    <button onClick={() => handleDeclineListing(listing._id)} className="decline-btn">
                      Decline
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No pending vehicle ads at the moment.</p>
            )}
          </div>

          {/* Seller Ratings and Reports Section */}
          <div className="dashboard-card reports-ratings">
            <h2>Seller Reports & Ratings</h2>
            <p>Monitor seller performance and review reports submitted by buyers.</p>
            {sellerReports.length > 0 ? (
              sellerReports.map((report) => (
                <div key={report._id} className="report-item">
                  <div className="report-details">
                    <p><strong>Seller:</strong> {report.sellerName}</p>
                    <p><strong>Rating:</strong>
                      <span className={`rating ${report.rating >= 4 ? 'good' : report.rating >= 3 ? 'average' : 'poor'}`}>
                        {report.rating} / 5 ⭐
                      </span>
                    </p>
                    <p><strong>Report:</strong> {report.reportDetails}</p>
                    <p><strong>Reported by:</strong> {report.buyerName}</p>
                    <p><strong>Date:</strong> {new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No new reports or ratings to display.</p>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          background-color: #1a202c;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #e2e8f0;
        }
        .loading-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #1a202c;
        }
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #4a5568;
          border-top: 4px solid #4299e1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .sidebar {
          width: 250px;
          background: #171923;
          color: white;
          padding: 2rem 1rem;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .sidebar-header h2 {
          text-align: center;
          color: #4299e1;
          margin: 0;
          font-size: 1.8rem;
          font-weight: bold;
        }
        .sidebar-nav ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .sidebar-nav li {
          margin-bottom: 1rem;
        }
        .sidebar-nav button {
          width: 100%;
          text-align: left;
          padding: 0.75rem 1rem;
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.3s ease, transform 0.2s ease;
        }
        .sidebar-nav button:hover {
          background: #2d3748;
          transform: translateX(5px);
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .dashboard-header {
          background: #171923;
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          color: #e2e8f0;
        }
        .dashboard-header h1 {
          font-size: 1.8rem;
          margin: 0;
          color: #4299e1;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .logout-btn {
          background: #c53030;
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .logout-btn:hover {
          background: #9b2c2c;
        }
        .dashboard-sections {
          padding: 2rem;
          display: grid;
          gap: 2rem;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        }
        .dashboard-card {
          background: #2d3748;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          border: 1px solid #4a5568;
        }
        .dashboard-card h2 {
          color: #4299e1;
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          border-bottom: 2px solid #4a5568;
          padding-bottom: 0.5rem;
        }
        .user-section {
          margin-bottom: 2rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .section-header h3 {
          color: #cbd5e0;
          margin: 0;
          font-size: 1.2rem;
        }
        .add-user-btn {
          background: #4299e1;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.3s ease;
        }
        .add-user-btn:hover {
          background: #3182ce;
        }
        .user-list-container {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #4a5568;
          border-radius: 8px;
          padding: 1rem;
        }
        .user-item {
          background-color: #2d3748;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #4a5568;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .user-details {
          flex: 1;
        }
        .user-main-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }
        .username {
          font-weight: bold;
          color: #e2e8f0;
          font-size: 1.1rem;
        }
        .email {
          color: #a0aec0;
          font-size: 0.9rem;
        }
        .user-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.85rem;
          color: #a0aec0;
        }
        .phone {
          color: #cbd5e0;
        }
        .join-date {
          color: #a0aec0;
        }
        .status {
          color: #48bb78;
          font-weight: 500;
        }
        .listing-item {
          background-color: #2d3748;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #4a5568;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .listing-details {
          flex: 1;
        }
        .listing-details p {
          margin: 0.5rem 0;
          color: #cbd5e0;
        }
        .listing-image {
          margin-top: 1rem;
        }
        .listing-image img {
          max-width: 200px;
          height: auto;
          border-radius: 8px;
          object-fit: cover;
        }
        .no-image {
          color: #a0aec0;
          font-style: italic;
        }
        .report-item {
          background-color: #2d3748;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #4a5568;
          margin-bottom: 1rem;
        }
        .report-details p {
          margin: 0.5rem 0;
          color: #cbd5e0;
        }
        .rating {
          font-weight: bold;
          margin-left: 0.5rem;
        }
        .rating.good {
          color: #48bb78;
        }
        .rating.average {
          color: #ecc94b;
        }
        .rating.poor {
          color: #f56565;
        }
        .delete-btn {
          background-color: #e53e3e;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.3s ease;
        }
        .delete-btn:hover {
          background-color: #c53030;
        }
        .listing-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-left: 1rem;
        }
        .approve-btn,
        .decline-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.3s ease;
          min-width: 80px;
        }
        .approve-btn {
          background-color: #4299e1;
        }
        .approve-btn:hover {
          background-color: #3182ce;
        }
        .decline-btn {
          background-color: #e53e3e;
        }
        .decline-btn:hover {
          background-color: #c53030;
        }
        .no-data {
          text-align: center;
          color: #a0aec0;
          font-style: italic;
          padding: 2rem;
        }
        .error-message {
          background-color: #fed7d7;
          border: 1px solid #e53e3e;
          border-radius: 6px;
          padding: 1rem;
          margin: 1rem 2rem;
          text-align: center;
          color: #e53e3e;
        }
      `}</style>
    </div>
  );
};

const format_price_lkr = (price) => {
  if (price >= 10000000) {
    const crores = price / 10000000;
    return `LKR ${crores.toFixed(crores >= 100 ? 0 : 1)} Crores`;
  } else if (price >= 100000) {
    const lakhs = price / 100000;
    return `LKR ${lakhs.toFixed(lakhs >= 100 ? 0 : 1)} Lakhs`;
  } else if (price >= 1000) {
    const thousands = price / 1000;
    return `LKR ${thousands.toFixed(0)}K`;
  }
  return `LKR ${price.toFixed(0)}`;
};

export default AdminDashboard;