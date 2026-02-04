"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface DatePickerProps {
  /** Value as yyyy-MM-dd string (for form compatibility). */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  /** Use dropdown for month/year (good for date of birth). */
  captionLayout?: "buttons" | "dropdown" | "dropdown-buttons";
  /** Min date (yyyy-MM-dd or Date). */
  min?: string | Date;
  /** Max date (yyyy-MM-dd or Date). */
  max?: string | Date;
  /** Display format for the input. */
  displayFormat?: string;
  /** Input class name. */
  className?: string;
  /** Whether the field has an error (for styling). */
  valid?: boolean;
  /** aria-invalid. */
  "aria-invalid"?: boolean;
  /** aria-describedby. */
  "aria-describedby"?: string;
}

const ISO_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "dd MMM yyyy";

function toDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parse(s, ISO_FORMAT, new Date());
  return isValid(d) ? d : undefined;
}

function toIso(d: Date | undefined): string {
  if (!d) return "";
  return format(d, ISO_FORMAT);
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  id,
  disabled,
  captionLayout = "buttons",
  min,
  max,
  displayFormat = DISPLAY_FORMAT,
  className,
  valid,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = toDate(value);
  const minDate = typeof min === "string" ? toDate(min) : min;
  const maxDate = typeof max === "string" ? toDate(max) : max;

  const handleSelect = React.useCallback(
    (d: Date | undefined) => {
      onChange?.(toIso(d));
      setOpen(false);
    },
    [onChange]
  );

  const displayValue = date ? format(date, displayFormat) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal min-h-[44px]",
            !displayValue && "text-neutral-500",
            className
          )}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          captionLayout={captionLayout}
          disabled={disabled}
          fromDate={minDate}
          toDate={maxDate}
          defaultMonth={date ?? (maxDate ?? new Date())}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Date picker that shows a text input (editable) plus calendar popover. Good when users may type or pick. */
export interface DatePickerInputProps extends DatePickerProps {
  /** Optional: allow typing in the input; if false, input is read-only and only calendar picks. */
  allowInput?: boolean;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "Select date",
  id,
  disabled,
  captionLayout = "buttons",
  min,
  max,
  displayFormat = DISPLAY_FORMAT,
  className,
  valid,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
  allowInput = false,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const date = toDate(value);
  const minDate = typeof min === "string" ? toDate(min) : min;
  const maxDate = typeof max === "string" ? toDate(max) : max;

  React.useEffect(() => {
    setInputValue(value ? format(toDate(value)!, displayFormat) : "");
  }, [value, displayFormat]);

  const handleSelect = React.useCallback(
    (d: Date | undefined) => {
      const next = toIso(d);
      onChange?.(next);
      setInputValue(d ? format(d, displayFormat) : "");
      setOpen(false);
    },
    [onChange, displayFormat]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parse(raw, displayFormat, new Date());
    if (isValid(parsed)) onChange?.(toIso(parsed));
  };

  const handleInputBlur = () => {
    if (value) setInputValue(format(toDate(value)!, displayFormat));
    else setInputValue("");
  };

  return (
    <React.Fragment>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative flex w-full">
          <Input
            id={id}
            value={inputValue}
            onChange={allowInput ? handleInputChange : undefined}
            onBlur={allowInput ? handleInputBlur : undefined}
            readOnly={!allowInput}
            placeholder={placeholder}
            disabled={disabled}
            valid={valid}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className={cn("pr-10", className)}
            onFocus={() => setOpen(true)}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute right-0 top-0 h-full px-3 rounded-l-none border-l border-neutral-300"
              aria-label="Open calendar"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            captionLayout={captionLayout}
            fromDate={minDate}
            toDate={maxDate}
            defaultMonth={date ?? maxDate ?? new Date()}
          />
        </PopoverContent>
      </Popover>
    </React.Fragment>
  );
}
