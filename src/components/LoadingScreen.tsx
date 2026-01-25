import { Search, Loader2 } from "lucide-react";

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-primary-foreground/10 rounded-lg flex items-center justify-center">
            <Search className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-primary-foreground mb-2">
          SearchIITK
        </h1>
        <p className="text-primary-foreground/70 mb-6">Student Directory</p>

        {/* Loading indicator */}
        <Loader2 className="w-6 h-6 text-primary-foreground mx-auto animate-spin" />
      </div>
    </div>
  );
};

export default LoadingScreen;
