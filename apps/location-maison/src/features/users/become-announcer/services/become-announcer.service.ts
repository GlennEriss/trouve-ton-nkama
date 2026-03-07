import { createLogger } from '@/lib/logger';
import type {
  BecomeAnnouncerData,
  BecomeAnnouncerResult,
  BecomeAnnouncerService,
} from './become-announcer.service.interface';
import { BecomeAnnouncerErrorCode } from './become-announcer.service.interface';

const logger = createLogger('users.become-announcer.service');

function buildUnknownErrorResult(): BecomeAnnouncerResult {
  return {
    success: false,
    error: {
      code: BecomeAnnouncerErrorCode.UNKNOWN_ERROR,
      message: "Une erreur inattendue est survenue. Veuillez réessayer.",
    },
  };
}

export class BecomeAnnouncerServiceImpl implements BecomeAnnouncerService {
  async becomeAnnouncer(data: BecomeAnnouncerData): Promise<BecomeAnnouncerResult> {
    try {
      const response = await fetch('/api/users/become-announcer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const body = (await response.json().catch(() => null)) as
        | BecomeAnnouncerResult
        | { error?: { code?: string; message?: string } }
        | null;

      if (!response.ok) {
        const code = body && 'error' in body ? body.error?.code : undefined;
        const message = body && 'error' in body ? body.error?.message : undefined;

        const result: BecomeAnnouncerResult = {
          success: false,
          error: {
            code: code ?? BecomeAnnouncerErrorCode.UNKNOWN_ERROR,
            message: message ?? 'Impossible de devenir annonceur pour le moment.',
          },
        };

        logger.warn('Become announcer API rejected request', {
          status: response.status,
          code: result.error?.code,
        });

        return result;
      }

      if (!body || typeof body !== 'object') {
        logger.warn('Become announcer API returned invalid payload', {
          body,
        });
        return buildUnknownErrorResult();
      }

      return body as BecomeAnnouncerResult;
    } catch (error) {
      logger.error('Become announcer API call crashed', {
        error,
      });
      return buildUnknownErrorResult();
    }
  }
}

export const becomeAnnouncerService: BecomeAnnouncerService = new BecomeAnnouncerServiceImpl();
