import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'
import { getEnabledCountries, SUPPORTED_COUNTRIES } from '@/lib/phoneValidation'
import { PhoneValidationMessage } from '@/components/forms/PhoneValidationMessage'

type PhoneNumberFormAppSimpleProps<T extends FieldValues> = {
    control: Control<T>,
    name: Path<T>,
    label?: string
    placeholder?: string
    disabled?: boolean
}

type PhoneNumberPartsProps = {
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
}

const normalizeLocalPhoneNumber = (localNumber: string, countryCode: string) => {
    if (countryCode === 'GA' && localNumber.startsWith('0')) {
        return localNumber.substring(1);
    }

    return localNumber;
}

export const PhoneNumberParts = ({
    value,
    onChange,
    placeholder = "06 12 34 56 78",
    disabled = false
}: PhoneNumberPartsProps) => {
    const enabledCountries = getEnabledCountries();
    const defaultCountry = enabledCountries.length > 0 ? enabledCountries[0] : null;

    const currentValue: string = value || '';
    let countryCode: string = defaultCountry?.code || 'GA';
    let phoneNumber: string = '';

    if (currentValue) {
        // Chercher le code pays dans la valeur
        for (const country of enabledCountries) {
            const countryKey = country.code as keyof typeof SUPPORTED_COUNTRIES;
            const code = SUPPORTED_COUNTRIES[countryKey].countryCode.replace('+', '');
            if (currentValue.startsWith(`+${code}`)) {
                countryCode = country.code;
                phoneNumber = currentValue.replace(`+${code}`, '').trim();
                // Nettoyer le numéro (enlever les espaces et caractères non numériques)
                phoneNumber = phoneNumber.replace(/[^\d]/g, '');
                phoneNumber = normalizeLocalPhoneNumber(phoneNumber, countryCode);
                break;
            }
        }
        // Si pas de code pays trouvé, supposer que c'est juste le numéro
        if (!phoneNumber && currentValue && !currentValue.startsWith('+')) {
            phoneNumber = currentValue.replace(/[^\d]/g, '');
            phoneNumber = normalizeLocalPhoneNumber(phoneNumber, countryCode);
        }
    }

    const handleCountryChange = (newCountryCode: string) => {
        const country = enabledCountries.find(c => c.code === newCountryCode);
        if (country) {
            const cleaned = normalizeLocalPhoneNumber(phoneNumber.replace(/[^\d]/g, ''), country.code);
            if (cleaned) {
                const countryKey = country.code as keyof typeof SUPPORTED_COUNTRIES;
                const fullNumber = `+${SUPPORTED_COUNTRIES[countryKey].countryCode.replace('+', '')}${cleaned}`;
                onChange(fullNumber);
            } else {
                onChange('');
            }
        }
    };

    const handlePhoneChange = (newPhoneNumber: string) => {
        // Nettoyer le numéro (enlever les espaces, +, et autres caractères non numériques)
        // Ne garder que les chiffres
        let cleaned: string = newPhoneNumber.replace(/[^\d]/g, '');

        // Si l'utilisateur a tapé un code pays (commence par 241), l'enlever
        const country = enabledCountries.find(c => c.code === countryCode);
        if (country) {
            const countryKey = country.code as keyof typeof SUPPORTED_COUNTRIES;
            const countryCodeDigits = SUPPORTED_COUNTRIES[countryKey].countryCode.replace('+', '');
            // Si le numéro commence par le code pays, l'enlever
            if (cleaned.startsWith(countryCodeDigits)) {
                cleaned = cleaned.substring(countryCodeDigits.length);
            }

            cleaned = normalizeLocalPhoneNumber(cleaned, country.code);

            // Limiter à la longueur locale du pays sélectionné.
            const maxLocalLength = SUPPORTED_COUNTRIES[countryKey].length;
            if (cleaned.length > maxLocalLength) {
                cleaned = cleaned.substring(0, maxLocalLength);
            }

            // Toujours mettre à jour le champ, même si le numéro n'est pas encore complet
            // Cela permet à l'utilisateur de voir ce qu'il tape en temps réel
            if (cleaned.length > 0) {
                const fullNumber = `+${countryCodeDigits}${cleaned}`;
                onChange(fullNumber);
            } else {
                onChange('');
            }
        } else if (!cleaned) {
            onChange('');
        }
    };

    const selectedCountry = enabledCountries.find(c => c.code === countryCode);
    const selectedCountryKey = selectedCountry?.code as keyof typeof SUPPORTED_COUNTRIES | undefined;
    const selectedDialCode = selectedCountryKey
        ? SUPPORTED_COUNTRIES[selectedCountryKey].countryCode
        : '+241';

    return (
        <div className='grid grid-cols-[112px_minmax(0,1fr)] gap-2 w-full sm:grid-cols-[128px_minmax(0,1fr)]'>
            {/* Select pour le code pays */}
            <div className="space-y-1">
                <span className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Indicatif
                </span>
                <Select
                    value={countryCode}
                    onValueChange={handleCountryChange}
                    disabled={disabled}
                >
                    <SelectTrigger
                        aria-label="Indicatif téléphonique"
                        className="w-full min-h-[48px] py-2 px-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-full focus:border-secondary focus:bg-primary-50 dark:focus:bg-gray-800 [&>span]:flex [&>span]:items-center"
                    >
                        <SelectValue>
                            <span className="flex items-center gap-1">
                                <span>{selectedDialCode}</span>
                            </span>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {enabledCountries.map((country) => {
                            const countryKey = country.code as keyof typeof SUPPORTED_COUNTRIES;
                            return (
                                <SelectItem key={country.code} value={country.code}>
                                    <span className="flex items-center gap-2">
                                        <span>{country.name}</span>
                                        <span className="text-gray-500">
                                            {SUPPORTED_COUNTRIES[countryKey].countryCode}
                                        </span>
                                    </span>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* Input pour le numéro de téléphone */}
            <div className="space-y-1 min-w-0">
                <span className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Numéro
                </span>
                <div className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center group transition-colors focus-within:border-secondary focus-within:bg-primary-50 dark:focus-within:bg-gray-800 min-h-[48px] py-2 px-4">
                    <Input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onKeyDown={(e) => {
                            // Empêcher la saisie de +, espaces et autres caractères non numériques
                            if (e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.' || e.key === '-') {
                                e.preventDefault();
                            }
                        }}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="min-h-11 w-full border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent flex-1 min-w-0"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        aria-label="Numéro de téléphone national"
                    />
                </div>
            </div>
        </div>
    );
}

export const PhoneNumberFormAppSimple = <T extends FieldValues>({
    control,
    name,
    label = "Numéro de téléphone",
    placeholder = "06 12 34 56 78",
    disabled = false
}: PhoneNumberFormAppSimpleProps<T>) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => {
                return (
                    <FormItem>
                        <FormLabel className="text-md">{label}</FormLabel>
                        <FormControl>
                            <PhoneNumberParts
                                value={field.value}
                                onChange={field.onChange}
                                placeholder={placeholder}
                                disabled={isSubmitting || disabled}
                            />
                        </FormControl>
                        <FormMessage />
                        <PhoneValidationMessage phoneNumber={field.value} />
                    </FormItem>
                );
            }}
        />
    )
}
