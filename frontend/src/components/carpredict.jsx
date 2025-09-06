import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { FaUserCircle } from 'react-icons/fa';
import '../css/VehicleMarketplace.css';

const VehicleMarketplace = ({ user, setActiveTab, handleLogout }) => {
  const [formData, setFormData] = useState({
    condition: '',
    gear: '',
    fuel_type: '',
    yom: '',
    engine: '',
    price: ''
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPrediction(null);

    try {
      const payload = {
        condition: formData.condition.toLowerCase(),
        gear: formData.gear.toLowerCase(),
        fuel_type: formData.fuel_type.toLowerCase(),
        yom: parseInt(formData.yom) || 0,
        engine: parseFloat(formData.engine) || 0,
        price: parseFloat(formData.price) || 0
      };

      const response = await fetch('http://localhost:5002/api/predict_brand_model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Prediction failed');

      setPrediction(result);
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err.message || 'Failed to get prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar setActiveTab={setActiveTab} handleLogout={handleLogout} />
      <div className="main-content">
        <header className="dashboard-header">
          <h1>Vehicle Marketplace</h1>
          <div className="user-profile">
            <FaUserCircle size={32} />
            <span>{user?.username}</span>
          </div>
        </header>

        <div className="vehicle-marketplace-container">
          <div className="prediction-card">
            <h2>Predict Car Brand & Model</h2>
            <form onSubmit={handleSubmit} className="prediction-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Condition</label>
                  <select name="condition" value={formData.condition} onChange={handleInputChange} required>
                    <option value="">Select Condition</option>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Gear Type</label>
                  <select name="gear" value={formData.gear} onChange={handleInputChange} required>
                    <option value="">Select Gear Type</option>
                    <option value="manual">Manual</option>
                    <option value="auto">Automatic</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fuel Type</label>
                  <select name="fuel_type" value={formData.fuel_type} onChange={handleInputChange} required>
                    <option value="">Select Fuel Type</option>
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="electric">Electric</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Year of Manufacture</label>
                  <input type="number" name="yom" value={formData.yom} onChange={handleInputChange} min="1950" max={new Date().getFullYear()} required />
                </div>

                <div className="form-group">
                  <label>Engine Size (cc)</label>
                  <input type="number" name="engine" value={formData.engine} onChange={handleInputChange} min="0" required />
                </div>

                <div className="form-group">
                  <label>Price (LKR)</label>
                  <input type="number" name="price" value={formData.price} onChange={handleInputChange} min="0" required />
                </div>
              </div>

              <button type="submit" className="predict-button" disabled={loading}>
                {loading ? 'Predicting...' : 'Predict Brand & Model'}
              </button>

              {error && <div className="error-message">{error}</div>}
            </form>
          </div>

          {prediction && (
            <div className="result-card">
              <h3>Prediction Results</h3>
              <p><strong>Brand:</strong> {prediction.brand}</p>
              <p><strong>Model:</strong> {prediction.model}</p>
              <p><strong>Brand Confidence:</strong> {Math.round(prediction.brand_confidence * 100)}%</p>
              <p><strong>Model Confidence:</strong> {Math.round(prediction.model_confidence * 100)}%</p>

              <h4>Top 3 Brands</h4>
              <ul>
                {prediction.brand_top_k.map((b, idx) => (
                  <li key={idx}>{b.brand} - {(b.prob * 100).toFixed(1)}%</li>
                ))}
              </ul>

              <h4>Top 3 Models</h4>
              <ul>
                {prediction.model_top_k.map((m, idx) => (
                  <li key={idx}>{m.model} - {(m.prob * 100).toFixed(1)}%</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleMarketplace;
