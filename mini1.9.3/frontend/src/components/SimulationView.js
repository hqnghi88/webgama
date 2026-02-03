import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import '../styles/index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', border: '1px solid red' }}>
          <h2>Something went wrong.</h2>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SimulationView = () => {
  const [params, setParams] = useState({
    populationSize: 200,
    duration: 300,
    transmissionRate: 0.2,
    recoveryRate: 0.05,
    movementSpeed: 3.0
  });

  const [loading, setLoading] = useState(false);
  const [latestFrame, setLatestFrame] = useState(null);
  const [stats, setStats] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef(null);
  const eventSourceRef = useRef(null);

  const RAW_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
  const BACKEND_URL = RAW_URL.endsWith('/') ? RAW_URL.slice(0, -1) : RAW_URL;

  const stopSimulation = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsPlaying(false);
    setLoading(false);
  }, []);

  const runSimulation = useCallback(() => {
    stopSimulation();
    setLoading(true);
    setStats([]);

    const queryParams = new URLSearchParams({
      populationSize: params.populationSize,
      transmissionRate: params.transmissionRate,
      recoveryRate: params.recoveryRate,
      movementSpeed: params.movementSpeed
    }).toString();

    const targetUrl = `${BACKEND_URL}/api/simulation/stream?${queryParams}`;
    console.log("Connecting to stream:", targetUrl);

    try {
      const evtSource = new EventSource(targetUrl);
      eventSourceRef.current = evtSource;

      evtSource.onopen = () => {
        setLoading(false);
        setIsPlaying(true);
      };

      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLatestFrame(data.frame);
          setStats(prevStats => {
            const newStats = [...prevStats, data.stats];
            if (newStats.length > 100) return newStats.slice(newStats.length - 100);
            return newStats;
          });
        } catch (e) {
          console.error("Error parsing stream data", e);
        }
      };

      evtSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        evtSource.close();
        setLoading(false);
        setIsPlaying(false);
      };
    } catch (err) {
      console.error(err);
      alert(`Failed to start stream: ${err.message}`);
      setLoading(false);
    }
  }, [params, stopSimulation, BACKEND_URL]);

  useEffect(() => {
    return () => stopSimulation();
  }, [stopSimulation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !latestFrame) return;

    try {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#f0f2f5';
      ctx.fillRect(0, 0, width, height);

      if (latestFrame.agents) {
        latestFrame.agents.forEach(agent => {
          ctx.beginPath();
          ctx.arc(agent.x, agent.y, 4, 0, 2 * Math.PI);

          if (agent.status === 0) ctx.fillStyle = '#3498db';
          else if (agent.status === 1) ctx.fillStyle = '#e74c3c';
          else ctx.fillStyle = '#2ecc71';

          ctx.fill();
        });
      }

      ctx.fillStyle = 'black';
      ctx.font = '16px Arial';
      ctx.fillText(`Live Step: ${latestFrame.step}`, 10, 20);
    } catch (e) {
      console.error("Canvas Drawing Error:", e);
    }
  }, [latestFrame]);

  const handleParamChange = (e) => {
    setParams({ ...params, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleReset = () => {
    stopSimulation();
    setLatestFrame(null);
    setStats([]);
  };

  return (
    <div className="simulation-view">
      <div>
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="s" stroke="#3498db" name="Susceptible" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="i" stroke="#e74c3c" name="Infected" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="r" stroke="#2ecc71" name="Recovered" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="controls-panel">
        <h3>Live Controls</h3>

        {['populationSize', 'transmissionRate', 'recoveryRate', 'movementSpeed'].map(field => (
          <div key={field} className="param-group">
            <label>{field.replace(/([A-Z])/g, ' $1').trim()}</label>
            <input
              type="number"
              step={field.includes('Rate') ? "0.05" : "1"}
              name={field}
              value={params[field]}
              onChange={handleParamChange}
            />
          </div>
        ))}

        <div className="playback-controls">
          {!isPlaying ? (
            <button className="playback-btn start" onClick={runSimulation} disabled={loading}>
              {loading ? 'Connecting...' : '▶ Start'}
            </button>
          ) : (
            <button className="playback-btn stop" onClick={stopSimulation}>
              ⏹ Stop
            </button>
          )}
          <button className="playback-btn reset" onClick={handleReset}>
            ↺ Reset
          </button>
        </div>
      </div>
    </div>
  );
};

const WrappedSimulationView = () => (
  <ErrorBoundary>
    <SimulationView />
  </ErrorBoundary>
);

export default WrappedSimulationView;
