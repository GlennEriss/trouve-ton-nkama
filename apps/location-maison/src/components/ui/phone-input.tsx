import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import PhoneNumberInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getEnabledCountries, isCountryEnabled } from "@/lib/phoneValidation";

export type PhoneInputProps = Omit<
    React.ComponentProps<"input">,
    "onChange" | "value" | "ref"
> &
    Omit<RPNInput.Props<typeof PhoneNumberInput>, "onChange"> & {
        onChange?: (value: RPNInput.Value) => void;
        triggerClassName?: string;
    };

type CountrySelectWrapperProps = {
    triggerClassName?: string;
} & React.ComponentProps<typeof CountrySelect>;

const CountrySelectWrapper: React.FC<CountrySelectWrapperProps> = ({ triggerClassName, ...props }) => (
    <CountrySelect {...props} triggerClassName={triggerClassName} />
);

const createCountrySelectComponent = (triggerClassName?: string) => (selectProps: any) => (
    <CountrySelectWrapper {...selectProps} triggerClassName={triggerClassName} />
);

const PhoneInput: React.ForwardRefExoticComponent<PhoneInputProps> =
    React.forwardRef<React.ElementRef<typeof PhoneNumberInput>, PhoneInputProps>(
        ({ className, onChange, triggerClassName, ...props }, ref) => {
            const countrySelectComponent = React.useMemo(
                () => createCountrySelectComponent(triggerClassName),
                [triggerClassName]
            );

            // Filtrer les pays selon ceux qui sont activés
            const enabledCountries = getEnabledCountries();
            const allowedCountries = enabledCountries.map(country => country.code as RPNInput.Country);

            return (
                <PhoneNumberInput
                    ref={ref}
                    className={cn("flex", className)}
                    flagComponent={FlagComponent}
                    countrySelectComponent={countrySelectComponent}
                    inputComponent={InputComponent}
                    smartCaret={false}
                    countries={allowedCountries}
                    /**
                     * Handles the onChange event.
                     *
                     * react-phone-number-input might trigger the onChange event as undefined
                     * when a valid phone number is not entered. To prevent this,
                     * the value is coerced to an empty string.
                     *
                     * @param {E164Number | undefined} value - The entered value
                     */
                    onChange={(value) => onChange?.(value ?? ("" as RPNInput.Value))}
                    {...props}
                />
            );
        },
    );
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
    HTMLInputElement,
    React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
    <Input
        className={cn("min-h-11 border-none focus-visible:ring-0 shadow-none", className)}
        {...props}
        ref={ref}
    />
));
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
    disabled?: boolean;
    value: RPNInput.Country;
    options: CountryEntry[];
    onChange: (country: RPNInput.Country) => void;
    triggerClassName?: string;
};

const CountrySelect = ({
    disabled,
    value: selectedCountry,
    options: countryList,
    onChange,
    triggerClassName,
}: CountrySelectProps) => {
    // Filtrer les options selon les pays activés
    const enabledCountries = getEnabledCountries();
    const filteredOptions = countryList.filter(({ value }) => 
        value && isCountryEnabled(value)
    );

    return (
        <Popover>
            <PopoverTrigger asChild className={triggerClassName}>
                <Button
                    type="button"
                    variant="outline"
                    className="flex gap-1 border-none bg-transparent px-3 focus:z-10 rounded-full shadow-none"
                    disabled={disabled}
                >
                    <FlagComponent
                        country={selectedCountry}
                        countryName={selectedCountry}
                    />
                    <ChevronsUpDown
                        className={cn(
                            "-mr-2 size-4 opacity-50",
                            disabled ? "hidden" : "opacity-100",
                        )}
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                        <ScrollArea className="h-72">
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                                {filteredOptions.map(({ value, label }) =>
                                    value ? (
                                        <CountrySelectOption
                                            key={value}
                                            country={value}
                                            countryName={label}
                                            selectedCountry={selectedCountry}
                                            onChange={onChange}
                                        />
                                    ) : null,
                                )}
                            </CommandGroup>
                        </ScrollArea>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
    selectedCountry: RPNInput.Country;
    onChange: (country: RPNInput.Country) => void;
}

const CountrySelectOption = ({
    country,
    countryName,
    selectedCountry,
    onChange,
}: CountrySelectOptionProps) => {
    return (
        <CommandItem className="gap-2" onSelect={() => onChange(country)}>
            <FlagComponent country={country} countryName={countryName} />
            <span className="flex-1 text-sm">{countryName}</span>
            <span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
            <CheckIcon
                className={`ml-auto size-4 ${country === selectedCountry ? "opacity-100" : "opacity-0"}`}
            />
        </CommandItem>
    );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
    const Flag = flags[country];

    return (
        <span className="flex h-3 overflow-hidden rounded-sm bg-foreground/20 items-center">
            {Flag && <Flag title={countryName} />}
        </span>
    );
};

export { PhoneInput };
