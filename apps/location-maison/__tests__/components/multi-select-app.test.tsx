import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { MultiSelect } from '@/components/shared/ui/MultiSelectApp'

jest.mock('lucide-react', () => ({
  CheckIcon: () => <span data-testid="check">check</span>,
  XCircle: (props: any) => <span role="button" aria-label="retirer" data-testid="x-circle" {...props}>x</span>,
  ChevronDown: () => <span data-testid="down">down</span>,
  ChevronUp: () => <span data-testid="up">up</span>,
  XIcon: (props: any) => <span role="button" aria-label="tout effacer" data-testid="x-icon" {...props}>x</span>,
  WandSparkles: (props: any) => <span role="button" aria-label="animer" data-testid="wand" {...props}>wand</span>,
}))

jest.mock('@trouve-ton-nkama/ui/button', () => ({
  Button: React.forwardRef(({ children, ...props }: any, ref: any) => <button ref={ref} {...props}>{children}</button>),
}))

jest.mock('@trouve-ton-nkama/ui/badge', () => ({ Badge: ({ children, ...props }: any) => <span {...props}>{children}</span> }))
jest.mock('@trouve-ton-nkama/ui/separator', () => ({ Separator: () => <span>|</span> }))

jest.mock('@trouve-ton-nkama/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <>{children}</>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@trouve-ton-nkama/ui/command', () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandInput: (props: any) => <input aria-label="recherche desktop" {...props} />,
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: ({ children }: any) => <div>{children}</div>,
  CommandGroup: ({ children }: any) => <div>{children}</div>,
  CommandItem: ({ children, onSelect, ...props }: any) => <button type="button" onClick={onSelect} {...props}>{children}</button>,
  CommandSeparator: () => <hr />,
}))

const HouseIcon = () => <span data-testid="house">house</span>
const options = [
  { label: 'Maison', value: 'home', icon: HouseIcon },
  { label: 'Appartement', value: 'flat' },
  { label: 'Terrain', value: 'land' },
  { label: 'Bureau', value: 'office' },
]

describe('MultiSelect', () => {
  it('filtre, sélectionne et efface des options en mode mobile inline', async () => {
    const onChange = jest.fn()
    render(<MultiSelect options={options} onValueChange={onChange} modalPopover placeholder="Types de bien" />)
    fireEvent.click(screen.getByRole('button', { name: /Types de bien/i }))
    expect(screen.getByTestId('up')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Rechercher...'), { target: { value: 'terr' } })
    expect(screen.getByText('Terrain')).toBeVisible()
    expect(screen.queryByText('Maison')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Terrain'))
    expect(onChange).toHaveBeenLastCalledWith(['land'])

    fireEvent.change(screen.getByPlaceholderText('Rechercher...'), { target: { value: 'inconnu' } })
    expect(screen.getByText('Aucun résultat.')).toBeVisible()
    fireEvent.click(screen.getByText('Effacer'))
    expect(onChange).toHaveBeenLastCalledWith([])
    fireEvent.click(screen.getByText('Fermer'))
    expect(screen.queryByPlaceholderText('Rechercher...')).not.toBeInTheDocument()
  })

  it('sélectionne tout, retire une valeur et limite les badges visibles', () => {
    const onChange = jest.fn()
    render(<MultiSelect options={options} onValueChange={onChange} value={[]} modalPopover maxCount={2} />)
    fireEvent.click(screen.getByRole('button', { name: /Select options/i }))
    fireEvent.click(screen.getByText('(Tout sélectionner)'))
    expect(onChange).toHaveBeenLastCalledWith(['home', 'flat', 'land', 'office'])
    expect(screen.getByText('+ 2 more')).toBeVisible()
    expect(screen.getAllByTestId('house')).toHaveLength(2)

    fireEvent.click(screen.getAllByTestId('x-circle')[0])
    expect(onChange).toHaveBeenLastCalledWith(['flat', 'land', 'office'])
    fireEvent.click(screen.getAllByTestId('x-circle').at(-1)!)
    expect(onChange).toHaveBeenLastCalledWith(['flat', 'land'])
    fireEvent.click(screen.getByTestId('x-icon'))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('synchronise une valeur contrôlée et interdit les actions quand désactivé', async () => {
    const onChange = jest.fn()
    const { rerender } = render(<MultiSelect options={options} onValueChange={onChange} value={['home']} modalPopover />)
    expect(screen.getByText('Maison')).toBeVisible()
    rerender(<MultiSelect options={options} onValueChange={onChange} value={['land']} modalPopover disabled />)
    await waitFor(() => expect(screen.getByText('Terrain')).toBeVisible())
    expect(screen.getByRole('button', { name: /Terrain/i })).toBeDisabled()
    fireEvent.click(screen.getByTestId('x-circle'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('active l animation des badges', () => {
    render(<MultiSelect options={options} onValueChange={jest.fn()} value={['home']} modalPopover animation={2} />)
    expect(screen.getByText('Maison')).not.toHaveClass('animate-bounce')
    fireEvent.click(screen.getByTestId('wand'))
    expect(screen.getByText('Maison')).toHaveClass('animate-bounce')
  })

  it('gère les commandes du mode desktop', () => {
    const onChange = jest.fn()
    render(<MultiSelect options={options} onValueChange={onChange} value={['home']} />)
    fireEvent.click(screen.getByRole('button', { name: /Terrain/i }))
    expect(onChange).toHaveBeenLastCalledWith(['home', 'land'])
    fireEvent.click(screen.getByRole('button', { name: 'Effacer' }))
    expect(onChange).toHaveBeenLastCalledWith([])
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.getByTestId('down')).toBeInTheDocument()
  })
})
