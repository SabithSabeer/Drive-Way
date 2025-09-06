import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../css/PredictPrice.css';

const PricePrediction = ({ setActiveTab, handleLogout }) => {
  // Form state
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    fuel_type: '',
    transmission_type: '',
    condition: '',
    mileage_range: '',
    engine: '',
    town: '',
    leasing: 'No Leasing'
  });

  // Dropdown options
  const [options, setOptions] = useState({
    makes: [],
    models: [],
    years: [],
    fuel_types: [],
    transmissions: [],
    engine_sizes: [],
    towns: [],
    mileage_ranges: [],
    leasing_options: ['No Leasing', 'Ongoing Lease']
  });

  // Loading and result states
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  // Format price function
  const formatPriceLKR = (price) => {
    if (price >= 10000000) {
      const crores = price / 10000000;
      return crores >= 100 ? `LKR ${crores.toFixed(0)} Crores` : `LKR ${crores.toFixed(1)} Crores`;
    } else if (price >= 100000) {
      const lakhs = price / 100000;
      return lakhs >= 100 ? `LKR ${lakhs.toFixed(0)} Lakhs` : `LKR ${lakhs.toFixed(1)} Lakhs`;
    } else if (price >= 1000) {
      return `LKR ${(price / 1000).toFixed(0)}K`;
    } else {
      return `LKR ${price.toFixed(0)}`;
    }
  };

  // Load initial data
  useEffect(() => {
    loadMakes();
    loadTowns();
    loadMileageRanges();
  }, []);

  // API calls
  const apiCall = async (url) => {
    try {
      const response = await fetch(`http://localhost:5002${url}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${url}:`, error);
      throw error;
    }
  };

  const loadMakes = async () => {
    try {
      const makes = await apiCall('/api/makes');
      setOptions(prev => ({ ...prev, makes }));
    } catch (err) {
      setError('Failed to load makes');
    }
  };

  const loadModels = async (make) => {
    if (!make) return;
    try {
      setLoading(true);
      const models = await apiCall(`/api/models/${make}`);
      setOptions(prev => ({ ...prev, models }));
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const loadYears = async (make, model) => {
    if (!make || !model) return;
    try {
      setLoading(true);
      const years = await apiCall(`/api/years/${make}/${model}`);
      setOptions(prev => ({ ...prev, years }));
    } catch (err) {
      setError('Failed to load years');
    } finally {
      setLoading(false);
    }
  };

  const loadFuelTypes = async (make, model, year) => {
    if (!make || !model || !year) return;
    try {
      const fuel_types = await apiCall(`/api/fuel_types/${make}/${model}/${year}`);
      setOptions(prev => ({ ...prev, fuel_types }));
    } catch (err) {
      setError('Failed to load fuel types');
    }
  };

  const loadTransmissions = async (make, model, year) => {
    if (!make || !model || !year) return;
    try {
      const transmissions = await apiCall(`/api/transmissions/${make}/${model}/${year}`);
      setOptions(prev => ({ ...prev, transmissions }));
    } catch (err) {
      setError('Failed to load transmissions');
    }
  };

  const loadEngineSizes = async (make, model, year) => {
    if (!make || !model || !year) return;
    try {
      const engine_sizes = await apiCall(`/api/engine_sizes/${make}/${model}/${year}`);
      setOptions(prev => ({ ...prev, engine_sizes }));
    } catch (err) {
      setError('Failed to load engine sizes');
    }
  };

  const loadTowns = async () => {
    try {
      const towns = await apiCall('/api/towns');
      setOptions(prev => ({ ...prev, towns }));
    } catch (err) {
      setError('Failed to load towns');
    }
  };

  const loadMileageRanges = async () => {
    try {
      const mileage_ranges = await apiCall('/api/mileage_ranges');
      setOptions(prev => ({ ...prev, mileage_ranges }));
    } catch (err) {
      setError('Failed to load mileage ranges');
    }
  };

  // Handle form changes
  const handleInputChange = async (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setWarning('');

    // Handle dependent dropdowns
    if (field === 'make') {
      setFormData(prev => ({
        ...prev,
        make: value,
        model: '',
        year: '',
        fuel_type: '',
        transmission_type: '',
        engine: ''
      }));
      setOptions(prev => ({
        ...prev,
        models: [],
        years: [],
        fuel_types: [],
        transmissions: [],
        engine_sizes: []
      }));
      if (value) await loadModels(value);
    }

    if (field === 'model') {
      setFormData(prev => ({
        ...prev,
        model: value,
        year: '',
        fuel_type: '',
        transmission_type: '',
        engine: ''
      }));
      setOptions(prev => ({
        ...prev,
        years: [],
        fuel_types: [],
        transmissions: [],
        engine_sizes: []
      }));
      if (value && formData.make) await loadYears(formData.make, value);
    }

    if (field === 'year') {
      setFormData(prev => ({
        ...prev,
        year: value,
        fuel_type: '',
        transmission_type: '',
        engine: ''
      }));
      setOptions(prev => ({
        ...prev,
        fuel_types: [],
        transmissions: [],
        engine_sizes: []
      }));
      if (value && formData.make && formData.model) {
        await loadFuelTypes(formData.make, formData.model, value);
        await loadTransmissions(formData.make, formData.model, value);
        await loadEngineSizes(formData.make, formData.model, value);
      }
    }

    if (field === 'condition') {
      setFormData(prev => ({ ...prev, condition: value, mileage_range: '' }));
    }
  };

  // Handle prediction
  const handlePredict = async () => {
    setError('');
    setWarning('');
    setPrediction(null);

    // Validation
    const requiredFields = ['make', 'model', 'year', 'fuel_type', 'transmission_type', 'condition', 'engine', 'town', 'leasing'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please select ${field.replace('_', ' ')}`);
        return;
      }
    }

    if (formData.condition === 'used' && !formData.mileage_range) {
      setError('Please select mileage range for used cars');
      return;
    }

    try {
      setPredicting(true);
      
      // Prepare the payload to match backend expectations
      const predictionPayload = {
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        fuel_type: formData.fuel_type,
        transmission_type: formData.transmission_type,
        condition: formData.condition,
        engine: parseFloat(formData.engine),
        town: formData.town,
        leasing: formData.leasing,
        mileage_range: formData.condition === 'used' ? formData.mileage_range : ''
      };

      const response = await fetch('http://localhost:5002/api/predict_price', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(predictionPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Prediction failed');
      }

      const result = await response.json();
      setPrediction(result);
      
      // Set warning if present
      if (result.warning) {
        setWarning(result.warning);
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err.message || 'Failed to predict price. Please check your input and try again.');
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar setActiveTab={setActiveTab} handleLogout={handleLogout} />
      
      <div className="main-content">
        <div className="price-prediction-container">
          <h1 className="page-title">Vehicle Price Prediction</h1>
          <p className="page-subtitle">Get an estimated market price for any vehicle</p>

          <div className="prediction-layout">
            <div className="prediction-form-card">
              <h2>Vehicle Details</h2>
              <div className="prediction-form">
                <div className="form-grid">
                  {/* Make */}
                  <div className="form-group">
                    <label>Make</label>
                    <select
                      value={formData.make}
                      onChange={(e) => handleInputChange('make', e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select Make</option>
                      {options.makes.map(make => (
                        <option key={make} value={make}>
                          {make.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model */}
                  <div className="form-group">
                    <label>Model</label>
                    <select
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      disabled={!formData.make || loading}
                    >
                      <option value="">Select Model</option>
                      {options.models.map(model => (
                        <option key={model} value={model}>
                          {model.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div className="form-group">
                    <label>Year</label>
                    <select
                      value={formData.year}
                      onChange={(e) => handleInputChange('year', e.target.value)}
                      disabled={!formData.model || loading}
                    >
                      <option value="">Select Year</option>
                      {options.years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fuel Type */}
                  <div className="form-group">
                    <label>Fuel Type</label>
                    <select
                      value={formData.fuel_type}
                      onChange={(e) => handleInputChange('fuel_type', e.target.value)}
                      disabled={!formData.year}
                    >
                      <option value="">Select Fuel Type</option>
                      {options.fuel_types.map(fuel => (
                        <option key={fuel} value={fuel}>
                          {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transmission */}
                  <div className="form-group">
                    <label>Transmission</label>
                    <select
                      value={formData.transmission_type}
                      onChange={(e) => handleInputChange('transmission_type', e.target.value)}
                      disabled={!formData.year}
                    >
                      <option value="">Select Transmission</option>
                      {options.transmissions.map(trans => (
                        <option key={trans} value={trans}>
                          {trans.charAt(0).toUpperCase() + trans.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Engine Size */}
                  <div className="form-group">
                    <label>Engine Size (cc)</label>
                    <select
                      value={formData.engine}
                      onChange={(e) => handleInputChange('engine', e.target.value)}
                      disabled={!formData.year}
                    >
                      <option value="">Select Engine Size</option>
                      {options.engine_sizes.map(engine => (
                        <option key={engine} value={engine}>{engine} cc</option>
                      ))}
                    </select>
                  </div>

                  {/* Condition */}
                  <div className="form-group">
                    <label>Condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => handleInputChange('condition', e.target.value)}
                    >
                      <option value="">Select Condition</option>
                      <option value="brand new">Brand New</option>
                      <option value="used">Used</option>
                    </select>
                  </div>

                  {/* Leasing */}
                  <div className="form-group">
                    <label>Leasing</label>
                    <select
                      value={formData.leasing}
                      onChange={(e) => handleInputChange('leasing', e.target.value)}
                    >
                      <option value="">Select Leasing Option</option>
                      {options.leasing_options.map(option => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mileage (only for used cars) */}
                  {formData.condition === 'used' && (
                    <div className="form-group">
                      <label>Mileage Range (KM)</label>
                      <select
                        value={formData.mileage_range}
                        onChange={(e) => handleInputChange('mileage_range', e.target.value)}
                      >
                        <option value="">Select Mileage Range</option>
                        {options.mileage_ranges.map(range => (
                          <option key={range} value={range}>{range} KM</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Town */}
                  <div className="form-group">
                    <label>Town</label>
                    <select
                      value={formData.town}
                      onChange={(e) => handleInputChange('town', e.target.value)}
                    >
                      <option value="">Select Town</option>
                      {options.towns.map(town => (
                        <option key={town} value={town}>
                          {town.charAt(0).toUpperCase() + town.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Warning Message */}
                {warning && (
                  <div className="warning-message" style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    color: '#856404',
                    padding: '12px',
                    borderRadius: '5px',
                    marginBottom: '15px'
                  }}>
                    <strong>⚠️ Warning:</strong> {warning}
                  </div>
                )}

                {/* Error Message */}
                {error && <div className="error-message">{error}</div>}

                <button 
                  onClick={handlePredict}
                  className="predict-button"
                  disabled={predicting}
                >
                  {predicting ? 'Predicting...' : 'Predict Price'}
                </button>
              </div>
            </div>

            {/* Result Card */}
           {prediction !== null && (
  <div className="prediction-result-card">
    <h2>💰 Price Prediction</h2>
    
    {/* Main Price Display in Millions */}
    <div className="prediction-amount">
      {(prediction.predicted_price / 10).toFixed(2)} Million
    </div>

    <div className="prediction-details">
      <h3 style={{ marginBottom: "15px", color: "#333" }}>Vehicle Details Used:</h3>
      
      {prediction.matched_values ? (
        <>
          <p><strong>Make:</strong> {prediction.matched_values.make}</p>
          <p><strong>Model:</strong> {prediction.matched_values.model}</p>
          <p><strong>Fuel Type:</strong> {prediction.matched_values.fuel_type}</p>
          <p><strong>Transmission:</strong> {prediction.matched_values.transmission}</p>
          <p><strong>Condition:</strong> {prediction.matched_values.condition}</p>
          <p><strong>Town:</strong> {prediction.matched_values.town}</p>
          <p><strong>Leasing:</strong> {prediction.leasing_used}</p>
        </>
      ) : (
        <>
          <p><strong>Make:</strong> {formData.make}</p>
          <p><strong>Model:</strong> {formData.model}</p>
          <p><strong>Fuel Type:</strong> {formData.fuel_type}</p>
          <p><strong>Transmission:</strong> {formData.transmission_type}</p>
          <p><strong>Condition:</strong> {formData.condition === "brand new" ? "Brand New" : "Used"}</p>
          <p><strong>Town:</strong> {formData.town}</p>
          <p><strong>Leasing:</strong> {formData.leasing}</p>
        </>
      )}

      <p><strong>Year:</strong> {formData.year}</p>
      <p><strong>Engine:</strong> {formData.engine} cc</p>
      {formData.condition === "used" && (
        <p><strong>Mileage:</strong> {formData.mileage_range} KM</p>
      )}
    </div>

    <div className="prediction-note">
      * This is an estimated price based on machine learning analysis of market data and may vary from actual market value.
    </div>

    {prediction.matched_values && (
      <div
        className="prediction-substitution-note"
        style={{
          backgroundColor: "#e1f5fe",
          border: "1px solid #b3e5fc",
          padding: "10px",
          borderRadius: "5px",
          marginTop: "15px",
          fontSize: "12px",
          color: "#0277bd",
        }}
      >
        <strong>ℹ️ Note:</strong> Some values were automatically matched to available options in the training data for better prediction accuracy.
      </div>
    )}
  </div>
)}

          </div>
        </div>
      </div>
    </div>
  );
};

export default PricePrediction;