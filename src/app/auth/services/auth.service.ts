import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  role_id: number;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  token_type: string;
  user_id: number;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl || 'https://voltioapi.acstree.xyz/api/v1'; // Ajusta según tu API

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/users/login`,
      credentials
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/users/register`,
      userData
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_id');
  }

  saveToken(token: string): void {
    if (token && token !== 'undefined' && token !== 'null') {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    return token && token !== 'undefined' && token !== 'null' ? token : null;
  }

  saveUser(user: any): void {
    if (user !== undefined && user !== null) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    if (!user || user === 'undefined') return null;
    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  }

  saveUserId(userId: number): void {
    localStorage.setItem('user_id', userId.toString());
  }

  getUserId(): number | null {
    const userId = localStorage.getItem('user_id');
    return userId ? parseInt(userId, 10) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUserData() {
    return {
      token: this.getToken(),
      user: this.getUser(),
      user_id: this.getUserId(),
    };
  }
}
