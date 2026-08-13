import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CheckIcon,
  XCircle,
  ChevronDown,
  XIcon,
  WandSparkles,
  ChevronUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@trouve-ton-nkama/ui/separator";
import { Button } from "@trouve-ton-nkama/ui/button";
import { Badge } from "@trouve-ton-nkama/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@trouve-ton-nkama/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@trouve-ton-nkama/ui/command";

const multiSelectVariants = cva(
  "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300",
  {
    variants: {
      variant: {
        default:
          "border-foreground/10 text-foreground bg-card hover:bg-card/80",
        secondary:
          "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        inverted: "inverted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface MultiSelectProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  onValueChange: (value: string[]) => void;
  defaultValue?: string[];
  value?: string[];
  placeholder?: string;
  animation?: number;
  maxCount?: number;
  modalPopover?: boolean;
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
}

export const MultiSelect = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>(
  (
    {
      options,
      onValueChange,
      variant,
      defaultValue = [],
      value,
      placeholder = "Select options",
      animation = 0,
      maxCount = 3,
      modalPopover = false,
      asChild = false,
      className,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] =
      React.useState<string[]>(value || defaultValue);
    const [isOpen, setIsOpen] = React.useState(false);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const [search, setSearch] = React.useState("");

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValues(value);
      } else {
        setSelectedValues([]);
      }
    }, [value]);

    const filteredOptions = React.useMemo(() =>
      search.trim()
        ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
        : options,
      [options, search]
    );

    const toggleOption = (option: string) => {
      if (disabled) return;
      const next = selectedValues.includes(option)
        ? selectedValues.filter((v) => v !== option)
        : [...selectedValues, option];
      setSelectedValues(next);
      onValueChange(next);
    };

    const handleClear = () => {
      if (disabled) return;
      setSelectedValues([]);
      onValueChange([]);
    };

    const clearExtraOptions = () => {
      if (disabled) return;
      const next = selectedValues.slice(0, maxCount);
      setSelectedValues(next);
      onValueChange(next);
    };

    const toggleAll = () => {
      if (disabled) return;
      if (selectedValues.length === options.length) {
        handleClear();
      } else {
        const all = options.map((o) => o.value);
        setSelectedValues(all);
        onValueChange(all);
      }
    };

    // ── Trigger button (shared between both modes) ──────────────────────────
    const triggerContent = (
      <>
        {selectedValues.length > 0 ? (
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-wrap items-center">
              {selectedValues.slice(0, maxCount).map((v) => {
                const option = options.find((o) => o.value === v);
                const IconComponent = option?.icon;
                return (
                  <Badge
                    key={v}
                    className={cn(
                      isAnimating ? "animate-bounce" : "",
                      multiSelectVariants({ variant })
                    )}
                    style={{ animationDuration: `${animation}s` }}
                  >
                    {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                    {option?.label}
                    <XCircle
                      className="ml-2 h-4 w-4 cursor-pointer"
                      onClick={(e) => {
                        if (disabled) return;
                        e.stopPropagation();
                        toggleOption(v);
                      }}
                    />
                  </Badge>
                );
              })}
              {selectedValues.length > maxCount && (
                <Badge
                  className={cn(
                    "bg-transparent text-foreground border-foreground/1 hover:bg-transparent",
                    isAnimating ? "animate-bounce" : "",
                    multiSelectVariants({ variant })
                  )}
                  style={{ animationDuration: `${animation}s` }}
                >
                  {`+ ${selectedValues.length - maxCount} more`}
                  <XCircle
                    className="ml-2 h-4 w-4 cursor-pointer"
                    onClick={(e) => {
                      if (disabled) return;
                      e.stopPropagation();
                      clearExtraOptions();
                    }}
                  />
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <XIcon
                className="h-4 mx-2 cursor-pointer text-muted-foreground"
                onClick={(e) => {
                  if (disabled) return;
                  e.stopPropagation();
                  handleClear();
                }}
              />
              <Separator orientation="vertical" className="flex min-h-6 h-full" />
              {isOpen
                ? <ChevronUp className="h-4 mx-2 cursor-pointer text-muted-foreground" />
                : <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
              }
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full mx-auto">
            <span className="text-sm text-muted-foreground mx-3">{placeholder}</span>
            {isOpen
              ? <ChevronUp className="h-4 cursor-pointer text-muted-foreground mx-2" />
              : <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2" />
            }
          </div>
        )}
      </>
    );

    // ── Option list (shared between both modes) ─────────────────────────────
    const optionList = (
      <>
        <div className="flex items-center border-b px-3">
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto overscroll-contain max-h-[40vh]"
          onTouchMove={(e) => e.stopPropagation()}
        >
          {filteredOptions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun résultat.</p>
          )}
          {filteredOptions.length > 0 && (
            <div className="p-1">
              {/* Tout sélectionner */}
              <div
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                onClick={toggleAll}
              >
                <div className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  selectedValues.length === options.length
                    ? "bg-primary text-primary-foreground"
                    : "opacity-50"
                )}>
                  {selectedValues.length === options.length && <CheckIcon className="h-4 w-4" />}
                </div>
                <span>(Tout sélectionner)</span>
              </div>
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent"
                    onClick={() => toggleOption(option.value)}
                  >
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-primary shrink-0",
                      isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                    )}>
                      {isSelected && <CheckIcon className="h-4 w-4" />}
                    </div>
                    {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                    <span>{option.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t p-1">
          <div className="flex items-center">
            {selectedValues.length > 0 && (
              <>
                <div
                  className="flex-1 text-center text-sm py-1.5 cursor-pointer rounded-sm hover:bg-accent"
                  onClick={handleClear}
                >
                  Effacer
                </div>
                <Separator orientation="vertical" className="flex min-h-6 h-full" />
              </>
            )}
            <div
              className="flex-1 text-center text-sm py-1.5 cursor-pointer rounded-sm hover:bg-accent"
              onClick={() => { setIsOpen(false); setSearch(""); }}
            >
              Fermer
            </div>
          </div>
        </div>
      </>
    );

    // ── Mode inline (modalPopover=true) : pas de portal, pas de Popover ─────
    if (modalPopover) {
      return (
        <div className="relative w-full">
          <Button
            ref={ref}
            type="button"
            onClick={() => { if (!disabled) setIsOpen((v) => !v); }}
            disabled={disabled}
            className={cn(
              "flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit [&_svg]:pointer-events-auto",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            {triggerContent}
          </Button>

          {isOpen && (
            <div className="relative z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
              {optionList}
            </div>
          )}

          {animation > 0 && selectedValues.length > 0 && (
            <WandSparkles
              className={cn(
                "cursor-pointer my-2 text-foreground bg-background w-3 h-3",
                isAnimating ? "" : "text-muted-foreground"
              )}
              onClick={() => setIsAnimating(!isAnimating)}
            />
          )}
        </div>
      );
    }

    // ── Mode Popover (défaut, desktop) ──────────────────────────────────────
    return (
      <Popover
        open={disabled ? false : isOpen}
        onOpenChange={disabled ? undefined : setIsOpen}
      >
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            {...props}
            onClick={() => { if (!disabled) setIsOpen((v) => !v); }}
            disabled={disabled}
            className={cn(
              "flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit [&_svg]:pointer-events-auto",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            {triggerContent}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0"
          align="start"
          onEscapeKeyDown={() => setIsOpen(false)}
        >
          <Command>
            <CommandInput placeholder="Rechercher..." />
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty>Aucun résultat.</CommandEmpty>
              <CommandGroup>
                <CommandItem key="all" onSelect={toggleAll} className="cursor-pointer">
                  <div className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    selectedValues.length === options.length
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible"
                  )}>
                    <CheckIcon className="h-4 w-4" />
                  </div>
                  <span>(Tout sélectionner)</span>
                </CommandItem>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => toggleOption(option.value)}
                      className="cursor-pointer"
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                      )}>
                        <CheckIcon className="h-4 w-4" />
                      </div>
                      {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                      <span>{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <div className="flex items-center justify-between">
                  {selectedValues.length > 0 && (
                    <>
                      <CommandItem onSelect={handleClear} className="flex-1 justify-center cursor-pointer">
                        Effacer
                      </CommandItem>
                      <Separator orientation="vertical" className="flex min-h-6 h-full" />
                    </>
                  )}
                  <CommandItem
                    onSelect={() => setIsOpen(false)}
                    className="flex-1 justify-center cursor-pointer max-w-full"
                  >
                    Fermer
                  </CommandItem>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>

        {animation > 0 && selectedValues.length > 0 && (
          <WandSparkles
            className={cn(
              "cursor-pointer my-2 text-foreground bg-background w-3 h-3",
              isAnimating ? "" : "text-muted-foreground"
            )}
            onClick={() => setIsAnimating(!isAnimating)}
          />
        )}
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
