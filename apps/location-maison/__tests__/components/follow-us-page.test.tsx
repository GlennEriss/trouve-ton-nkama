import React from 'react'
import { render, screen } from '@testing-library/react'

import FollowUsPage, { metadata } from '@/app/(public)/suivez-nous/page'
import { PLATFORM_SOCIAL_LINKS } from '@/constantes/social-links'

describe('FollowUsPage (/suivez-nous)', () => {
  it("lie vers chacun des reseaux officiels de la plateforme, dans un nouvel onglet", () => {
    render(<FollowUsPage />)

    for (const { label, url } of PLATFORM_SOCIAL_LINKS) {
      const link = screen.getByRole('link', { name: new RegExp(label) })
      expect(link).toHaveAttribute('href', url)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it("n'est pas indexee (page liee depuis une notification, pas un contenu SEO)", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
