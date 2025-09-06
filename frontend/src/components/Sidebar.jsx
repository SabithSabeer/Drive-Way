// src/components/Sidebar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const Sidebar = ({ handleLogout }) => {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <h2>Menu</h2>
      <button onClick={() => navigate("/dashboard")}>Marketplace</button>
      <button onClick={() => navigate("/predict")}>Predict Car Price</button>
      <button onClick={() => navigate("/carpredict")}>Find Cars by Budget</button>
      <button onClick={() => navigate("/landing")}>Logout</button>

      {/* Sidebar styles */}
      <style jsx>{`
        .sidebar {
          width: 220px;
          background: #222;
          color: white;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sidebar button {
          background: #444;
          color: white;
          border: none;
          padding: 0.75rem;
          text-align: left;
          border-radius: 4px;
          cursor: pointer;
        }

        .sidebar button:hover {
          background: #666;
        }

        .logout-btn {
          background: #c62828 !important;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
