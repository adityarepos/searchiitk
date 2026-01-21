import { useState, useEffect, useRef, memo } from "react";
import type { Student, StudentGridProps } from "@/types/student";
import { getBatchLabel, ITEMS_PER_PAGE } from "@/lib/constants";
import { getHomeImageUrl, getOAImageUrl } from "@/lib/config";
import { Frown, User, Loader2 } from "lucide-react";

interface StudentCardProps {
  student: Student;
  onClick: (student: Student) => void;
}

function StudentCard({ student, onClick }: StudentCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [useOa, setUseOa] = useState(false);

  const homeUrl = student.username ? getHomeImageUrl(student.username) : "";
  const oaUrl = getOAImageUrl(student.rollNo);
  
  // Use home URL first if available, otherwise use OA
  const imageUrl = !homeUrl || useOa ? oaUrl : homeUrl;

  // Reset state when student changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setUseOa(false);
  }, [student.rollNo]);

  const handleImageError = () => {
    if (!useOa && homeUrl) {
      // Home image failed, try OA
      setUseOa(true);
      setImageLoaded(false);
    } else {
      // Both failed
      setImageError(true);
    }
  };

  return (
    <button
      onClick={() => onClick(student)}
      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 rounded-lg border border-border bg-card text-card-foreground shadow-sm text-left"
    >
      {/* Image container */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        {!imageError && (
          <img
            src={imageUrl}
            alt={student.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            className={`
              w-full h-full object-contain transition-all duration-300
              group-hover:scale-105
              ${imageLoaded ? "opacity-100" : "opacity-0"}
            `}
          />
        )}

        {/* Placeholder while loading or on error */}
        {(!imageLoaded || imageError) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-border rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* Batch badge */}
        {student.batchYear && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 bg-card/90 backdrop-blur-sm text-xs font-semibold text-card-foreground rounded-md border border-border">
              {getBatchLabel(student.batchYear)}
            </span>
          </div>
        )}

        {/* Incomplete data indicator */}
        {!student.hasFullData && (
          <div className="absolute top-2 left-2">
            <span
              className="w-2 h-2 bg-destructive rounded-full block"
              title="Limited data available"
            />
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="p-3">
        <h3 className="font-semibold text-card-foreground text-sm truncate group-hover:text-primary transition-colors">
          {student.name || "Unknown"}
        </h3>
        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
          {student.rollNo}
        </p>
        {student.department && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            {student.department.replace(" and ", " & ")}
          </p>
        )}
      </div>
    </button>
  );
}

const MemoizedStudentCard = memo(StudentCard);

const StudentGrid = ({
  students,
  onStudentClick,
  hasFilters,
}: StudentGridProps) => {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [students]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < students.length) {
          setDisplayCount((prev) =>
            Math.min(prev + ITEMS_PER_PAGE, students.length)
          );
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [displayCount, students.length]);

  const displayedStudents = students.slice(0, displayCount);

  if (!hasFilters) {
    return (
      <div className="text-center py-4">
        <div className="w-96 h-96 mx-auto">
          <img 
            src="/sus_dog.jpg" 
            alt="Search for students" 
            className="w-full h-full object-contain rounded-lg"
          />
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto bg-muted rounded-lg flex items-center justify-center mb-6">
          <Frown className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          No students found
        </h2>
        <p className="text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {displayedStudents.length}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">{students.length}</span>{" "}
          students
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayedStudents.map((student) => (
          <MemoizedStudentCard
            key={student.rollNo}
            student={student}
            onClick={onStudentClick}
          />
        ))}
      </div>

      {/* Load more trigger */}
      {displayCount < students.length && (
        <div ref={loaderRef} className="py-8 flex justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentGrid;
