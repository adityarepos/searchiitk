import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { FilterBarProps, BatchYearOption } from "@/types/student";
import { Search, SlidersHorizontal, X, Check, ChevronDown } from "lucide-react";
import { getBatchLabel } from "@/lib/constants";

// Simple multi-select for string arrays
interface StringMultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

function StringMultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: StringMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 text-left bg-background border border-input rounded-md
          flex items-center justify-between gap-2
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          ${isOpen ? "ring-2 ring-ring ring-offset-2" : ""}
          ${selected.length > 0 ? "text-foreground" : "text-muted-foreground"}
        `}
      >
        <span className="truncate text-sm">{displayText}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto animate-fade-in">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No options available
            </div>
          ) : (
            <div className="py-1">
              {options.map((option) => {
                const isSelected = selected.includes(option);

                return (
                  <button
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`
                      w-full px-3 py-2 text-left text-sm flex items-center gap-3
                      transition-colors
                      ${isSelected ? "bg-accent text-accent-foreground" : "text-popover-foreground hover:bg-accent/50"}
                    `}
                  >
                    <div
                      className={`
                      w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                      ${isSelected ? "bg-primary border-primary" : "border-input"}
                    `}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="truncate">{option}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Batch year multi-select
interface BatchYearMultiSelectProps {
  options: BatchYearOption[];
  selected: number[];
  onChange: (selected: number[]) => void;
  placeholder: string;
}

function BatchYearMultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: BatchYearMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value: number) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? getBatchLabel(selected[0])
        : `${selected.length} selected`;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-3 py-2 text-left bg-background border border-input rounded-md
          flex items-center justify-between gap-2
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          ${isOpen ? "ring-2 ring-ring ring-offset-2" : ""}
          ${selected.length > 0 ? "text-foreground" : "text-muted-foreground"}
        `}
      >
        <span className="truncate text-sm">{displayText}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto animate-fade-in">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No options available
            </div>
          ) : (
            <div className="py-1">
              {options.map((option) => {
                const isSelected = selected.includes(option.value);

                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption(option.value)}
                    className={`
                      w-full px-3 py-2 text-left text-sm flex items-center gap-3
                      transition-colors
                      ${isSelected ? "bg-accent text-accent-foreground" : "text-popover-foreground hover:bg-accent/50"}
                    `}
                  >
                    <div
                      className={`
                      w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                      ${isSelected ? "bg-primary border-primary" : "border-input"}
                    `}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FilterTagProps {
  label: string;
  onRemove: () => void;
}

function FilterTag({ label, onRemove }: FilterTagProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground text-sm rounded-md">
      <span className="truncate max-w-[150px]">{label}</span>
      <button
        onClick={onRemove}
        className="w-4 h-4 rounded hover:bg-secondary-foreground/20 flex items-center justify-center transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

const FilterBar = ({
  searchQuery,
  onSearchChange,
  batchYears,
  selectedBatchYears,
  onBatchYearsChange,
  departments,
  selectedDepartments,
  onDepartmentsChange,
  programs,
  selectedPrograms,
  onProgramsChange,
  halls,
  selectedHalls,
  onHallsChange,
  genders,
  selectedGenders,
  onGendersChange,
  bloodGroups,
  selectedBloodGroups,
  onBloodGroupsChange,
  states,
  selectedStates,
  onStatesChange,
  hasActiveFilters,
  onClearFilters,
  showFilters,
  onToggleFilters,
}: FilterBarProps) => {
  const activeFilterCount =
    (selectedBatchYears.length > 0 ? 1 : 0) +
    (selectedDepartments.length > 0 ? 1 : 0) +
    (selectedPrograms.length > 0 ? 1 : 0) +
    (selectedHalls.length > 0 ? 1 : 0) +
    (selectedGenders.length > 0 ? 1 : 0) +
    (selectedBloodGroups.length > 0 ? 1 : 0) +
    (selectedStates.length > 0 ? 1 : 0);

  return (
    <div className="mb-3 space-y-4">
      {/* Search bar and toggle */}
      <div className="flex gap-3">
        {/* Search input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, roll number, or email..."
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <Button
          variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
          onClick={onToggleFilters}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-primary-foreground text-primary text-xs font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filter dropdowns - always visible */}
      <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Filter by</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClearFilters}>
                Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Batch Year
              </label>
              <BatchYearMultiSelect
                options={batchYears}
                selected={selectedBatchYears}
                onChange={onBatchYearsChange}
                placeholder="All batches"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Department
              </label>
              <StringMultiSelect
                options={departments}
                selected={selectedDepartments}
                onChange={onDepartmentsChange}
                placeholder="All departments"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Program
              </label>
              <StringMultiSelect
                options={programs}
                selected={selectedPrograms}
                onChange={onProgramsChange}
                placeholder="All programs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Hall
              </label>
              <StringMultiSelect
                options={halls}
                selected={selectedHalls}
                onChange={onHallsChange}
                placeholder="All halls"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Gender
              </label>
              <StringMultiSelect
                options={genders}
                selected={selectedGenders}
                onChange={onGendersChange}
                placeholder="All genders"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Blood Group
              </label>
              <StringMultiSelect
                options={bloodGroups}
                selected={selectedBloodGroups}
                onChange={onBloodGroupsChange}
                placeholder="All blood groups"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                State
              </label>
              <StringMultiSelect
                options={states}
                selected={selectedStates}
                onChange={onStatesChange}
                placeholder="All states"
              />
            </div>
          </div>

          {/* Active filter tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
              {selectedBatchYears.map((year) => (
                <FilterTag
                  key={`batch-${year}`}
                  label={getBatchLabel(year)}
                  onRemove={() =>
                    onBatchYearsChange(
                      selectedBatchYears.filter((y) => y !== year)
                    )
                  }
                />
              ))}
              {selectedDepartments.map((dept) => (
                <FilterTag
                  key={`dept-${dept}`}
                  label={dept}
                  onRemove={() =>
                    onDepartmentsChange(
                      selectedDepartments.filter((d) => d !== dept)
                    )
                  }
                />
              ))}
              {selectedPrograms.map((prog) => (
                <FilterTag
                  key={`prog-${prog}`}
                  label={prog}
                  onRemove={() =>
                    onProgramsChange(selectedPrograms.filter((p) => p !== prog))
                  }
                />
              ))}
              {selectedHalls.map((hall) => (
                <FilterTag
                  key={`hall-${hall}`}
                  label={hall}
                  onRemove={() =>
                    onHallsChange(selectedHalls.filter((h) => h !== hall))
                  }
                />
              ))}
              {selectedGenders.map((gender) => (
                <FilterTag
                  key={`gender-${gender}`}
                  label={gender === "M" ? "Male" : gender === "F" ? "Female" : gender}
                  onRemove={() =>
                    onGendersChange(selectedGenders.filter((g) => g !== gender))
                  }
                />
              ))}
              {selectedBloodGroups.map((bg) => (
                <FilterTag
                  key={`bg-${bg}`}
                  label={bg}
                  onRemove={() =>
                    onBloodGroupsChange(selectedBloodGroups.filter((b) => b !== bg))
                  }
                />
              ))}
              {selectedStates.map((state) => (
                <FilterTag
                  key={`state-${state}`}
                  label={state}
                  onRemove={() =>
                    onStatesChange(selectedStates.filter((s) => s !== state))
                  }
                />
              ))}
            </div>
          )}
        </Card>

    </div>
  );
};

export default FilterBar;
