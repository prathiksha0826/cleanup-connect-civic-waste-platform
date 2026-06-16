export interface User {
  id: number;
  email: string;
  name: string;
  role: 'citizen' | 'municipality' | 'super-admin' | 'municipality-worker';
  municipalityName?: string;
  municipalityLocation?: { lat: number; lng: number };
  points: number;
  badges: string[];
  createdAt: string;
}

export function setUser(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cleanup_user', JSON.stringify(user));
  }
}

export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('cleanup_user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
}

export function clearUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cleanup_user');
  }
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}