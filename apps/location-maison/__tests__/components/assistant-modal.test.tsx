import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import AssistantModal from '@/components/ai-assistant/AssistantModal'

const compressionMock = jest.fn()
let mockWidth = 390
let mockUser: any = { uid: 'user-1' }

jest.mock('browser-image-compression', () => ({ __esModule: true, default: (...args: any[]) => compressionMock(...args) }))
jest.mock('@/hooks/useSize', () => ({ useWindowSize: () => ({ width: mockWidth }) }))
jest.mock('@/hooks/use-current-user', () => ({ useCurrentUser: () => ({ user: mockUser }) }))
jest.mock('@/lib/logger', () => {
  const error = jest.fn()
  return { createLogger: () => ({ error }), __error: error }
})
jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: new Proxy({}, { get: (_target, tag: string) => ({ children, whileHover: _h, whileTap: _t, initial: _i, animate: _a, exit: _e, transition: _tr, ...props }: any) => React.createElement(tag, props, children) }),
}))

describe('AssistantModal', () => {
  const onClose = jest.fn()
  const onGenerate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockWidth = 390
    mockUser = { uid: 'user-1' }
    onGenerate.mockResolvedValue(undefined)
    compressionMock.mockImplementation(async (file: File) => new Blob(['compressed'], { type: file.type }))
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: jest.fn(() => 'blob:image-1') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() })
  })

  const renderModal = (props: Record<string, any> = {}) => render(
    <AssistantModal isOpen onClose={onClose} onGenerate={onGenerate} requiredFields={['title']} {...props} />
  )

  it('ne rend rien quand il est fermé', () => {
    render(<AssistantModal isOpen={false} onClose={onClose} onGenerate={onGenerate} requiredFields={[]} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('génère à partir d’une description normalisée puis nettoie le formulaire', async () => {
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('Décrivez votre logement...'), { target: { value: '  Studio à Akébé  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(onGenerate).toHaveBeenCalledWith('Studio à Akébé', []))
    expect(onClose).toHaveBeenCalled()
    expect(screen.getByPlaceholderText('Décrivez votre logement...')).toHaveValue('')
  })

  it('bloque la génération dans chaque état invalide', () => {
    const { rerender } = renderModal({ canGenerate: false })
    const textarea = screen.getByPlaceholderText('Décrivez votre logement...')
    fireEvent.change(textarea, { target: { value: 'Maison' } })
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
    rerender(<AssistantModal isOpen onClose={onClose} onGenerate={onGenerate} requiredFields={[]} isLoading />)
    expect(screen.getByRole('button', { name: 'Génération...' })).toBeDisabled()
  })

  it('conserve le formulaire et journalise un échec de génération', async () => {
    onGenerate.mockRejectedValueOnce(new Error('Gemini indisponible'))
    renderModal()
    fireEvent.change(screen.getByPlaceholderText('Décrivez votre logement...'), { target: { value: 'Terrain' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(jest.requireMock('@/lib/logger').__error).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('Décrivez votre logement...')).toHaveValue('Terrain')
  })

  it('compresse, prévisualise, retire et transmet les images', async () => {
    const { container } = renderModal()
    const input = container.querySelector('input[type="file"]')!
    const image = new File(['large image'], 'salon.jpg', { type: 'image/jpeg' })
    await act(async () => fireEvent.change(input, { target: { files: [image] } }))
    expect(await screen.findByRole('button', { name: 'Aperçu image 1' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Aperçu image 1' }))
    expect(screen.getByAltText('Aperçu plein écran')).toBeVisible()
    fireEvent.click(screen.getByAltText('Aperçu plein écran').parentElement!)
    expect(screen.queryByAltText('Aperçu plein écran')).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Décrivez votre logement...'), { target: { value: 'Avec photo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(onGenerate).toHaveBeenCalledWith('Avec photo', [expect.any(File)]))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:image-1')
  })

  it('retire une image et révoque son URL', async () => {
    const { container } = renderModal()
    await act(async () => fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File(['x'], 'piece.webp', { type: 'image/webp' })] },
    }))
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer image 1' }))
    expect(screen.queryByRole('button', { name: 'Aperçu image 1' })).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('ignore un fichier encore trop lourd et absorbe une erreur de compression', async () => {
    compressionMock.mockResolvedValueOnce(new Blob([new Uint8Array(400 * 1024)], { type: 'image/jpeg' }))
    const { container } = renderModal()
    await act(async () => fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'large.jpg')] } }))
    expect(screen.queryByRole('button', { name: 'Aperçu image 1' })).not.toBeInTheDocument()

    compressionMock.mockRejectedValueOnce(new Error('compression'))
    await act(async () => fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'bad.jpg')] } }))
    expect(jest.requireMock('@/lib/logger').__error).toHaveBeenCalledWith(expect.stringContaining('préparer les images'), expect.anything())
  })

  it('ferme manuellement et adapte sa position au desktop sans utilisateur', () => {
    mockWidth = 1200
    mockUser = null
    renderModal()
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onClose).toHaveBeenCalled()
  })
})
