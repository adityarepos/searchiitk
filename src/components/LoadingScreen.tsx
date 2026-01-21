import { Search, Loader2 } from "lucide-react";

interface LoadingScreenProps {
  progress?: { current: number; total: number };
}

const LoadingScreen = ({ progress }: LoadingScreenProps) => {
  const percentage = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
      <div className="text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-primary-foreground/10 rounded-lg flex items-center justify-center">
            <Search className="w-14 h-14 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-primary-foreground mb-2">
          SearchIITK
        </h1>
        <p className="text-primary-foreground/70 mb-8">Student Directory</p>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
          <p className="text-primary-foreground/60 text-sm">
            {progress
              ? `Loading data... ${percentage}%`
              : "Loading student data..."}
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary-foreground/50 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
