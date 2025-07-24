const API_BASE_URL = 'http://localhost:5000/api';

export async function login(email: string, password: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    return data;
  } catch (error) {
    throw error;
  }
}

export async function testDbConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/test`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Test DB connection failed');
    }
    return data;
  } catch (error) {
    throw error;
  }
}
