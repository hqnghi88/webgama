import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ModelingView from './components/ModelingView';
import SimulationView from './components/SimulationView';
import './styles/index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ModelingView />} />
            <Route path="/simulation" element={<SimulationView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
