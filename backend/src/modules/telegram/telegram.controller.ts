import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { successRes } from '../../common/helpers/success-res';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get('config')
  getConfig() {
    const enabled = this.config.get<boolean>('telegram.enabled');
    const botUsername = this.config.get<string>('telegram.botUsername');
    return successRes({
      enabled: Boolean(enabled && botUsername),
      botUsername: enabled ? botUsername : null,
    });
  }
}
