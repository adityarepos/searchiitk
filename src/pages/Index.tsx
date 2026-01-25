import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStudentData } from "@/lib/dataCache";
import {
  filterStudents,
  getUniqueDepartments,
  getUniquePrograms,
  getUniqueBatchYears,
  getUniqueHalls,
  getUniqueGenders,
  getUniqueBloodGroups,
  getUniqueStates,
} from "@/lib/studentUtils";
import type { Student } from "@/types/student";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import StudentGrid from "@/components/StudentGrid";
import StudentModal from "@/components/StudentModal";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";

const Index = () => {
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBatchYears, setSelectedBatchYears] = useState<number[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedHalls, setSelectedHalls] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedBloodGroups, setSelectedBloodGroups] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fetch data with React Query
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["studentData"],
    queryFn: getStudentData,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const allStudents = data?.students || [];
  const familyIndex = data?.familyIndex || {};

  // Get filter options
  const filterOptions = useMemo(() => {
    if (allStudents.length === 0)
      return { departments: [], programs: [], batchYears: [], halls: [], genders: [], bloodGroups: [], states: [] };

    return {
      departments: getUniqueDepartments(allStudents),
      programs: getUniquePrograms(allStudents),
      batchYears: getUniqueBatchYears(allStudents),
      halls: getUniqueHalls(allStudents),
      genders: getUniqueGenders(allStudents),
      bloodGroups: getUniqueBloodGroups(allStudents),
      states: getUniqueStates(allStudents),
    };
  }, [allStudents]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return filterStudents(allStudents, {
      searchQuery: debouncedSearch,
      batchYears: selectedBatchYears,
      departments: selectedDepartments,
      programs: selectedPrograms,
      halls: selectedHalls,
      genders: selectedGenders,
      bloodGroups: selectedBloodGroups,
      states: selectedStates,
    });
  }, [
    allStudents,
    debouncedSearch,
    selectedBatchYears,
    selectedDepartments,
    selectedPrograms,
    selectedHalls,
    selectedGenders,
    selectedBloodGroups,
    selectedStates,
  ]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim() !== "" ||
      selectedBatchYears.length > 0 ||
      selectedDepartments.length > 0 ||
      selectedPrograms.length > 0 ||
      selectedHalls.length > 0 ||
      selectedGenders.length > 0 ||
      selectedBloodGroups.length > 0 ||
      selectedStates.length > 0
    );
  }, [searchQuery, selectedBatchYears, selectedDepartments, selectedPrograms, selectedHalls, selectedGenders, selectedBloodGroups, selectedStates]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedBatchYears([]);
    setSelectedDepartments([]);
    setSelectedPrograms([]);
    setSelectedHalls([]);
    setSelectedGenders([]);
    setSelectedBloodGroups([]);
    setSelectedStates([]);
  }, []);

  // Handle student click
  const handleStudentClick = useCallback((student: Student) => {
    setSelectedStudent(student);
  }, []);

  // Navigate to another student
  const navigateToStudent = useCallback(
    (rollNo: string) => {
      const student = allStudents.find((s) => s.rollNo === rollNo);
      if (student) {
        setSelectedStudent(student);
      }
    },
    [allStudents]
  );

  // Close modal
  const closeModal = useCallback(() => {
    setSelectedStudent(null);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Unable to Load Data
          </h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "Failed to load student data. Please check your internet connection and try again."}
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        totalStudents={allStudents.length}
        filteredCount={filteredStudents.length}
        hasFilters={hasActiveFilters}
      />

      <main className="container py-6">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          batchYears={filterOptions.batchYears}
          selectedBatchYears={selectedBatchYears}
          onBatchYearsChange={setSelectedBatchYears}
          departments={filterOptions.departments}
          selectedDepartments={selectedDepartments}
          onDepartmentsChange={setSelectedDepartments}
          programs={filterOptions.programs}
          selectedPrograms={selectedPrograms}
          onProgramsChange={setSelectedPrograms}
          halls={filterOptions.halls}
          selectedHalls={selectedHalls}
          onHallsChange={setSelectedHalls}
          genders={filterOptions.genders}
          selectedGenders={selectedGenders}
          onGendersChange={setSelectedGenders}
          bloodGroups={filterOptions.bloodGroups}
          selectedBloodGroups={selectedBloodGroups}
          onBloodGroupsChange={setSelectedBloodGroups}
          states={filterOptions.states}
          selectedStates={selectedStates}
          onStatesChange={setSelectedStates}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        <StudentGrid
          students={filteredStudents}
          onStudentClick={handleStudentClick}
          hasFilters={hasActiveFilters}
        />
      </main>

      {selectedStudent && (
        <StudentModal
          student={selectedStudent}
          familyIndex={familyIndex}
          onClose={closeModal}
          onNavigate={navigateToStudent}
          allStudents={allStudents}
        />
      )}
    </div>
  );
};

export default Index;
