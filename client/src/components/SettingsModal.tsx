import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Record<string, any>;
  onSave: (newConfig: Record<string, any>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableGroqModels, setAvailableGroqModels] = useState<string[]>([]);
  const [isLoadingGroq, setIsLoadingGroq] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadModels(localConfig.ollama?.baseUrl || 'http://localhost:11434');
      if (localConfig.groq?.apiKey) {
        loadGroqModels(localConfig.groq.apiKey);
      }
    }
  }, [isOpen]);

  const loadModels = async (baseUrl: string) => {
    setIsLoadingModels(true);
    try {
      const resp = await fetch(`http://localhost:4000/api/generate/models?baseUrl=${encodeURIComponent(baseUrl)}`);
      if (resp.ok) {
        const data = await resp.json();
        setAvailableModels(data.models || []);
        
        // Auto-select first model if the current one isn't in the list
        if (data.models && data.models.length > 0 && !data.models.includes(localConfig.ollama?.model)) {
           handleChange('ollama', 'model', data.models[0]);
        }
      }
    } catch (e) {
      // Failed to load models
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadGroqModels = async (apiKey: string) => {
    setIsLoadingGroq(true);
    try {
       const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;
       const cacheStr = localStorage.getItem('groqModelsCache');
       if (cacheStr) {
         try {
           const cache = JSON.parse(cacheStr);
           if (cache.timestamp && (Date.now() - cache.timestamp < FORTNIGHT_MS)) {
             setAvailableGroqModels(cache.models);
             return;
           }
         } catch(e) {}
       }

       const resp = await fetch('http://localhost:4000/api/generate/groq/models', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ apiKey })
       });
       
       if (resp.ok) {
         const data = await resp.json();
         const models = data.models || [];
         setAvailableGroqModels(models);
         localStorage.setItem('groqModelsCache', JSON.stringify({
            timestamp: Date.now(),
            models
         }));

         if (models.length > 0 && !models.includes(localConfig.groq?.model)) {
            handleChange('groq', 'model', models[0]);
         }
       }
    } catch(e) {
       console.error("Failed to load Groq models", e);
    } finally {
       setIsLoadingGroq(false);
    }
  };

  if (!isOpen) return null;

  const handleChange = (provider: string, field: string, value: string) => {
    setLocalConfig(prev => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value }
    }));
    setTestStatus('idle'); // Reset status on edit
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const testConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testing connection...');
    try {
      const isGroqKeySet = !!localConfig.groq?.apiKey;
      const isOpenAIKeySet = !!localConfig.openai?.apiKey;

      let providerToTest = 'ollama';
      let configObj = localConfig.ollama;

      if (isOpenAIKeySet) { providerToTest = 'openai'; configObj = localConfig.openai; }
      else if (isGroqKeySet) { providerToTest = 'groq'; configObj = localConfig.groq; }

      const resp = await fetch('http://localhost:4000/api/generate/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerToTest, config: configObj })
      });
      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server returned non-JSON: ${text.substring(0, 50)}...`);
      }
      if (resp.ok) {
        setTestStatus('success');
        setTestMessage(data.message || 'Connection successful!');
      } else {
        setTestStatus('error');
        setTestMessage(`Connection failed: ${data.error}`);
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage(`Network error testing connection: ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-gray-700">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-gray-100">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded text-gray-400">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Ollama */ }
          <div className="space-y-2">
            <h3 className="font-medium text-blue-400">Ollama Setting</h3>
            <div className="flex space-x-2">
              <input 
                type="text" 
                placeholder="Base URL (e.g., http://localhost:11434)" 
                className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 focus:outline-none"
                value={localConfig.ollama?.baseUrl || ''}
                onChange={(e) => handleChange('ollama', 'baseUrl', e.target.value)}
              />
              <button 
                onClick={() => loadModels(localConfig.ollama?.baseUrl || 'http://localhost:11434')}
                className="px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200 transition"
              >
                Refresh
              </button>
            </div>
            {isLoadingModels ? (
              <div className="text-sm text-gray-500 p-2 border border-gray-700 rounded bg-gray-900">Loading models...</div>
            ) : (
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 focus:outline-none"
                value={availableModels.includes(localConfig.ollama?.model) ? localConfig.ollama?.model : ''}
                onChange={(e) => handleChange('ollama', 'model', e.target.value)}
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))
                ) : (
                  <option value="" disabled>No downloaded models found</option>
                )}
              </select>
            )}
          </div>

          {/* Groq */ }
          <div className="space-y-2">
            <h3 className="font-medium text-orange-400">Groq Setting</h3>
            <input 
              type="password" 
              placeholder="API Key" 
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-orange-500 focus:outline-none"
              value={localConfig.groq?.apiKey || ''}
              onChange={(e) => handleChange('groq', 'apiKey', e.target.value)}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== config.groq?.apiKey) {
                  loadGroqModels(e.target.value);
                }
              }}
            />
            {isLoadingGroq ? (
              <div className="text-sm text-gray-500 p-2 border border-gray-700 rounded bg-gray-900">Loading models...</div>
            ) : availableGroqModels.length > 0 ? (
              <select
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-orange-500 focus:outline-none"
                value={availableGroqModels.includes(localConfig.groq?.model) ? localConfig.groq?.model : ''}
                onChange={(e) => handleChange('groq', 'model', e.target.value)}
              >
                {availableGroqModels.map((m: string) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                placeholder="Model (e.g., llama3-8b-8192)" 
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-orange-500 focus:outline-none"
                value={localConfig.groq?.model || ''}
                onChange={(e) => handleChange('groq', 'model', e.target.value)}
              />
            )}
          </div>

          {/* OpenAI */ }
          <div className="space-y-2">
            <h3 className="font-medium text-green-400">Open AI API keys</h3>
            <input 
              type="password" 
              placeholder="API Key" 
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-green-500 focus:outline-none"
              value={localConfig.openai?.apiKey || ''}
              onChange={(e) => handleChange('openai', 'apiKey', e.target.value)}
            />
             <input 
              type="text" 
              placeholder="Model (e.g., gpt-4o)" 
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:border-green-500 focus:outline-none"
              value={localConfig.openai?.model || ''}
              onChange={(e) => handleChange('openai', 'model', e.target.value)}
            />
          </div>

          {/* Others - Claude/Gemini/LMStudio omitted for brevity but they follow same pattern */}
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-between items-center bg-gray-850">
          <div className="flex-1 mr-4">
             {testStatus !== 'idle' && (
               <span className={`text-sm ${
                 testStatus === 'success' ? 'text-green-400' : 
                 testStatus === 'error' ? 'text-red-400' : 'text-blue-400'
               }`}>
                 {testMessage}
               </span>
             )}
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={testConnection} 
              disabled={testStatus === 'testing'}
              className="px-4 py-2 border border-gray-600 rounded text-gray-300 hover:bg-gray-700 transition disabled:opacity-50"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            <button 
              onClick={handleSave} 
              className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 transition"
            >
              Save Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
