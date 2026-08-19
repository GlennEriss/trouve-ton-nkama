import '../node/slow-buffer-compat';
import * as functions from 'firebase-functions/v1';
import { admin } from '../admin';
import {
  publishLinkToPage,
  resolveFacebookPageConfig,
} from './facebook-page.client';
import {
  buildListingPostMessage,
  buildListingUrl,
  shouldPublishApprovedListing,
} from './facebook-page.policy';

/**
 * Publie automatiquement une annonce sur la Page Facebook de la plateforme dès que la
 * modération l'approuve.
 *
 * Trigger distinct de onPropertyModerationStatusChange (notifications) volontairement : une
 * panne Facebook ou un jeton expiré ne doit pas empêcher l'annonceur de recevoir sa
 * notification d'approbation.
 *
 * Aucun rattrapage des annonces déjà approuvées : le déclenchement est la transition vers
 * APPROVED. Republier les ~950 annonces existantes inonderait la Page.
 */
export const onListingApprovedPublishToFacebook = functions
  .runWith({
    secrets: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN', 'NEXT_PUBLIC_APP_URL'],
  })
  .firestore.document('properties/{propertyId}')
  .onUpdate(async (change, context) => {
    const propertyId = context.params.propertyId as string;
    const before = change.before.data() as Record<string, unknown>;
    const after = change.after.data() as Record<string, unknown>;

    if (!shouldPublishApprovedListing(before, after)) {
      return null;
    }

    const config = resolveFacebookPageConfig();
    if (!config) {
      // Inerte tant que la Page n'est pas connectée : on ne veut ni erreur ni bruit dans les
      // logs pour une fonctionnalité simplement pas encore configurée.
      functions.logger.debug('Facebook page publishing skipped: not configured', { propertyId });
      return null;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!appUrl) {
      functions.logger.warn('Facebook page publishing skipped: missing NEXT_PUBLIC_APP_URL', {
        propertyId,
      });
      return null;
    }

    const listingUrl = buildListingUrl(propertyId, appUrl);
    const message = buildListingPostMessage(after, listingUrl);

    const result = await publishLinkToPage({ config, message, link: listingUrl });

    if (!result.success) {
      functions.logger.error('Facebook page publishing failed', {
        propertyId,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      });
      // Pas de relance : un échec ne doit pas bloquer la modération, et un rejeu automatique
      // risquerait un doublon sur la Page. La reprise se fait à la main.
      return null;
    }

    // Marqueur d'idempotence : shouldPublishApprovedListing s'appuie dessus pour ne jamais
    // republier la même annonce.
    await change.after.ref.update({
      facebookPost: {
        id: result.postId,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    functions.logger.info('Listing published to Facebook page', {
      propertyId,
      postId: result.postId,
    });

    return null;
  });
