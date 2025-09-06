// src/components/AddSeller.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AddSeller = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    businessName: '',
    yearsInBusiness: '',
    businessType: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessPhone: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const businessTypes = [
    'Individual Seller',
    'Car Dealership',
    'Auto Broker',
    'Fleet Sales',
    'Auction House',
    'Rental Company',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = ' username is required';
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (formData.yearsInBusiness && (isNaN(formData.yearsInBusiness) || formData.yearsInBusiness < 0)) {
      newErrors.yearsInBusiness = 'Please enter a valid number of years';
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Business type is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.businessPhone && !/^\+?[\d\s\-\(\)]+$/.test(formData.businessPhone)) {
      newErrors.businessPhone = 'Please enter a valid business phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const sellerData = {
        username: formData.username,
        businessName: formData.businessName,
        yearsInBusiness: formData.yearsInBusiness ? parseInt(formData.yearsInBusiness) : null,
        businessType: formData.businessType,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        businessPhone: formData.businessPhone,
        role: 'seller',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await axios.post('http://localhost:5002/api/admin/create-seller', sellerData, {
        withCredentials: true
      });

      alert('Seller account created successfully! 🎉');
      navigate('/admin-dashboard');
    } catch (error) {
      console.error('Detailed error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.response) {
        console.log('Response data:', error.response.data);
        console.log('Response status:', error.response.status);
        if (error.response.status === 409) {
          errorMessage = error.response.data.error || 'This email is already in use.';
        } else if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = 'You are not authorized to perform this action.';
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check if the backend is running on port 5002.';
      } else {
        errorMessage = error.message;
      }

      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin-dashboard');
  };

  return (
    <div className="add-seller-container">
      <div className="form-wrapper">
        <div className="form-header">
          <h1>Add New Seller Account</h1>
          <p>Create a new seller account for the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="seller-form">
          <div className="form-section">
            <h2>Seller Information</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">User Name *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={errors.username ? 'error' : ''}
                  placeholder="Enter  username"
                />
                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="businessName">Business Name *</label>
                <input
                  type="text"
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className={errors.businessName ? 'error' : ''}
                  placeholder="Enter business name"
                />
                {errors.businessName && <span className="error-message">{errors.businessName}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="yearsInBusiness">Years in Business</label>
                <input
                  type="number"
                  id="yearsInBusiness"
                  name="yearsInBusiness"
                  value={formData.yearsInBusiness}
                  onChange={handleInputChange}
                  className={errors.yearsInBusiness ? 'error' : ''}
                  placeholder="Enter years in business"
                  min="0"
                />
                {errors.yearsInBusiness && <span className="error-message">{errors.yearsInBusiness}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="businessType">Business Type *</label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className={errors.businessType ? 'error' : ''}
                >
                  <option value="">Select business type</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.businessType && <span className="error-message">{errors.businessType}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter email address"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? 'error' : ''}
                  placeholder="Enter phone number"
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="businessPhone">Business Phone</label>
                <input
                  type="tel"
                  id="businessPhone"
                  name="businessPhone"
                  value={formData.businessPhone}
                  onChange={handleInputChange}
                  className={errors.businessPhone ? 'error' : ''}
                  placeholder="Enter business phone"
                />
                {errors.businessPhone && <span className="error-message">{errors.businessPhone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? 'error' : ''}
                  placeholder="Enter password"
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={errors.confirmPassword ? 'error' : ''}
                  placeholder="Confirm password"
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Creating Account...' : 'Create Seller Account'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .add-seller-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          font-family: Arial, sans-serif;
        }
        .form-wrapper {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(255, 253, 253, 0.1);
          padding: 3rem;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .form-header h1 {
          color: #2d3748;
          margin: 0 0 0.5rem 0;
          font-size: 2rem;
          font-weight: bold;
        }
        .form-header p {
          color: #6b7280;
          margin: 0;
          font-size: 1.1rem;
        }
        .seller-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .form-section {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          background: #f9fafb;
        }
        .form-section h2 {
          color: #1f2937;
          margin: 0 0 1.5rem 0;
          font-size: 1.3rem;
          font-weight: 600;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e7eb;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .form-row:last-child {
          margin-bottom: 0;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 0.95rem;
        }
        .form-group input,
        .form-group select {
          padding: 0.75rem 1rem;
          border: 2px solid #ffffffff;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          color: #000000ff;
          outline: none;
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #f5576c;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 1);
        }
        .form-group input.error,
        .form-group select.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.94);
        }
        .error-message {
          color: #ef4444;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e5e7eb;
        }
        .cancel-btn,
        .submit-btn {
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }
        .cancel-btn {
          background: #f3f4f6;
          color: #374151;
          border: 2px solid #d1d5db;
        }
        .cancel-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }
        .submit-btn {
          background: #f5576c;
          color: white;
          min-width: 200px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #e53e3e;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
        }
        .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AddSeller;