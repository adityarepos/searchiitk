// Student data types

export interface Student {
  // Core identifiers
  rollNo: string;
  roll?: string;
  name: string;

  // Academic info
  department?: string;
  dept?: string;
  program?: string;
  batchYear?: number | null;

  // Contact info
  email?: string | null;
  username?: string;

  // Personal info
  bloodGroup?: string | null;
  blood_group?: string | null;
  gender?: string;
  hostel?: string;
  hall?: string;
  room?: string;
  hometown?: string;
  homestate?: string;
  state?: string;

  // Image
  imageUrl?: string;
  image_url?: string;

  // Metadata
  hasFullData?: boolean;
}

export interface FamilyTreeNode {
  name: string;
  children?: FamilyTreeNode[];
}

export type FamilyTree = FamilyTreeNode;

export interface FamilyMember {
  name: string;
  rollNo: string;
  children: string[];
  sg: string | null;
}

export type FamilyIndex = Record<string, FamilyMember>;

export interface FilterOptions {
  searchQuery?: string;
  batchYears?: number[];
  departments?: string[];
  programs?: string[];
  halls?: string[];
  genders?: string[];
  bloodGroups?: string[];
  states?: string[];
}

export interface BatchYearOption {
  value: number;
  label: string;
}

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  batchYears: BatchYearOption[];
  selectedBatchYears: number[];
  onBatchYearsChange: (years: number[]) => void;
  departments: string[];
  selectedDepartments: string[];
  onDepartmentsChange: (depts: string[]) => void;
  programs: string[];
  selectedPrograms: string[];
  onProgramsChange: (programs: string[]) => void;
  halls: string[];
  selectedHalls: string[];
  onHallsChange: (halls: string[]) => void;
  genders: string[];
  selectedGenders: string[];
  onGendersChange: (genders: string[]) => void;
  bloodGroups: string[];
  selectedBloodGroups: string[];
  onBloodGroupsChange: (bloodGroups: string[]) => void;
  states: string[];
  selectedStates: string[];
  onStatesChange: (states: string[]) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export interface StudentGridProps {
  students: Student[];
  onStudentClick: (student: Student) => void;
  hasFilters: boolean;
}

export interface StudentModalProps {
  student: Student;
  familyIndex: FamilyIndex;
  onClose: () => void;
  onNavigate: (rollNo: string) => void;
  allStudents: Student[];
}

export interface HeaderProps {
  totalStudents: number;
  filteredCount: number;
  hasFilters: boolean;
}
