import { createParamDecorator } from '@nestjs/common';

export const DClient = createParamDecorator((data, req) => {
  return req.user;
});
