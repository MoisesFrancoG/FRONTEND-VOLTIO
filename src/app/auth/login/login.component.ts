import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password,
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('Login exitoso:', response);

          // Guardar token, datos del usuario y user_id
          this.authService.saveToken(response.token);
          this.authService.saveUser(response.user);
          this.authService.saveUserId(response.user_id);

          // Navegar a monitoring
          this.router.navigate(['/monitoring']);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error en login:', error);
          this.errorMessage =
            error.error?.message ||
            'Error al iniciar sesión. Verifica tus credenciales.';
          this.isLoading = false;
        },
      });
    }
  }
}
