import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import SearchRequestForm from '@/components/search-requests/SearchRequestForm'

const push = jest.fn()
const submitSearchRequest = jest.fn()
const reset = jest.fn()
let paymentState: { phase: string; error: string | null }

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('@/hooks/use-search-request-payment', () => ({
  useSearchRequestPayment: () => ({ ...paymentState, submitSearchRequest, reset }),
}))
jest.mock('@/constantes/property-type', () => ({
  TypeProperty: { Home: 'Maison', Studio: 'Studio' },
  TypePropertyEnum: { Home: 'home', Studio: 'studio' },
}))
jest.mock('@/constantes/gabon-locations', () => ({
  GABON_PROVINCES: [
    { name: 'Estuaire', capital: 'Libreville' },
    { name: 'Ogooué-Maritime', capital: 'Port-Gentil' },
  ],
}))
jest.mock('@trouve-ton-nkama/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => <button {...props}>{children}</button>,
}))
jest.mock('@trouve-ton-nkama/ui/input', () => ({ Input: (props: any) => <input {...props} /> }))
jest.mock('@trouve-ton-nkama/ui/textarea', () => ({ Textarea: (props: any) => <textarea {...props} /> }))
jest.mock('@trouve-ton-nkama/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      aria-label="Booster ma demande"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}))
// Radix Select ne s'ouvre pas sous jsdom : on le remplace par un <select> natif,
// en reprenant l'aria-label porte par SelectTrigger pour rester adressable.
jest.mock('@trouve-ton-nkama/ui/select', () => {
  const ReactLib = require('react')
  return {
    Select: ({ value, onValueChange, children }: any) => {
      let label: string | undefined
      ReactLib.Children.forEach(children, (child: any) => {
        if (child?.props?.['aria-label']) label = child.props['aria-label']
      })
      return (
        <select aria-label={label} value={value} onChange={(e: any) => onValueChange(e.target.value)}>
          <option value="" />
          {children}
        </select>
      )
    },
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
    SelectTrigger: () => null,
    SelectValue: () => null,
  }
})

/** Remplit tous les champs requis pour rendre le formulaire soumettable. */
function fillValidForm() {
  const phones = screen.getAllByPlaceholderText('074 XX XX XX')
  const numbers = document.querySelectorAll('input[type="number"]')

  fireEvent.change(screen.getByLabelText('Type de bien'), { target: { value: 'Home' } })
  fireEvent.change(screen.getByPlaceholderText('Ex: Libreville'), { target: { value: 'Libreville' } })
  fireEvent.change(numbers[0], { target: { value: '100000' } })
  fireEvent.change(numbers[1], { target: { value: '250000' } })
  fireEvent.change(document.querySelector('textarea')!, {
    target: { value: 'Cherche un trois pieces proche du centre.' },
  })
  fireEvent.change(phones[0], { target: { value: '074000000' } })
  fireEvent.change(phones[1], { target: { value: '074000000' } })
}

const submitButton = () => screen.getByRole('button', { name: /Publier ma recherche —/ })

// toLocaleString('fr-FR') separe les milliers par une espace fine insecable
// (U+202F) : on normalise les deux cotes pour comparer le montant affiche.
const normalizeSpaces = (value: string) => value.replace(/\s/g, ' ')
const expectAmountOnButton = (amountXaf: number) =>
  expect(normalizeSpaces(submitButton().textContent ?? '')).toContain(
    normalizeSpaces(`${amountXaf.toLocaleString('fr-FR')} FCFA`),
  )

describe('SearchRequestForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    paymentState = { phase: 'idle', error: null }
  })

  describe('rendu initial', () => {
    it('affiche le formulaire et son tarif de base', () => {
      render(<SearchRequestForm />)
      expect(screen.getByText('Décrivez exactement ce que vous cherchez')).toBeInTheDocument()
      expectAmountOnButton(500)
    })

    it('desactive la soumission tant que le formulaire est vide', () => {
      render(<SearchRequestForm />)
      expect(submitButton()).toBeDisabled()
    })

    it('pre-remplit les champs issus de la recherche precedente', () => {
      render(
        <SearchRequestForm
          prefill={{ typeProperty: 'Home' as never, city: 'Port-Gentil', budgetMinXaf: 50_000, budgetMaxXaf: 90_000 }}
        />,
      )
      expect(screen.getByDisplayValue('Port-Gentil')).toBeInTheDocument()
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument()
      expect(screen.getByDisplayValue('90000')).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('signale un budget minimum superieur au maximum', () => {
      render(<SearchRequestForm />)
      const numbers = document.querySelectorAll('input[type="number"]')
      fireEvent.change(numbers[0], { target: { value: '900000' } })
      fireEvent.change(numbers[1], { target: { value: '100000' } })

      expect(screen.getByText(/Le budget minimum doit être inférieur/)).toBeInTheDocument()
      expect(submitButton()).toBeDisabled()
    })

    it('signale une description trop courte', () => {
      render(<SearchRequestForm />)
      fireEvent.change(document.querySelector('textarea')!, { target: { value: 'court' } })
      expect(screen.getByText(/Description trop courte/)).toBeInTheDocument()
    })

    it('signale un numero de paiement invalide pour le reseau', () => {
      render(<SearchRequestForm />)
      const phones = screen.getAllByPlaceholderText('074 XX XX XX')
      fireEvent.change(phones[1], { target: { value: '012345678' } })
      expect(screen.getByText(/Numéro invalide pour ce réseau/)).toBeInTheDocument()
    })

    it('active la soumission une fois tous les champs requis valides', () => {
      render(<SearchRequestForm />)
      fillValidForm()
      expect(submitButton()).toBeEnabled()
    })
  })

  describe('boost', () => {
    it('ajoute le supplement au montant a payer', () => {
      render(<SearchRequestForm />)
      fireEvent.click(screen.getByLabelText('Booster ma demande'))
      expectAmountOnButton(2000)
    })
  })

  describe('soumission', () => {
    it('envoie la demande nettoyee au hook de paiement', () => {
      render(<SearchRequestForm />)
      fillValidForm()
      fireEvent.click(submitButton())

      expect(submitSearchRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          typeProperty: 'Home',
          transactionType: 'FOR_RENT',
          province: 'Estuaire',
          city: 'Libreville',
          budgetMinXaf: 100000,
          budgetMaxXaf: 250000,
          description: 'Cherche un trois pieces proche du centre.',
          whatsappContact: '074000000',
          payerPhone: '074000000',
          boostRequested: false,
        }),
      )
    })

    it('omet le quartier quand il est laisse vide', () => {
      render(<SearchRequestForm />)
      fillValidForm()
      fireEvent.click(submitButton())

      expect(submitSearchRequest).toHaveBeenCalledWith(
        expect.objectContaining({ neighborhood: undefined }),
      )
    })

    it('ne soumet rien quand le formulaire est incomplet', () => {
      render(<SearchRequestForm />)
      fireEvent.click(submitButton())
      expect(submitSearchRequest).not.toHaveBeenCalled()
    })
  })

  describe('etats du paiement', () => {
    it('invite a confirmer sur le telephone pendant l attente', () => {
      paymentState = { phase: 'waiting_confirmation', error: null }
      render(<SearchRequestForm />)
      expect(screen.getByText('Confirme le paiement sur ton téléphone')).toBeInTheDocument()
    })

    it('confirme l envoi et renvoie vers la liste des demandes', () => {
      paymentState = { phase: 'success', error: null }
      render(<SearchRequestForm />)

      expect(screen.getByText('Demande envoyée, merci !')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Voir les demandes de recherche/ }))
      expect(push).toHaveBeenCalled()
    })

    it('affiche le motif d echec et permet de reessayer', () => {
      paymentState = { phase: 'failed', error: 'Solde insuffisant' }
      render(<SearchRequestForm />)

      expect(screen.getByText('Paiement non abouti')).toBeInTheDocument()
      expect(screen.getByText('Solde insuffisant')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
      expect(reset).toHaveBeenCalled()
    })

    it('traite le delai depasse comme un echec reessayable', () => {
      paymentState = { phase: 'timeout', error: 'Le paiement est toujours en attente.' }
      render(<SearchRequestForm />)
      expect(screen.getByText('Paiement non abouti')).toBeInTheDocument()
    })
  })
})
