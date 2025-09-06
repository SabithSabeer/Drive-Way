import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaStar } from 'react-icons/fa';
import Sidebar from './Sidebar';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [cars, setCars] = useState([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [ratingForm, setRatingForm] = useState({ sellerId: '', rating: 0, comment: '' });
  const [sellerRatings, setSellerRatings] = useState({});

  // Fetch cars with filters
  useEffect(() => {
    const fetchCars = async () => {
      setLoadingCars(true);
      setError(null);
      try {
        console.log('Fetching cars for user:', user);
        let url = 'http://localhost:5002/api/cars?limit=10';
        const params = [];
        if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
        if (priceRange.min) params.push(`minPrice=${encodeURIComponent(priceRange.min)}`);
        if (priceRange.max) params.push(`maxPrice=${encodeURIComponent(priceRange.max)}`);
        if (params.length > 0) url += `&${params.join('&')}`;

        const res = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log('Fetched cars response:', data);
        if (res.ok) {
          setCars(data.cars || []);
          for (const car of data.cars) {
            if (car.seller_id) {
              fetchSellerRatings(car.seller_id);
            }
          }
        } else {
          setError(data.error || 'Failed to fetch cars');
        }
      } catch (err) {
        console.error('Error fetching cars:', err);
        setError('Error fetching cars. Please try again.');
      } finally {
        setLoadingCars(false);
      }
    };
    fetchCars();
  }, [searchTerm, priceRange, user]);

  // Fetch seller ratings
  const fetchSellerRatings = async (sellerId) => {
    try {
      const res = await fetch(`http://localhost:5002/api/seller-ratings/${sellerId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setSellerRatings((prev) => ({ ...prev, [sellerId]: data }));
      }
    } catch (err) {
      console.error(`Error fetching ratings for seller ${sellerId}:`, err);
    }
  };

  // Handle rating form submission
  const handleRatingSubmit = async (sellerId) => {
    if (!user || user.role !== 'buyer') {
      alert('Please log in as a buyer to rate a seller.');
      return;
    }
    try {
      const res = await fetch('http://localhost:5002/api/rate-seller', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_id: sellerId,
          rating: parseInt(ratingForm.rating),
          comment: ratingForm.comment
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Rating submitted successfully!');
        setRatingForm({ sellerId: '', rating: 0, comment: '' });
        fetchSellerRatings(sellerId);
      } else {
        alert(data.error || 'Failed to submit rating.');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      alert('Error submitting rating. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar setActiveTab={() => {}} handleLogout={handleLogout} />

      <div className="main-content">
        <header className="dashboard-header">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search Marketplace (e.g., Toyota, SUV)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button className="filter-button">Filters</button>
            <div className="price-filter">
              <input
                type="number"
                placeholder="Min Price"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              />
              <input
                type="number"
                placeholder="Max Price"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              />
            </div>
          </div>
          <div className="user-profile">
            <FaUserCircle size={32} />
            <span>{user?.username || 'Guest'}</span>
          </div>
        </header>

        <main className="dashboard-content">
          <div className="dashboard-card">
            <h2>Marketplace</h2>
            {loadingCars ? (
              <p>Loading cars...</p>
            ) : error ? (
              <p className="error">{error}</p>
            ) : cars.length === 0 ? (
              <p>No cars available matching your search.</p>
            ) : (
              <div className="car-grid">
                {cars.map((car) => (
                  <div key={car._id} className="car-card">
                    <img
                      src={car.images && car.images.length > 0 ? `http://localhost:5002${car.images[0]}` : '/placeholder.jpg'}
                      alt={car.title || 'Vehicle'}
                      className="car-image"
                      onError={(e) => { e.target.src = '/placeholder.jpg'; console.error(`Image load failed for ${car.images[0]}`); }}
                    />
                    <div className="car-details">
                      <h3 className="car-title">{car.title || 'Untitled'}</h3>
                      <p className="car-price">{car.price?.toLocaleString() || 'N/A'} LKR</p>
                      <p><strong>Make:</strong> {car.make || 'N/A'}</p>
                      <p><strong>Model:</strong> {car.model || 'N/A'}</p>
                      <p><strong>Year:</strong> {car.year || 'N/A'}</p>
                      <p><strong>Mileage:</strong> {car.mileage ? `${car.mileage.toLocaleString()} km` : 'N/A'}</p>
                      <p><strong>Seller:</strong> {car.sellerBusinessName || 'Unknown Seller'}</p>
                      <p><strong>Phone:</strong> {car.sellerContact || 'N/A'}</p>
                      {sellerRatings[car.seller_id] && (
                        <p className="seller-rating">
                          <FaStar /> {sellerRatings[car.seller_id].avg_rating?.toFixed(1) || 'N/A'}/5 ({sellerRatings[car.seller_id].total_ratings || 0} reviews)
                        </p>
                      )}
                    </div>
                    <div className="card-actions">
                      {user?.role === 'buyer' && (
                        <div className="rating-form">
                          <select
                            value={ratingForm.sellerId === car.seller_id ? ratingForm.rating : 0}
                            onChange={(e) => setRatingForm({ ...ratingForm, sellerId: car.seller_id, rating: e.target.value })}
                          >
                            <option value="0">Rate Seller</option>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <option key={num} value={num}>{num} Star{num > 1 ? 's' : ''}</option>
                            ))}
                          </select>
                          <textarea
                            placeholder="Add a comment"
                            value={ratingForm.sellerId === car.seller_id ? ratingForm.comment : ''}
                            onChange={(e) => setRatingForm({ ...ratingForm, sellerId: car.seller_id, comment: e.target.value })}
                          />
                          <button onClick={() => handleRatingSubmit(car.seller_id)}>Submit Rating</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
          background: #f0f2f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .dashboard-header {
          background: #fff;
          padding: 10px 20px;
          border-bottom: 1px solid #dddfe2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .search-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .search-input {
          padding: 8px 12px;
          width: 300px;
          border: 1px solid #ccd0d5;
          border-radius: 20px;
          outline: none;
          font-size: 14px;
        }

        .filter-button {
          padding: 8px 16px;
          background: #e7f3ff;
          border: 1px solid #ccd0d5;
          border-radius: 20px;
          color: #1a73e8;
          cursor: pointer;
          font-size: 14px;
        }

        .price-filter {
          display: flex;
          gap: 10px;
        }

        .price-filter input {
          padding: 8px;
          border: 1px solid #ccd0d5;
          border-radius: 4px;
          width: 100px;
          font-size: 14px;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dashboard-content {
          padding: 20px;
          flex: 1;
        }

        .dashboard-card {
          background: #fff;
          border: 1px solid #dddfe2;
          border-radius: 8px;
          padding: 15px;
        }

        .car-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .car-card {
          border: 1px solid #dddfe2;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
          transition: box-shadow 0.2s;
        }

        .car-card:hover {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .car-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
          background: #f0f2f5;
        }

        .car-details {
          padding: 10px;
          font-size: 14px;
          color: #1c1e21; /* Changed to dark text for visibility */
        }

        .car-title {
          margin: 0 0 5px;
          font-size: 16px;
          font-weight: bold;
          color: #1c1e21; /* Dark text for visibility */
        }

        .car-price {
          margin: 0 0 5px;
          color: #1a73e8;
          font-weight: bold;
        }

        .seller-rating {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #606770;
          font-size: 13px;
        }

        .card-actions {
          padding: 10px;
          border-top: 1px solid #dddfe2;
        }

        .rating-form {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .rating-form select, .rating-form textarea {
          padding: 8px;
          border: 1px solid #ccd0d5;
          border-radius: 4px;
          font-size: 14px;
        }

        .rating-form textarea {
          height: 60px;
          resize: none;
        }

        .rating-form button {
          background: #1877f2;
          color: #fff;
          border: none;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .rating-form button:hover {
          background: #166fe5;
        }

        .error {
          color: #e00;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;