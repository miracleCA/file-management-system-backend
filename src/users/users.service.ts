import { PrismaService } from 'prisma/prisma.service';
import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from 'src/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(registerDto: RegisterDto) {
    const existingUser = await this.findByEmail(registerDto.email);

    if (existingUser)
      throw new ConflictException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    return this.prisma.user.create({
      data: {
        email: registerDto.email.toLowerCase(),
        passwordHash,
      },
    });
  }
}
