import { useState, useEffect, useRef } from "react";
import type { Student, StudentModalProps } from "@/types/student";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBatchLabel } from "@/lib/constants";
import { fetchHometown, getFamilyMembers } from "@/lib/studentUtils";
import { StudentImage, StudentThumbnail } from "@/components/StudentImage";
import { ChevronLeft, ChevronRight, X, Users } from "lucide-react";

interface InfoRowProps {
  label: string;
  value?: string | null;
  mono?: boolean;
}

function InfoRow({ label, value, mono = false }: InfoRowProps) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span
        className={`text-sm text-foreground text-right ml-4 ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

interface FamilyMemberCardProps {
  member: Student;
  onClick: (member: Student) => void;
  relationship: string;
}

function FamilyMemberCard({
  member,
  onClick,
  relationship,
}: FamilyMemberCardProps) {
  return (
    <button
      onClick={() => onClick(member)}
      className="flex items-center gap-3 p-2 w-full bg-muted/50 hover:bg-muted rounded-md transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-md overflow-hidden bg-background border border-border flex-shrink-0">
        <StudentThumbnail
          rollNo={member.rollNo}
          username={member.username}
          name={member.name || "Unknown"}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors">
          {member.name || "Unknown"}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {relationship} • {member.rollNo}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </button>
  );
}

const StudentModal = ({
  student,
  familyIndex,
  onClose,
  onNavigate,
  allStudents,
}: StudentModalProps) => {
  const [hometown, setHometown] = useState<string | null>(null);
  const [hometownLoading, setHometownLoading] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<Student[]>([
    student,
  ]);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentStudent = navigationHistory[navigationHistory.length - 1];

  // Fetch hometown when student changes
  useEffect(() => {
    setHometown(null);
    if (currentStudent?.rollNo) {
      setHometownLoading(true);
      fetchHometown(currentStudent.rollNo)
        .then(setHometown)
        .catch(() => setHometown(null))
        .finally(() => setHometownLoading(false));
    }
  }, [currentStudent?.rollNo]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Get family members
  const { sg, children } = getFamilyMembers(
    currentStudent?.rollNo || "",
    familyIndex,
    allStudents
  );

  const handleNavigate = (member: Student) => {
    const fullStudent =
      allStudents.find((s) => s.rollNo === member.rollNo) || member;
    setNavigationHistory((prev) => [...prev, fullStudent]);
    if (onNavigate) onNavigate(fullStudent.rollNo);
  };

  const handleBack = () => {
    if (navigationHistory.length > 1) {
      setNavigationHistory((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        ref={modalRef}
        className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {navigationHistory.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-base font-semibold text-card-foreground">
              Student Profile
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Profile section */}
          <div className="flex gap-4">
            {/* Photo with smart fallback and ID card toggle */}
            <StudentImage
              rollNo={currentStudent.rollNo}
              username={currentStudent.username}
              name={currentStudent.name || "Unknown"}
              size="md"
              showIdCardButton={true}
            />

            {/* Basic info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-card-foreground truncate">
                {currentStudent.name || "Unknown"}
              </h3>
              <p className="text-sm font-mono text-muted-foreground">
                {currentStudent.rollNo}
              </p>
              {currentStudent.batchYear && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-md">
                  {getBatchLabel(currentStudent.batchYear)}
                </span>
              )}
              {!currentStudent.hasFullData && (
                <p className="mt-2 text-xs text-muted-foreground italic">
                  Limited data available
                </p>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="bg-muted/30 rounded-md p-3 border border-border">
            <InfoRow label="Roll Number" value={currentStudent.rollNo} mono />
            <InfoRow label="Department" value={currentStudent.department} />
            <InfoRow label="Program" value={currentStudent.program} />
            <InfoRow label="Email" value={currentStudent.email} mono />
            <InfoRow label="Username" value={currentStudent.username} mono />
            <InfoRow
              label="Hometown"
              value={hometownLoading ? "Loading..." : hometown}
            />
            {currentStudent.hall && (
              <InfoRow label="Hall" value={currentStudent.hall} />
            )}
            {currentStudent.bloodGroup && (
              <InfoRow label="Blood Group" value={currentStudent.bloodGroup} />
            )}
            {currentStudent.gender && (
              <InfoRow label="Gender" value={currentStudent.gender} />
            )}
          </div>

          {/* Family tree section */}
          {(sg || children.length > 0) && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Family Tree
              </h4>

              <div className="space-y-2">
                {/* SG (Student Guide / Parent) */}
                {sg && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                      Student Guide (SG)
                    </p>
                    <FamilyMemberCard
                      member={sg}
                      onClick={handleNavigate}
                      relationship="SG"
                    />
                  </div>
                )}

                {/* Children */}
                {children.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                      Fachhas ({children.length})
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {children.map((child) => (
                        <FamilyMemberCard
                          key={child.rollNo}
                          member={child}
                          onClick={handleNavigate}
                          relationship="Fachha"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudentModal;
