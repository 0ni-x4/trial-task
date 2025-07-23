// Basic auth stub for essay-assist standalone project
export async function auth() {
  // Mock session for development - replace with real auth implementation
  return {
    user: {
      id: 'demo-user-id',
      email: 'demo@example.com',
      name: 'Demo User'
    }
  }
}

export { auth as getSession }
