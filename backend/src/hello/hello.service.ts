import { Injectable, Logger } from '@nestjs/common';
import { HelloResponseDto } from './dto/hello-response.dto';

@Injectable()
export class HelloService {
  private readonly logger = new Logger(HelloService.name);

  getHello(): HelloResponseDto {
    this.logger.log('getHello called');
    return { greeting: 'Hello World' };
  }
}
