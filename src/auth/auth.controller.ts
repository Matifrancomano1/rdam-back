import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/response.helper';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto.username, dto.password);
    return successResponse(data);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    const data = await this.authService.refresh(dto.refreshToken);
    return successResponse(data);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Request() req: any) {
    const authHeader = req.headers.authorization as string;
    const token = authHeader?.replace('Bearer ', '') ?? '';
    this.authService.logout(token);
    return {
      success: true,
      message: 'Sesión cerrada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: any) {
    const data = this.authService.getMe(user.id);
    return successResponse(data);
  }
}
