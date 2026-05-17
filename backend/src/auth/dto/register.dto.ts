import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(32) username: string;
  @IsString() @MinLength(6) @MaxLength(16) password: string;
  @IsString() @IsNotEmpty() @MaxLength(30) name: string;
}
