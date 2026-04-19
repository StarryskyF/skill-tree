import { Controller, Get, Logger } from '@nestjs/common';
import { HelloService } from './hello.service';
import { HelloResponseDto } from './dto/hello-response.dto';

@Controller('hello')
export class HelloController {
  private readonly logger = new Logger(HelloController.name);

  constructor(private readonly helloService: HelloService) {}

  @Get()
  getHello(): HelloResponseDto {
    this.logger.log('GET /api/hello');
    return this.helloService.getHello();
  }
}
