import { useState, useRef, useEffect } from 'react';
import { Settings, Send, FileCode, X, Clock } from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [provider, setProvider] = useState<string>('ollama');
  const [requirementText, setRequirementText] = useState('');
  const [testCasesOutput, setTestCasesOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ id: string; prompt: string; result: string }[]>(() => {
    try {
      const saved = localStorage.getItem('testGenHistory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error parsing history from localStorage", e);
      return [];
    }
  });
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    localStorage.setItem('testGenHistory', JSON.stringify(history));
  }, [history]);

  const [config, setConfig] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('testGenConfig');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing config from localStorage", e);
    }
    return {
      ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' },
      groq: { apiKey: '', model: 'llama3-8b-8192' },
      openai: { apiKey: '', model: 'gpt-4o' }
    };
  });

  useEffect(() => {
    localStorage.setItem('testGenConfig', JSON.stringify(config));
  }, [config]);
  const [eta, setEta] = useState<number | null>(null);

  // Auto-detect downloaded Ollama model on startup
  useEffect(() => {
    fetch(`http://localhost:4000/api/generate/models?baseUrl=${encodeURIComponent(config.ollama.baseUrl)}`)
      .then(res => res.json())
      .then(data => {
        if (data.models && data.models.length > 0) {
          // If the currently configured model isn't downloaded, auto-switch to the first available one
          if (!data.models.includes(config.ollama.model)) {
            setConfig((prev: any) => ({
              ...prev,
              ollama: { ...prev.ollama, model: data.models[0] }
            }));
          }
        }
      })
      .catch(err => console.error('Could not fetch models on startup:', err));
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading && eta !== null && eta > 0) {
      interval = setInterval(() => {
        setEta(prev => (prev !== null && prev > 1 ? prev - 1 : 1)); // Hold at 1s if taking longer
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoading, eta]);

  const handleGenerate = async () => {
    if (!requirementText.trim()) return;

    if (abortControllerRef.current) {
       abortControllerRef.current.abort(); // Cancel any existing request
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Estimate Time Heuristic
    let calculatedEta = 15;
    if (provider === 'ollama') calculatedEta = 35;
    else if (provider === 'groq') calculatedEta = 5;
    
    // Check if user specified a number of cases to add buffer time
    const tcMatch = requirementText.match(/(\d+)\s*(tcs?|test\s*cases?)/i);
    if (tcMatch) {
       const tcCount = parseInt(tcMatch[1], 10);
       calculatedEta += tcCount > 0 ? tcCount * 1.5 : 0;
    }
    setEta(Math.floor(calculatedEta));

    setIsLoading(true);
    setTestCasesOutput(null);

    try {
      const resp = await fetch('http://localhost:4000/api/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: requirementText,
          provider: provider.toLowerCase().replace(/\s+/g, ''),
          config: config[provider.toLowerCase().replace(/\s+/g, '') as keyof typeof config]
        }),
        signal: controller.signal
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        let errMsg = errorText;
        try { errMsg = JSON.parse(errorText).error; } catch(e){}
        setTestCasesOutput(`Error: ${errMsg}`);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('ReadableStream not yet supported in this browser.');
      
      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let streamedOutput = '';

      setTestCasesOutput(''); // clear the "Generating test cases..." loading screen once stream starts
      setIsLoading(false); // Disable pure loading state since we are now streaming

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const messages = chunk.split('\n\n');
          for (const msg of messages) {
            if (msg.startsWith('data: ')) {
              const dataStr = msg.replace('data: ', '');
              if (dataStr === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  streamedOutput += `\n\nError: ${parsed.error}`;
                  setTestCasesOutput(streamedOutput);
                } else if (parsed.chunk) {
                  streamedOutput += parsed.chunk;
                  setTestCasesOutput(streamedOutput);
                }
              } catch (e) {
                // Ignore incomplete JSON chunks (though split by \n\n should usually catch whole SSE events)
              }
            }
          }
        }
      }

      // Add to history after done
      const newEntry = { id: Date.now().toString(), prompt: requirementText, result: streamedOutput };
      setHistory(prev => [newEntry, ...prev]);
      setActiveHistoryId(newEntry.id);

    } catch (e: any) {
      if (e.name === 'AbortError') {
         setTestCasesOutput(prev => (prev || '') + '\n\n[Generation cancelled by user]');
      } else {
         setTestCasesOutput(`Error: ${e.message}`);
      }
      setIsLoading(false);
    } finally {
      if (abortControllerRef.current === controller) {
         abortControllerRef.current = null;
      }
    }
  };

  const handleCancel = () => {
     if (abortControllerRef.current) {
        abortControllerRef.current.abort();
     }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      
      {/* Sidebar - History */}
      <div className="w-64 border-r border-gray-700 flex flex-col bg-gray-800 hidden md:flex">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold flex items-center"><FileCode className="mr-2 h-5 w-5 text-blue-400"/> History</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
           {history.length > 0 ? (
             history.map(item => (
               <div 
                 key={item.id} 
                 onClick={() => {
                   setTestCasesOutput(item.result);
                   setRequirementText(item.prompt);
                   setActiveHistoryId(item.id);
                 }}
                 className={`p-3 rounded-lg cursor-pointer text-sm truncate border transition ${
                   activeHistoryId === item.id 
                     ? 'bg-gray-700 border-blue-500 text-gray-100' 
                     : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                 }`}
                 title={item.prompt}
               >
                  {item.prompt}
               </div>
             ))
           ) : (
             <div className="text-gray-400 text-sm">No history yet...</div>
           )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="h-14 border-b border-gray-700 flex items-center justify-between px-6 bg-gray-800">
          <div className="flex items-center space-x-3">
             <span className="font-semibold hidden sm:block">Local LLM Test Generator</span>
             <select 
               className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
               value={provider}
               onChange={(e) => setProvider(e.target.value)}
             >
                <option value="ollama">Ollama</option>
                <option value="groq">Groq</option>
                <option value="openai">OpenAI</option>
             </select>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded hover:bg-gray-700 transition text-gray-300"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </header>

        {/* Output Display Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-blue-400">
               <div className="animate-pulse mb-3 text-lg font-medium flex items-center">
                 Generating test cases...
               </div>
               {eta !== null && (
                 <div className="flex items-center text-sm text-gray-400 font-mono bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700 shadow-inner">
                   <Clock className="w-4 h-4 mr-2" /> ETA: ~{eta}s
                 </div>
               )}
            </div>
          ) : testCasesOutput ? (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed max-w-4xl mx-auto shadow-inner">
              {testCasesOutput}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 flex-col">
               <FileCode size={48} className="mb-4 opacity-50" />
               <p>Paste Jira requirements below to generate test cases.</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="max-w-4xl mx-auto relative flex items-end">
             <textarea 
               value={requirementText}
               onChange={(e) => setRequirementText(e.target.value)}
               placeholder="Ask here or paste TC for Requirement..."
               className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 pr-12 resize-none h-24 focus:outline-none focus:border-blue-500 custom-scrollbar"
            />
            <div className="absolute right-3 bottom-3 flex space-x-2">
              {isLoading && (
                <button
                  onClick={handleCancel}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
                  title="Cancel Generation"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button 
                onClick={handleGenerate}
                disabled={isLoading || !requirementText.trim()}
                className={`p-2 rounded transition ${isLoading || !requirementText.trim() ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={(newConf) => setConfig(newConf as any)}
      />
    </div>
  );
}

export default App;
