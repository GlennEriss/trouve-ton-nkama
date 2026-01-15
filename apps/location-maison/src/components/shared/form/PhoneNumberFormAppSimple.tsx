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

export const PhoneNumberFormAppSimple = <T extends FieldValues>({
    control,
    name,
    label = "Numéro de téléphone",
    placeholder = "06 12 34 56 78",
    disabled = false
}: PhoneNumberFormAppSimpleProps<T>) => {
    const enabledCountries = getEnabledCountries();
    const defaultCountry = enabledCountries.length > 0 ? enabledCountries[0] : null;

    return (
        <FormField
            control={control}
            name={name}
            render={({ field, formState: { isSubmitting } }) => {
                // Parser la valeur actuelle pour extraire le code pays et le numéro
                const currentValue: string = field.value || '';
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
                            break;
                        }
                    }
                    // Si pas de code pays trouvé, supposer que c'est juste le numéro
                    if (!phoneNumber && currentValue && !currentValue.startsWith('+')) {
                        phoneNumber = currentValue.replace(/[^\d]/g, '');
                    }
                }

                const handleCountryChange = (newCountryCode: string) => {
                    const country = enabledCountries.find(c => c.code === newCountryCode);
                    if (country) {
                        const cleaned = phoneNumber.replace(/[^\d]/g, '');
                        if (cleaned) {
                            const countryKey = country.code as keyof typeof SUPPORTED_COUNTRIES;
                            const fullNumber = `+${SUPPORTED_COUNTRIES[countryKey].countryCode.replace('+', '')}${cleaned}`;
                            field.onChange(fullNumber);
                        } else {
                            field.onChange('');
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
                        
                        // Limiter à 9 chiffres maximum pour le numéro local
                        if (cleaned.length > 9) {
                            cleaned = cleaned.substring(0, 9);
                        }
                        
                        // Toujours mettre à jour le champ, même si le numéro n'est pas encore complet
                        // Cela permet à l'utilisateur de voir ce qu'il tape en temps réel
                        if (cleaned.length > 0) {
                            const fullNumber = `+${countryCodeDigits}${cleaned}`;
                            field.onChange(fullNumber);
                        } else {
                            field.onChange('');
                        }
                    } else if (!cleaned) {
                        field.onChange('');
                    }
                };

                return (
                    <FormItem>
                        <FormLabel className="text-md">{label}</FormLabel>
                        <div className='flex gap-2 w-full'>
                            {/* Select pour le code pays */}
                            <FormControl>
                                <Select
                                    value={countryCode}
                                    onValueChange={handleCountryChange}
                                    disabled={isSubmitting || disabled}
                                >
                                    <SelectTrigger className="w-[140px] h-auto min-h-[48px] py-2 px-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-full focus:border-[#1FA89B] focus:bg-[#ebf6f5] dark:focus:bg-gray-800 [&>span]:flex [&>span]:items-center">
                                        <SelectValue>
                                            {enabledCountries.find(c => c.code === countryCode) && (
                                                <span className="flex items-center gap-1">
                                                    <span>{SUPPORTED_COUNTRIES[countryCode as keyof typeof SUPPORTED_COUNTRIES]?.countryCode || '+241'}</span>
                                                </span>
                                            )}
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
                            </FormControl>

                            {/* Input pour le numéro de téléphone */}
                            <FormControl className="flex-1">
                                <div className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center group transition-colors focus-within:border-[#1FA89B] focus-within:bg-[#ebf6f5] dark:focus-within:bg-gray-800 py-2 px-4">
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
                                        disabled={isSubmitting || disabled}
                                        className="w-full border-none shadow-none focus-visible:ring-0 placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500 bg-transparent flex-1 h-auto"
                                        inputMode="numeric"
                                    />
                                </div>
                            </FormControl>
                        </div>
                        <FormMessage />
                        <PhoneValidationMessage phoneNumber={field.value} />
                    </FormItem>
                );
            }}
        />
    )
}
