// Quick test script to debug webhook creation
import 'dotenv/config';
import axios from 'axios';

const API_BASE_URL = process.env.SURVAI_API_BASE_URL || 'http://localhost:5173';
const API_KEY = process.env.SURVAI_API_KEY;

async function testWebhookCreation() {
  try {
    console.log('Testing webhook creation...');
    console.log('API Base URL:', API_BASE_URL);
    console.log('API Key:', API_KEY.substring(0, 20) + '...');

    const response = await axios.post(
      `${API_BASE_URL}/api/v1/webhooks`,
      {
        url: 'https://noncontemporaneous-plumply-ashlea.ngrok-free.dev/webhooks/survai',
        name: 'Debug Test Webhook',
        events: ['evaluation.completed']
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );

    console.log('\n✅ Webhook created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\n❌ Webhook creation failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }

    // Try to get more details
    if (error.response && error.response.status === 500) {
      console.log('\n🔍 This is a server-side error. Check the SurvAI dev server console for details.');
      console.log('The error should be logged with "Error creating webhook:" prefix.');
    }
  }
}

testWebhookCreation();
