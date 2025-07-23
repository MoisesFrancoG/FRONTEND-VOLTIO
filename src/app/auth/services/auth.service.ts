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
  token: string;
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
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  saveUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
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

  // Método helper para obtener toda la información del usuario autenticado
  getCurrentUserData() {
    return {
      token: this.getToken(),
      user: this.getUser(),
      user_id: this.getUserId(),
    };
  }
}
