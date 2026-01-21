import { ThemeToggle } from "@/components/ThemeToggle";
import type { HeaderProps } from "@/types/student";
import { Search } from "lucide-react";

const Header = ({ totalStudents, filteredCount, hasFilters }: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                SearchIITK
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Student Directory
              </p>
            </div>
          </div>

          {/* Stats and theme toggle */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">
                {hasFilters ? (
                  <>
                    <span className="text-primary">
                      {filteredCount.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span>{totalStudents.toLocaleString()}</span>
                  </>
                ) : (
                  <span>{totalStudents.toLocaleString()}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {hasFilters ? "filtered" : "students"}
              </p>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
