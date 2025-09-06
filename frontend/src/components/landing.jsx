// src/components/landing.jsx
"use client"

import { useEffect, useRef, useState } from "react"
import "../css/landing.css"
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const heroRef = useRef(null)

  const navigate = useNavigate(); // hook to navigate

  const goToLogin = () => {
    navigate('/LoginPage'); // navigates to login page
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }

    const heroElement = heroRef.current
    if (heroElement) {
      heroElement.addEventListener("mousemove", handleMouseMove)
      return () => heroElement.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section ref={heroRef} className="hero-section">
        <div className="network-background">
          <NetworkVisualization mousePosition={mousePosition} />
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">From Data to Driveaway</span>
          </h1>

          <p className="hero-subtitle">
            Predict accurate used car prices and get personalized recommendations, all powered by our localized ML
            approach
          </p>

          <button className="cta-button secondary" onClick={goToLogin}>
            Get Started Now
            <div className="pulse-dot large"></div>
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <FeatureCard
              title="Data-Driven Valuation"
              description="Our localized ML model uses historical trends and vehicle attributes to provide precise price estimates."
              icon={<PriceGraphIcon />}
              delay={0}
            />
            <FeatureCard
              title="Personalized Discovery"
              description="Filter through thousands of listings to find the perfect vehicle based on your budget, model, and fuel type."
              icon={<SearchIcon />}
              delay={200}
            />
            <FeatureCard
              title="Time & Effort Saved"
              description="Streamlined input-to-output workflow, with easy-to-understand visuals and insights that reduce complexity."
              icon={<TimeIcon />}
              delay={400}
            />
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="process-section">
        <div className="container">
          <h2 className="section-title">
            <span className="gradient-text">The Process</span>
          </h2>

          <div className="process-scroll">
            <ProcessStep
              number="01"
              title="Input & Analyze"
              description="Enter the car's details like make, model, year, and mileage."
            />
            <ProcessStep
              number="02"
              title="Predict & Refine"
              description="Our system processes the data to generate a real-time price prediction."
            />
            <ProcessStep
              number="03"
              title="Discover & Decide"
              description="Explore a personalized list of recommendations and make your final decision with confidence."
            />
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title">Ready to make a smarter decision?</h2>
            <button className="cta-button secondary" onClick={goToLogin}>
              Get Started Now
              <div className="pulse-dot large"></div>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}


// Network Visualization Component
function NetworkVisualization({ mousePosition }) {
  return (
    <svg className="network-svg" viewBox="0 0 1200 800">
      <g className="network-nodes">
        {Array.from({ length: 20 }).map((_, i) => {
          const x = (i % 5) * 240 + 120
          const y = Math.floor(i / 5) * 160 + 80
          const isMainNode = i === 12

          return (
            <g key={i}>
              {i < 19 && (
                <line
                  x1={x}
                  y1={y}
                  x2={(i + 1) % 5 === 0 ? x : x + 240}
                  y2={(i + 1) % 5 === 0 ? y + 160 : y}
                  stroke={isMainNode ? "url(#primaryGradient)" : "url(#secondaryGradient)"}
                  strokeWidth="2"
                  className="connection-line"
                />
              )}

              <circle
                cx={x}
                cy={y}
                r={isMainNode ? "12" : "6"}
                fill={isMainNode ? "#00ffff" : "#6a00ff"}
                className={isMainNode ? "main-node" : "node"}
              />

              <line
                x1={x}
                y1={y}
                x2={mousePosition.x}
                y2={mousePosition.y}
                stroke="#00ff00"
                strokeWidth="1"
                opacity="0.3"
                className="interaction-line"
              />
            </g>
          )
        })}
      </g>

      <defs>
        <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#00ff00" />
        </linearGradient>
        <linearGradient id="secondaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6a00ff" />
          <stop offset="100%" stopColor="#00ffff" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Feature Card Component
function FeatureCard({ title, description, icon, delay }) {
  return (
    <div className="feature-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  )
}

// Process Step Component
function ProcessStep({ number, title, description }) {
  return (
    <div className="process-step">
      <div className="process-card">
        <div className="process-number">{number}</div>
        <h3 className="process-title">{title}</h3>
        <p className="process-description">{description}</p>
      </div>
    </div>
  )
}

// Icon Components
function PriceGraphIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none">
      <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 7H16M21 7V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="3" fill="currentColor" />
    </svg>
  )
}

function TimeIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
