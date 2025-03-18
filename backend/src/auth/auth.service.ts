import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioEntity } from './entities/usuario.entity';
import * as bcrypt from 'bcryptjs';

interface RegistroUsuarioDto {
  correo: string;
  password: string;
  cedula: string;
  nombre: string;
  apellidos: string;
  direccion: string;
  fechaNacimiento: string;
  telefono: string;
}

interface LoginDto {
  correo: string;
  password: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UsuarioEntity)
    private usuarioRepository: Repository<UsuarioEntity>,
  ) {}

  async registrarUsuario(data: RegistroUsuarioDto) {
    try {
      this.logger.log(`Intentando registrar usuario con correo: ${data.correo}`);

      if (!data.correo || !data.password || !data.cedula || !data.nombre || !data.apellidos || 
          !data.direccion || !data.fechaNacimiento || !data.telefono) {
        this.logger.warn('Intento de registro con campos faltantes');
        throw new BadRequestException('Faltan campos requeridos');
      }

      const usuarioExistente = await this.usuarioRepository.findOne({
        where: [
          { correo: data.correo },
          { cedula: data.cedula }
        ]
      });

      if (usuarioExistente) {
        this.logger.warn(`Usuario ya existe con correo: ${data.correo} o cédula: ${data.cedula}`);
        throw new BadRequestException('Correo o cédula ya en uso');
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      const nuevoUsuario = this.usuarioRepository.create({
        ...data,
        password: passwordHash,
        esAdministrador: false,
        verificado: false
      });

      const usuarioGuardado = await this.usuarioRepository.save(nuevoUsuario);
      
      if (!usuarioGuardado) {
        throw new BadRequestException('Error al guardar el usuario');
      }

      this.logger.log(`Usuario registrado exitosamente con ID: ${usuarioGuardado.id}`);

      return {
        message: 'Usuario registrado exitosamente',
        usuario: {
          id: usuarioGuardado.id,
          nombre: usuarioGuardado.nombre,
          apellidos: usuarioGuardado.apellidos,
          correo: usuarioGuardado.correo
        }
      };
    } catch (error) {
      this.logger.error(`Error al registrar usuario: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al registrar usuario');
    }
  }

  async login(data: LoginDto) {
    try {
      this.logger.log(`Intento de login para correo: ${data.correo}`);

      if (!data.correo || !data.password) {
        this.logger.warn('Intento de login sin credenciales completas');
        throw new BadRequestException('Correo y contraseña son requeridos');
      }

      const usuario = await this.usuarioRepository.findOne({
        where: { correo: data.correo }
      });

      if (!usuario) {
        this.logger.warn(`Intento de login fallido: usuario no encontrado - ${data.correo}`);
        throw new BadRequestException('Credenciales incorrectas');
      }

      const passwordValida = await bcrypt.compare(data.password, usuario.password);

      if (!passwordValida) {
        this.logger.warn(`Intento de login fallido: contraseña incorrecta - ${data.correo}`);
        throw new BadRequestException('Credenciales incorrectas');
      }

      this.logger.log(`Login exitoso para usuario: ${usuario.id}`);
      return {
        message: 'Inicio de sesión exitoso',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          correo: usuario.correo,
          rol: usuario.esAdministrador ? 'Administrador' : 'Cliente'
        }
      };
    } catch (error) {
      this.logger.error(`Error en login: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al iniciar sesión');
    }
  }
}
