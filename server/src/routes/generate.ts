import { Router } from 'express';
import { generateTestCases, generateTestCasesStream, ensureOllamaRunning } from '../services/llmService.js';
import axios from 'axios';

const router = Router();

router.get('/models', async (req, res) => {
  try {
    const baseUrl = req.query.baseUrl || 'http://localhost:11434';
    await ensureOllamaRunning(baseUrl as string);
    const tagsResp = await axios.get(`${baseUrl}/api/tags`);
    const models = tagsResp.data?.models?.map((m: any) => m.name) || [];
    res.json({ models });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch models from Ollama' });
  }
});

router.post('/groq/models', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) throw new Error("API Key required");
    const resp = await axios.get('https://api.groq.com/openai/v1/models', { 
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    // the models array is inside resp.data.data according to Groq/OpenAI spec
    const models = resp.data?.data?.map((m: any) => m.id) || [];
    res.json({ models });
  } catch (error: any) {
    res.status(400).json({ error: 'Failed to fetch Groq models' });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { provider, config } = req.body;
    // Just a basic connectivity check for the provided LLM credentials
    if (provider === 'ollama') {
      const baseUrl = config.baseUrl || 'http://localhost:11434';
      const model = config.model || 'llama3';
      
      await ensureOllamaRunning(baseUrl);
      
      const tagsResp = await axios.get(`${baseUrl}/api/tags`);
      
      const models = tagsResp.data?.models || [];
      const hasModel = models.some((m: any) => m.name === model || m.name.startsWith(model + ':'));
      
      if (!hasModel) {
         res.status(400).json({ error: `Ollama is reachable, but model '${model}' is not downloaded. Please run 'ollama run ${model}' in your terminal first.` });
         return;
      }
      res.json({ success: true, message: `Ollama connected and model '${model}' found!` });
    } else if (provider === 'groq') {
       if (!config.apiKey) throw new Error("API Key required");
       await axios.get('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${config.apiKey}` }});
       res.json({ success: true, message: 'Groq connected!' });
    } else if (provider === 'openai') {
       if (!config.apiKey) throw new Error("API Key required");
       await axios.get('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${config.apiKey}` }});
       res.json({ success: true, message: 'OpenAI connected!' });
    } else {
       res.json({ success: true, message: 'Mock connection successful for this provider' });
    }
  } catch (error: any) {
     let errorDetails = error.response?.data?.error?.message || error.response?.data?.error || error.message;
     if (typeof errorDetails === 'object' && errorDetails !== null) {
       errorDetails = errorDetails.message || JSON.stringify(errorDetails);
     }
     res.status(400).json({ error: errorDetails });
  }
});

router.post('/', async (req, res) => {
  try {
    const { requirements, provider, config } = req.body;
    
    if (!requirements || !provider) {
       res.status(400).json({ error: 'Requirements and provider are required.' });
       return;
    }

    const testCases = await generateTestCases(requirements, provider, config);
    res.json({ result: testCases });
  } catch (error: any) {
    const errorDetails = error.response?.data?.error || error.response?.data?.message || error.message;
    console.error('Error generating test cases:', errorDetails);
    res.status(500).json({ error: errorDetails || 'An error occurred during generation.' });
  }
});

router.post('/stream', async (req, res) => {
  const { requirements, provider, config } = req.body;
  if (!requirements || !provider) {
    res.status(400).json({ error: 'Requirements and provider are required.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    await generateTestCasesStream(requirements, provider, config, (chunk) => {
       res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    let errorDetails = error.response?.data?.error || error.response?.data?.message || error.message;
    if (typeof errorDetails === 'object' && errorDetails !== null) {
      errorDetails = errorDetails.message || JSON.stringify(errorDetails);
    }
    console.error('Error streaming test cases:', errorDetails);
    res.write(`data: ${JSON.stringify({ error: errorDetails || 'An error occurred.' })}\n\n`);
    res.end();
  }
});

export default router;
