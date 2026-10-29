import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useFormContext } from 'react-hook-form';
import QuickListingForm from '@/components/quick-listings/QuickListingForm';
import { quickListingDraftSchema } from '@/features/quick-listings/draft';

jest.mock('@/hooks/useOSMLocations', () => ({ useOSMLocations: () => ({
  isLoading: false, error: null,
  getAllProvinces: () => [{ name: 'Estuaire' }],
  getCitiesByProvince: () => [{ name: 'Libreville' }],
  getQuartersByCity: () => [{ name: 'Nzeng-Ayong' }],
}) }));
function MockField({ name }: { name: string }) {
  const { register } = useFormContext();
  return <input aria-label={name} {...register(name)} />;
}
jest.mock('@/components/location/combobox/ProvinceCombobox', () => ({ ProvinceCombobox: () => <MockField name="address.province" /> }));
jest.mock('@/components/location/combobox/CityCombobox', () => ({ CityCombobox: () => <MockField name="address.city" /> }));
jest.mock('@/components/location/combobox/QuarterCombobox', () => ({ QuarterCombobox: () => <MockField name="address.district" /> }));
jest.mock('@/components/shared/form/PhoneNumberFormAppSimple', () => ({ PhoneNumberFormAppSimple: () => <MockField name="contactPhone" /> }));

const valid = { description: 'Studio à louer 100 000 FCFA', address: { province: 'Estuaire', city: 'Libreville', district: 'Nzeng-Ayong' }, contactPhone: '066123456' };
describe('Annonce rapide — saisie locale', () => {
  it('normalise le téléphone sans changer le tarif ni publier', () => {
    expect(quickListingDraftSchema.parse(valid).contactPhone).toBe('+24166123456');
  });
  it.each([
    { ...valid, description: 'court' },
    { ...valid, description: 'a'.repeat(3001) },
    { ...valid, contactPhone: '123' },
    { ...valid, address: { ...valid.address, district: '' } },
  ])('refuse une saisie invalide %#', value => {
    expect(quickListingDraftSchema.safeParse(value).success).toBe(false);
  });
  it('bloque la première étape vide', async () => {
    render(<QuickListingForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('au moins 10 caractères');
    expect(screen.queryByLabelText('contactPhone')).not.toBeInTheDocument();
  });
  it('conserve la saisie au retour et vérifie sans prétendre publier', async () => {
    render(<QuickListingForm />);
    fireEvent.change(screen.getByLabelText('Texte de l’annonce'), { target: { value: valid.description } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await screen.findByLabelText('contactPhone');
    for (const [key, value] of Object.entries(valid.address)) fireEvent.change(screen.getByLabelText(`address.${key}`), { target: { value } });
    fireEvent.change(screen.getByLabelText('contactPhone'), { target: { value: valid.contactPhone } });
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByLabelText('Texte de l’annonce')).toHaveValue(valid.description);
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(await screen.findByLabelText('contactPhone')).toHaveValue(valid.contactPhone);
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier mon annonce' }));
    expect(await screen.findByRole('status')).toHaveTextContent('annonce non publiée');
    expect(screen.getByRole('status')).toHaveTextContent('+24166123456');
    fireEvent.change(screen.getByLabelText('address.city'), { target: { value: 'Ville inconnue' } });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier mon annonce' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choisissez une ville de cette province');
  });
});
