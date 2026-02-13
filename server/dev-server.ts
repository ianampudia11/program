#!/usr/bin/env node

import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

// Import the server index file
import('./index.js').catch(error => {
  console.error('Failed to start server:', error);
  // Try .ts extension if .js fails
  import('./index').catch(err => {
    console.error('Also failed with .ts:', err);
    process.exit(1);
  });
});
