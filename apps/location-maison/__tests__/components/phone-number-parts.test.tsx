import { fireEvent, render, screen } from '@testing-library/react'
import { PhoneNumberParts } from '@/components/shared/form/PhoneNumberFormAppSimple'

describe('PhoneNumberParts', () => {
  it('affiche separement l indicatif gabonais et le numero national', () => {
    render(<PhoneNumberParts value="+24166545430" onChange={jest.fn()} />)

    expect(screen.getByText('+241')).toBeInTheDocument()
    expect(screen.getByLabelText('Numéro de téléphone national')).toHaveValue('66545430')
    expect(screen.getByLabelText('Indicatif téléphonique')).toBeInTheDocument()
  })

  it('retire le zero national avant de former le numero global', () => {
    const onChange = jest.fn()
    render(<PhoneNumberParts value="" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Numéro de téléphone national'), {
      target: { value: '066545430' },
    })

    expect(onChange).toHaveBeenLastCalledWith('+24166545430')
  })

  it('accepte un numero sans zero et retire un indicatif colle par erreur', () => {
    const onChange = jest.fn()
    const { rerender } = render(<PhoneNumberParts value="" onChange={onChange} />)
    const input = screen.getByLabelText('Numéro de téléphone national')

    fireEvent.change(input, { target: { value: '66545430' } })
    expect(onChange).toHaveBeenLastCalledWith('+24166545430')

    rerender(<PhoneNumberParts value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Numéro de téléphone national'), {
      target: { value: '241066545430' },
    })
    expect(onChange).toHaveBeenLastCalledWith('+24166545430')
  })

  it('limite la partie nationale a la longueur gabonaise attendue', () => {
    const onChange = jest.fn()
    render(<PhoneNumberParts value="" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Numéro de téléphone national'), {
      target: { value: '0665454309999' },
    })

    expect(onChange).toHaveBeenLastCalledWith('+24166545430')
  })

  it('vide la valeur globale lorsque le champ national est efface', () => {
    const onChange = jest.fn()
    render(<PhoneNumberParts value="+24166545430" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Numéro de téléphone national'), {
      target: { value: '' },
    })

    expect(onChange).toHaveBeenCalledWith('')
  })
})
