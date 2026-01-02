/**
 * @jest-environment node
 */

// Polyfill TextEncoder/TextDecoder BEFORE any other imports
// This must be loaded first to avoid errors during module initialization
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const cors = require('cors');

// Save original environment variables
const originalEnv = process.env;

let mongoServer;
let app;
let Email;

describe('Server API Endpoints', () => {
  beforeAll(async () => {
    // Create a MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Set environment variables
    process.env.MONGODB_URI = mongoUri;
    
    // Create a fresh Express app
    app = express();
    app.use(cors());
    app.use(express.json());
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri);
    
    // Create Email model
    const emailSchema = new mongoose.Schema({
      email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    });
    Email = mongoose.model('Email', emailSchema);
    
    // Add routes to the app
    app.post('/api/subscribe', async (req, res) => {
      try {
        const { email } = req.body;
        
        // Validate email
        if (!email || !email.includes('@')) {
          return res.status(400).json({ error: 'Invalid email address' });
        }
    
        // Check if email already exists
        const existingEmail = await Email.findOne({ email });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already subscribed' });
        }
    
        // Create new subscription
        const newEmail = await Email.create({ email });
        res.status(201).json({ message: 'Successfully subscribed!', email: newEmail });
      } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
      }
    });
    
    app.get('/api/subscribers', async (req, res) => {
      try {
        const subscribers = await Email.find().sort({ createdAt: -1 });
        res.json(subscribers);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscribers' });
      }
    });
  });
  
  afterAll(async () => {
    // Close MongoDB connection and server
    await mongoose.disconnect();
    await mongoServer.stop();
    
    // Restore environment variables
    process.env = originalEnv;
  });
  
  beforeEach(async () => {
    // Clear the Email collection before each test
    await Email.deleteMany({});
  });
  
  describe('POST /api/subscribe', () => {
    test('should subscribe a new email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com' })
        .expect(201);
      
      expect(response.body.message).toBe('Successfully subscribed!');
      expect(response.body.email.email).toBe('test@example.com');
      
      // Check that the email was saved to the database
      const emails = await Email.find({});
      expect(emails.length).toBe(1);
      expect(emails[0].email).toBe('test@example.com');
    });
    
    test('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'invalid-email' })
        .expect(400);
      
      expect(response.body.error).toBe('Invalid email address');
      
      // Check that no email was saved
      const emails = await Email.find({});
      expect(emails.length).toBe(0);
    });
    
    test('should reject duplicate email', async () => {
      // First, add an email
      await Email.create({ email: 'test@example.com' });
      
      // Try to add it again
      const response = await request(app)
        .post('/api/subscribe')
        .send({ email: 'test@example.com' })
        .expect(400);
      
      expect(response.body.error).toBe('Email already subscribed');
      
      // Check that still only one email exists
      const emails = await Email.find({});
      expect(emails.length).toBe(1);
    });
  });
  
  describe('GET /api/subscribers', () => {
    test('should return all subscribers', async () => {
      // Add some test emails
      await Email.create({ email: 'test1@example.com' });
      await Email.create({ email: 'test2@example.com' });
      
      const response = await request(app)
        .get('/api/subscribers')
        .expect(200);
      
      expect(response.body.length).toBe(2);
      expect(response.body.map(e => e.email)).toContain('test1@example.com');
      expect(response.body.map(e => e.email)).toContain('test2@example.com');
    });
    
    test('should return empty array when no subscribers', async () => {
      const response = await request(app)
        .get('/api/subscribers')
        .expect(200);
      
      expect(response.body).toEqual([]);
    });
  });
}); 