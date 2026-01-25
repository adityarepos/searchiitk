// Student data utilities
import type {
  Student,
  FamilyTree,
  FamilyTreeNode,
  FamilyIndex,
  FilterOptions,
} from "@/types/student";
import { getImageUrl } from "./config";

/**
 * Extract batch year from roll number
 */
export function extractBatchYear(rollNo: string | null): number | null {
  if (!rollNo) return null;

  const rollStr = String(rollNo).trim();

  // Legacy format Y8xxx, Y9xxx
  if (rollStr.startsWith("Y")) {
    const yearDigit = rollStr.charAt(1);
    if (yearDigit === "8") return 2008;
    if (yearDigit === "9") return 2009;
    return null;
  }

  const len = rollStr.length;

  // 5-digit format: 10xxx -> 2010
  if (len === 5) {
    const prefix = parseInt(rollStr.substring(0, 2), 10);
    if (prefix >= 10 && prefix <= 14) {
      return 2000 + prefix;
    }
  }

  // 6-digit format: 150xxx -> 2015
  if (len === 6) {
    const prefix = parseInt(rollStr.substring(0, 2), 10);
    if (prefix >= 15 && prefix <= 30) {
      return 2000 + prefix;
    }
  }

  // 8-digit format: 23001234 -> 2023
  if (len === 8) {
    const prefix = parseInt(rollStr.substring(0, 2), 10);
    if (prefix >= 15 && prefix <= 30) {
      return 2000 + prefix;
    }
  }

  return null;
}

/**
 * Parse name and roll number from family tree node
 */
export function parseFamilyTreeNode(
  name: string
): { name: string; rollNo: string | null } | null {
  if (!name || name === "all") return null;

  const lastDashIndex = name.lastIndexOf("-");
  if (lastDashIndex === -1) return { name: name, rollNo: null };

  const studentName = name.substring(0, lastDashIndex).trim();
  const rollNo = name.substring(lastDashIndex + 1).trim();

  return { name: studentName, rollNo };
}

/**
 * Clean student name
 */
