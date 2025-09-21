import dotenv from 'dotenv';
import { buildApp } from './app';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  // In development, load from .env.local
  dotenv.config({ path: '.env.local' });
}
// In production, assume environment variables are already set by the platform

const start = async () => {
  try {
    const fastify = await buildApp();
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`MedMe Schedule API server listening on ${host}:${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();