// Integration test for TuCitaSegura
const apiService = {
  baseURL: 'http://localhost:8000',
  async healthCheck() {
    try {
      console.log(`Trying to fetch: ${this.baseURL}/health`);
      const response = await fetch(`${this.baseURL}/health`);
      console.log(`Response status: ${response.status}`);
      const data = await response.json();
      console.log(`Response data:`, data);
      return response.ok;
    } catch (error) {
      console.error('Health check error:', error.message);
      return false;
    }
  }
};

async function testIntegration() {
  console.log('🧪 Testing TuCitaSegura Integration...');
  
  // Test backend health
  const isHealthy = await apiService.healthCheck();
  console.log(`Backend Health: ${isHealthy ? '✅ ONLINE' : '❌ OFFLINE'}`);
  
  if (isHealthy) {
    console.log('🎉 Integration Test PASSED - Backend is responding!');
  } else {
    console.log('❌ Integration Test FAILED - Backend not responding');
  }
}

testIntegration().catch(console.error);