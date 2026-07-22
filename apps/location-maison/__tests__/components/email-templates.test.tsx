import React from 'react'
import { TextDecoder, TextEncoder } from 'util'

Object.assign(globalThis, { TextDecoder, TextEncoder })
const { renderToStaticMarkup: renderEmail } = require('react-dom/server') as typeof import('react-dom/server')

jest.mock('next/font/google', () => ({
  Inter: () => ({ style: { fontFamily: 'Inter' }, className: 'inter' }),
  Poppins: () => ({ style: { fontFamily: 'Poppins' }, className: 'poppins' }),
}))

import EmailVerification from '@/emails/EmailVerification'
import GenericEmail from '@/emails/GenericEmail'
import Layout from '@/emails/Layout'
import PasswordReset from '@/emails/PasswordReset'
import PropertyPublished from '@/emails/PropertyPublished'
import WelcomeEmail from '@/emails/WelcomeEmail'

const baseTexts = {
  greeting: 'Bonjour',
  copyRight: '© 2026 Trouve Ton Nkama',
  visitSocialNetworks: 'Suivez-nous',
  supportEmail: 'support@tonnkama.com',
  websiteUrl: 'https://www.tonnkama.com',
}

describe('gabarits email', () => {
  it('rend le layout complet, ses réseaux et le lien de désinscription', async () => {
    const html = await renderEmail(
      <Layout
        copyRight={baseTexts.copyRight}
        logoUrl="https://cdn.example.com/header.png"
        footerLogoUrl="https://cdn.example.com/footer.png"
        websiteUrl={baseTexts.websiteUrl}
        supportEmail={baseTexts.supportEmail}
        unsubscribeUrl="https://www.tonnkama.com/unsubscribe/token"
        socialLinks={{
          facebook: 'https://facebook.com/tonnkama',
          twitter: 'https://x.com/tonnkama',
          instagram: 'https://instagram.com/tonnkama',
          linkedin: 'https://linkedin.com/company/tonnkama',
        }}
      >
        <p>Contenu transactionnel</p>
      </Layout>,
    )

    expect(html).toContain('Contenu transactionnel')
    expect(html).toContain('Facebook')
    expect(html).toContain('Twitter')
    expect(html).toContain('Instagram')
    expect(html).toContain('LinkedIn')
    expect(html).toContain('Se désinscrire de ces emails')
    expect(html).toContain('support@tonnkama.com')
    expect(html).toContain('https://cdn.example.com/header.png')
  })

  it('rend un email de bienvenue avec le compte, les crédits et le démarrage', async () => {
    const html = await renderEmail(
      <WelcomeEmail
        name="Glenn Eriss"
        email="glenn@example.com"
        texts={{
          ...baseTexts,
          welcomeMessage: 'Votre compte immobilier est associé à ',
          descriptionMessage: 'Description de bienvenue',
          featuresTitle: 'Découvrez la plateforme',
          features: ['Rechercher', 'Publier'],
          gettingStartedTitle: 'Bien démarrer',
          gettingStartedSteps: ['Compléter le profil'],
          ctaButtonText: 'Explorer les annonces',
          ctaButtonUrl: 'https://www.tonnkama.com/immobilier',
          supportMessage: 'Nous restons disponibles pour vous aider.',
        }}
      />,
    )

    expect(html).toContain('Bienvenue sur Trouve Ton Nkama, Glenn Eriss')
    expect(html).toContain('glenn@example.com')
    expect(html).toContain('3 crédits')
    expect(html).toContain('Explorer les annonces')
    expect(html).toContain('Bien démarrer')
    expect(html).toContain('Nous restons disponibles pour vous aider.')
  })

  it('rend les emails de vérification et de réinitialisation avec leurs liens sûrs', async () => {
    const verificationLink = 'https://www.tonnkama.com/verify-email?token=verify-9b'
    const verificationHtml = await renderEmail(
      <EmailVerification
        name="Ariane"
        email="ariane@example.com"
        verificationLink={verificationLink}
        texts={{
          ...baseTexts,
          instruction: 'Confirmez votre adresse email.',
          buttonText: 'Vérifier mon email',
          additionalInfo: "Ignorez cet email si vous n'êtes pas à l'origine de la demande.",
          expirationInfo: 'Ce lien expire dans 24 heures.',
        }}
      />,
    )
    expect(verificationHtml).toContain('Vérifier mon email')
    expect(verificationHtml).toContain('verify-9b')
    expect(verificationHtml).toContain('Ce lien expire dans 24 heures.')

    const resetLink = 'https://www.tonnkama.com/password-reset?token=reset-9b'
    const resetHtml = await renderEmail(
      <PasswordReset
        name="Ariane"
        email="ariane@example.com"
        resetLink={resetLink}
        texts={{
          ...baseTexts,
          instruction: 'Une réinitialisation a été demandée.',
          buttonText: 'Choisir un nouveau mot de passe',
          additionalInfo: "Aucune action n'est requise si vous n'avez rien demandé.",
          expirationInfo: 'Le lien expire dans une heure.',
          securityInfo: 'Ce lien est personnel et ne doit pas être partagé.',
        }}
      />,
    )
    expect(resetHtml).toContain('Choisir un nouveau mot de passe')
    expect(resetHtml).toContain('reset-9b')
    expect(resetHtml).toContain('Le lien expire dans une heure.')
    expect(resetHtml).toContain('Ce lien est personnel')
  })

  it('rend la publication complète et masque correctement les détails absents', async () => {
    const texts = {
      ...baseTexts,
      congratulationsTitle: 'Votre annonce est publiée',
      publishedMessage: 'Elle est maintenant visible par les chercheurs.',
      propertyDetails: "Détails de l'annonce",
      managementTitle: 'Gérez votre annonce',
      managementOptions: ['Modifier le prix', 'Archiver le bien'],
      viewButtonText: "Voir l'annonce",
      editButtonText: "Modifier l'annonce",
      shareButtonText: "Partager l'annonce",
      tipsTitle: 'Conseils de visibilité',
      tips: ['Ajoutez de belles photos', 'Répondez rapidement'],
    }
    const completeHtml = await renderEmail(
      <PropertyPublished
        name="Jean"
        email="jean@example.com"
        property={{
          id: 'property-email-9b',
          title: 'Belle villa à Akanda',
          price: 125000000,
          location: 'Angondjé, Akanda',
          type: 'Villa',
          area: 320,
          imageUrl: 'https://cdn.example.com/villa.jpg',
          publishedAt: '2026-07-20T08:00:00.000Z',
          expiresAt: '2026-10-20T08:00:00.000Z',
        }}
        texts={texts}
      />,
    )
    expect(completeHtml).toContain('Votre annonce est publiée')
    expect(completeHtml).toContain('Belle villa à Akanda')
    expect(completeHtml).toContain('320 m²')
    expect(completeHtml).toContain('https://cdn.example.com/villa.jpg')
    expect(completeHtml).toContain('property-email-9b?share=true')
    expect(completeHtml).toContain('Modifier le prix')
    expect(completeHtml).toContain('Répondez rapidement')

    const minimalHtml = await renderEmail(
      <PropertyPublished
        name="Jean"
        email="jean@example.com"
        property={{
          id: 'property-minimal-9b',
          title: 'Terrain à Ntoum',
          price: 8000000,
          location: 'Ntoum',
          type: 'Terrain',
          publishedAt: '2026-07-20T08:00:00.000Z',
          expiresAt: '2026-10-20T08:00:00.000Z',
        }}
        texts={texts}
      />,
    )
    expect(minimalHtml).toContain('Terrain à Ntoum')
    expect(minimalHtml).not.toContain('320 m²')
    expect(minimalHtml).not.toContain('villa.jpg')
  })

  it('rend le gabarit générique et ses informations de sécurité', async () => {
    const html = await renderEmail(
      <GenericEmail
        name="Mélanie"
        email="melanie@example.com"
        actionLink="https://www.tonnkama.com/action/token-9b"
        texts={{
          ...baseTexts,
          title: 'Information importante',
          subtitle: 'Compte utilisateur',
          mainMessage: 'Une action est disponible sur votre compte.',
          buttonText: 'Continuer',
          footerMessage: 'Merci',
          additionalInfo: 'Cette notification est automatique.',
        }}
      />,
    )

    expect(html).toContain('Bonjour Mélanie')
    expect(html).toContain('Une action est disponible sur votre compte.')
    expect(html).toContain('Continuer')
    expect(html).toContain('Cette notification est automatique.')
    expect(html).toContain('Conseils de sécurité')
  })
})
