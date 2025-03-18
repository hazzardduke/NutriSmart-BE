import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  async registrar(@Body() body) {
    return await this.authService.registrarUsuario(body);
  }

  @Post('login')
  async login(@Body() body) {
  return await this.authService.login(body);
}

}
