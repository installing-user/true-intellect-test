import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { InvalidInputError } from '../domain/invalid-input.error.js';

interface JsonResponse {
  status(code: number): { json(body: unknown): void };
}

@Catch(InvalidInputError)
export class InvalidInputFilter implements ExceptionFilter {
  catch(error: InvalidInputError, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<JsonResponse>()
      .status(HttpStatus.BAD_REQUEST)
      .json({ message: error.message, error: 'Bad Request', statusCode: HttpStatus.BAD_REQUEST });
  }
}
