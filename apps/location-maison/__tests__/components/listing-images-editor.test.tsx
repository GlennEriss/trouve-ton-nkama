import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ListingImagesEditor from '@/components/preview-property/ListingImagesEditor'
import { uploadPropertyImages } from '@/db/file.db'
import type { Image } from '@/models/annonce'

jest.mock('@/db/file.db', () => ({ uploadPropertyImages: jest.fn() }))

const uploadPropertyImagesMock = jest.mocked(uploadPropertyImages)

const existingImages: Image[] = [
  { filePATH: 'property/one.jpg', fileURL: 'https://images.test/one.jpg' },
  { filePATH: 'property/two.jpg', fileURL: 'https://images.test/two.jpg' },
]

describe.each(['Immobilier', 'Mode'])('modification des photos — annonce %s', () => {
  beforeEach(() => jest.clearAllMocks())

  it('ajoute une photo uploadée et sauvegarde la liste complète', async () => {
    const uploaded: Image = { filePATH: 'property/new.jpg', fileURL: 'https://images.test/new.jpg' }
    uploadPropertyImagesMock.mockResolvedValue([uploaded])
    const onSave = jest.fn().mockResolvedValue(true)
    render(<ListingImagesEditor images={existingImages} ownerId="owner-1" onSave={onSave} />)

    const file = new File(['photo'], 'new.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Choisir des photos à ajouter'), { target: { files: [file] } })

    await waitFor(() => expect(uploadPropertyImagesMock).toHaveBeenCalledWith([file], 'owner-1', 'property/owner-1'))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([...existingImages, uploaded]))
  })

  it('demande confirmation puis supprime uniquement la photo choisie', async () => {
    const onSave = jest.fn().mockResolvedValue(true)
    render(<ListingImagesEditor images={existingImages} ownerId="owner-1" onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la photo 1' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Supprimer cette photo ?')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la photo' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith([existingImages[1]]))
  })

  it('annule la suppression sans modifier les photos', () => {
    const onSave = jest.fn().mockResolvedValue(true)
    render(<ListingImagesEditor images={existingImages} ownerId="owner-1" onSave={onSave} />)

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la photo 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

it('refuse de supprimer la dernière photo obligatoire', async () => {
  const onSave = jest.fn().mockResolvedValue(true)
  render(<ListingImagesEditor images={[existingImages[0]]} ownerId="owner-1" onSave={onSave} />)

  fireEvent.click(screen.getByRole('button', { name: 'Supprimer la photo 1' }))
  fireEvent.click(screen.getByRole('button', { name: 'Supprimer la photo' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('au moins une photo')
  expect(onSave).not.toHaveBeenCalled()
})
