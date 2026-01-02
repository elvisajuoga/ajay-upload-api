// Server test setup file
// Polyfill TextEncoder/TextDecoder for Node.js test environment
// This must be loaded BEFORE any modules that require it (like supertest)

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

