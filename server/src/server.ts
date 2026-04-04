import express from 'express';
import cors from 'express';
// @ts-ignore
import corsMiddleware from 'cors';
import generateRoutes from './routes/generate.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(corsMiddleware());
app.use(express.json({ limit: '10mb' }));

app.use('/api/generate', generateRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Local LLM Test Generator API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