export function cleanName(name: string | null): string {
  if (!name) return "";
  return name
    .replace(/\s*\(\d{2}-\d{2}-\d{4}\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build family tree index from nested JSON structure
 */
export function buildFamilyIndex(familyTree: FamilyTree): FamilyIndex {
  const index: FamilyIndex = {};

  function traverse(node: FamilyTreeNode, parentRollNo: string | null = null) {
    if (!node || !node.name) return;

    const parsed = parseFamilyTreeNode(node.name);
    if (!parsed || !parsed.rollNo) {
      if (node.children) {
        node.children.forEach((child) => traverse(child, null));
      }
      return;
    }

    const normalizedRoll = parsed.rollNo;

    index[normalizedRoll] = {
      name: parsed.name,
      rollNo: normalizedRoll,
      children: (node.children || [])
        .map((child) => parseFamilyTreeNode(child.name))
        .filter((c): c is { name: string; rollNo: string } => c !== null && c.rollNo !== null)
        .map((c) => c.rollNo),
      sg: parentRollNo,
    };

    if (node.children) {
      node.children.forEach((child) => traverse(child, normalizedRoll));
    }
  }

  traverse(familyTree);
  return index;
}

/**
 * Merge students.json with family tree data
 */
export function mergeStudentData(
  currentStudents: Student[],
  familyIndex: FamilyIndex
): Student[] {
  const merged = new Map<string, Student>();

  // Add all students from students.json
  currentStudents.forEach((student) => {
    const rollNo = student.roll || student.rollNo || "";
    merged.set(rollNo, {
      ...student,
      rollNo: rollNo,
      name: cleanName(student.name),
      department: student.dept || student.department || "N/A",
      program: student.program || "N/A",
      bloodGroup: student.blood_group || student.bloodGroup || null,
      hostel: student.hall ? `${student.hall},${student.room || ""}` : "N/A",
      email: student.username ? `${student.username}@iitk.ac.in` : null,
      imageUrl: getImageUrl(rollNo),
      hasFullData: true,
      batchYear: extractBatchYear(rollNo),
      state: student.homestate || student.state || "",
    });
  });

  // Add students from family tree that are not in current_students
  Object.values(familyIndex).forEach((treeStudent) => {
    const rollNo = treeStudent.rollNo;

    if (!merged.has(rollNo)) {
      const paddedRoll = rollNo.padStart(6, "0");
      if (!rollNo.startsWith("Y") && merged.has(paddedRoll)) {
        return;
      }

      merged.set(rollNo, {
        rollNo: rollNo,
        name: treeStudent.name,
        hasFullData: false,
        batchYear: extractBatchYear(rollNo),
        imageUrl: getImageUrl(rollNo),
      } as Student);
    }
  });

  return Array.from(merged.values());
}

/**
 * Filter students based on criteria
 */
export function filterStudents(
  students: Student[],
  filters: FilterOptions
): Student[] {
  const { searchQuery, batchYears, departments, programs, halls, genders, bloodGroups, states } = filters;

  return students.filter((student) => {
    // Search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const nameMatch =
        student.name && student.name.toLowerCase().includes(query);
      const rollMatch =
        student.rollNo && student.rollNo.toLowerCase().includes(query);
      const emailMatch =
        student.email && student.email.toLowerCase().includes(query);
      if (!nameMatch && !rollMatch && !emailMatch) return false;
    }

    // Batch year filter
    if (batchYears && batchYears.length > 0) {
      if (!student.batchYear || !batchYears.includes(student.batchYear)) {
        return false;
      }
    }

    // Department filter
    if (departments && departments.length > 0) {
      if (!student.department || !departments.includes(student.department)) {
        return false;
      }
    }

    // Program filter
    if (programs && programs.length > 0) {
      if (!student.program || !programs.includes(student.program)) {
        return false;
      }
    }

    // Hall filter
    if (halls && halls.length > 0) {
      if (!student.hall || !halls.includes(student.hall)) {
        return false;
      }
    }

    // Gender filter
    if (genders && genders.length > 0) {
      if (!student.gender || !genders.includes(student.gender)) {
        return false;
      }
    }

    // Blood group filter
    if (bloodGroups && bloodGroups.length > 0) {
      const studentBloodGroup = student.bloodGroup || student.blood_group;
      if (!studentBloodGroup || !bloodGroups.includes(studentBloodGroup)) {
        return false;
      }
    }

    // State filter
    if (states && states.length > 0) {
      if (!student.state || !states.includes(student.state)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get unique departments from student data
 */
export function getUniqueDepartments(students: Student[]): string[] {
  const depts = new Set<string>();
  students.forEach((s) => {
    if (s.department && s.department !== "N/A") depts.add(s.department);
  });
  return Array.from(depts).sort();
}

/**
 * Get unique programs from student data
 */
export function getUniquePrograms(students: Student[]): string[] {
  const programs = new Set<string>();
  students.forEach((s) => {
    if (s.program && s.program !== "N/A") programs.add(s.program);
  });
  return Array.from(programs).sort();
}

/**
 * Get unique batch years from student data
 */
export function getUniqueBatchYears(
  students: Student[]
): { value: number; label: string }[] {
  const years = new Set<number>();
  students.forEach((s) => {
    if (s.batchYear) years.add(s.batchYear);
  });
  return Array.from(years)
    .sort((a, b) => b - a)
    .map((year) => ({
      value: year,
      label: `Y${String(year).slice(-2)}`,
    }));
}

/**
 * Get unique halls from student data
 */
export function getUniqueHalls(students: Student[]): string[] {
  const halls = new Set<string>();
  students.forEach((s) => {
    if (s.hall && s.hall.trim()) halls.add(s.hall);
  });
  return Array.from(halls).sort();
}

/**
 * Get unique genders from student data
 */
export function getUniqueGenders(students: Student[]): string[] {
  const genders = new Set<string>();
  students.forEach((s) => {
    if (s.gender && s.gender.trim()) genders.add(s.gender);
  });
  return Array.from(genders).sort();
}

/**
 * Get unique blood groups from student data
 */
export function getUniqueBloodGroups(students: Student[]): string[] {
  const bloodGroups = new Set<string>();
  students.forEach((s) => {
    const bg = s.bloodGroup || s.blood_group;
    if (bg && bg.trim()) bloodGroups.add(bg);
  });
  return Array.from(bloodGroups).sort();
}

/**
 * Get unique states from student data
 */
export function getUniqueStates(students: Student[]): string[] {
  const states = new Set<string>();
  students.forEach((s) => {
    if (s.state && s.state.trim()) states.add(s.state);
  });
  return Array.from(states).sort();
}

/**
 * Get family member data from index
 */
export function getFamilyMembers(
  rollNo: string,
  familyIndex: FamilyIndex,
  allStudents: Student[]
): { sg: Student | null; children: Student[] } {
  if (!rollNo || !familyIndex) return { sg: null, children: [] };

  const familyInfo = familyIndex[rollNo];
  if (!familyInfo) return { sg: null, children: [] };

  // Find SG
  let sg: Student | null = null;
  if (familyInfo.sg) {
    sg =
      allStudents.find((s) => s.rollNo === familyInfo.sg) ||
      ({ rollNo: familyInfo.sg, name: "Unknown" } as Student);
  }

  // Find children
  const children = (familyInfo.children || []).map((childRoll) => {
    return (
      allStudents.find((s) => s.rollNo === childRoll) ||
      ({ rollNo: childRoll, name: "Unknown" } as Student)
    );
  });

  return { sg, children };
}
