import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/response.helper';
import { IsString, MinLength, IsOptional } from 'class-validator';

class ChangePasswordDto {
  @IsString() @IsOptional() currentPassword?: string;
  @IsString() @MinLength(8) newPassword: string;
  @IsString() @MinLength(8) confirmPassword: string;
}

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles('Administrador')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUsuarioDto) {
    const data = await this.usuariosService.create(dto);
    return successResponse(data);
  }

  @Get()
  @Roles('Administrador')
  findAll(
    @Query('search') search?: string,
    @Query('rol') rol?: string,
    @Query('activo') activo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = this.usuariosService.findAll({
      search,
      rol,
      activo: activo !== undefined ? activo === 'true' : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return successResponse(data);
  }

  @Get(':id')
  @Roles('Administrador')
  findOne(@Param('id') id: string) {
    return successResponse(this.usuariosService.findOne(id));
  }

  @Put(':id')
  @Roles('Administrador')
  async update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto) {
    const data = await this.usuariosService.update(id, dto);
    return successResponse(data);
  }

  @Delete(':id')
  @Roles('Administrador')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string) {
    const data = this.usuariosService.softDelete(id);
    return {
      success: true,
      message: 'Usuario desactivado exitosamente',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: any,
  ) {
    await this.usuariosService.changePassword(
      id,
      dto.currentPassword ?? '',
      dto.newPassword,
      dto.confirmPassword,
      user.id,
      user.rol,
    );
    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
      timestamp: new Date().toISOString(),
    };
  }
}
