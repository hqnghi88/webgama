import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { language } from '../gaml/gamlLanguage';
import '../styles/index.css';

const TEMPLATES = {
  SIR: `model SIR

global {
    int populationSize <- 200;
    float transmissionRate <- 0.2;
    float recoveryRate <- 0.05;
    float movementSpeed <- 3.0;
    
    init {
        create agent number: populationSize {
            location <- {rnd(500), rnd(500)};
        }
    }
}

species agent {
    int status <- 0; // 0: Susceptible, 1: Infected, 2: Recovered
    
    reflex move {
        location <- location + {rnd(-movementSpeed, movementSpeed), rnd(-movementSpeed, movementSpeed)};
    }
    
    reflex infect when: status = 1 {
        list neighbors <- agent at_distance 10;
        ask neighbors {
            if status = 0 and flip(transmissionRate) {
                status <- 1;
            }
        }
    }
    
    reflex recover when: status = 1 {
        if flip(recoveryRate) {
            status <- 2;
        }
    }
    
    aspect default {
        draw circle(4) color: (status = 0 ? #3498db : (status = 1 ? #e74c3c : #2ecc71));
    }
}

experiment main type: gui {
    output {
        display main {
            species agent aspect: default;
        }
    }
}
`
};

const ModelingView = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState(TEMPLATES.SIR);
  const [errors, setErrors] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleEditorChange = useCallback((value) => {
    setCode(value);
    setErrors([]);
  }, []);

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      navigate('/simulation');
      setIsRunning(false);
    }, 500);
  };

  const handleLoadTemplate = (templateName) => {
    setCode(TEMPLATES[templateName]);
    setErrors([]);
  };

  return (
    <div className="modeling-view">
      <div className="editor-container">
        <Editor
          height="100%"
          defaultLanguage="gaml"
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on'
          }}
          beforeMount={(monaco) => {
            monaco.languages.register({ id: 'gaml' });
            monaco.languages.setMonarchTokensProvider('gaml', language);
          }}
        />
      </div>

      <div className="sidebar">
        <h3>Templates</h3>
        <div className="template-item" onClick={() => handleLoadTemplate('SIR')}>
          <span>SIR Model</span>
        </div>

        <button
          className="run-button"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : '▶ Run Simulation'}
        </button>

        {errors.length > 0 && (
          <div className="error-panel">
            <strong>Errors:</strong>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelingView;
