// Global data cache for performance optimization
import { getAssetPath } from "./config";
import type { Student, FamilyTree, FamilyIndex } from "@/types/student";
import { buildFamilyIndex, mergeStudentData } from "@/lib/studentUtils";

interface StudentsCache {
  raw: Student[] | null;
  familyTree: FamilyTree | null;
  familyIndex: FamilyIndex | null;
  merged: Student[] | null;
  loaded: boolean;
  promise: Promise<{
    students: Student[];
    familyIndex: FamilyIndex;
  }> | null;
}

const cache: StudentsCache = {
  raw: null,
  familyTree: null,
  familyIndex: null,
  merged: null,
  loaded: false,
  promise: null,
};

export async function getStudentData(): Promise<{
  students: Student[];
  familyIndex: FamilyIndex;
}> {
  if (cache.loaded && cache.merged && cache.familyIndex) {
    return { students: cache.merged, familyIndex: cache.familyIndex };
  }

  // Prevent duplicate fetches
  if (cache.promise) {
    return cache.promise;
  }

  cache.promise = (async () => {
    // Fetch both files in parallel
    const [studentsRes, treeRes] = await Promise.all([
      fetch(getAssetPath("students.json")),
      fetch(getAssetPath("familytree.json")),
    ]);

    if (!studentsRes.ok) throw new Error("Failed to load students data");
    if (!treeRes.ok) throw new Error("Failed to load family tree data");

    const [rawStudents, familyTree] = await Promise.all([
      studentsRes.json() as Promise<Student[]>,
      treeRes.json() as Promise<FamilyTree>,
    ]);

    // Build family index
    const familyIndex = buildFamilyIndex(familyTree);

    // Merge data
    const merged = mergeStudentData(rawStudents, familyIndex);

    // Update cache
    cache.raw = rawStudents;
    cache.familyTree = familyTree;
    cache.familyIndex = familyIndex;
    cache.merged = merged;
    cache.loaded = true;
    cache.promise = null;

    return { students: merged, familyIndex };
  })();

  return cache.promise;
}

// Preload data on module load
export function preloadData(): void {
  getStudentData().catch(console.error);
}

// Reset cache (useful for testing)
export function resetCache(): void {
  cache.raw = null;
  cache.familyTree = null;
  cache.familyIndex = null;
  cache.merged = null;
  cache.loaded = false;
  cache.promise = null;
}
