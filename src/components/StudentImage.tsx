import { useState, useEffect, memo } from "react";
import { User, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHomeImageUrl, getOAImageUrl } from "@/lib/config";

interface StudentImageProps {
  rollNo: string;
  username?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  showIdCardButton?: boolean;
}

type ImageSource = "home" | "oa" | "none";

export function StudentImage({
  rollNo,
  username,
  name,
  size = "md",
  showIdCardButton = false,
}: StudentImageProps) {
  const [primarySource, setPrimarySource] = useState<ImageSource>("home");
  const [homeImageExists, setHomeImageExists] = useState<boolean | null>(null);
  const [oaImageExists, setOaImageExists] = useState<boolean | null>(null);
  const [showingIdCard, setShowingIdCard] = useState(false);
  const [currentImageError, setCurrentImageError] = useState(false);

  const homeUrl = username ? getHomeImageUrl(username) : "";
  const oaUrl = getOAImageUrl(rollNo);

  // Reset state when student changes
  useEffect(() => {
    setPrimarySource("home");
    setHomeImageExists(null);
    setOaImageExists(null);
    setShowingIdCard(false);
    setCurrentImageError(false);
  }, [rollNo, username]);

  // Preload and check if images exist
  useEffect(() => {
    if (!homeUrl) {
      setHomeImageExists(false);
      setPrimarySource("oa");
      return;
    }

    // Check home image
    const homeImg = new Image();
    homeImg.onload = () => setHomeImageExists(true);
    homeImg.onerror = () => {
      setHomeImageExists(false);
      setPrimarySource("oa");
    };
    homeImg.src = homeUrl;

    // Check OA image in parallel
    const oaImg = new Image();
    oaImg.onload = () => setOaImageExists(true);
    oaImg.onerror = () => setOaImageExists(false);
    oaImg.src = oaUrl;
  }, [homeUrl, oaUrl]);

  const handleImageError = () => {
    if (primarySource === "home") {
      setPrimarySource("oa");
      setCurrentImageError(false);
    } else {
      setPrimarySource("none");
      setCurrentImageError(true);
    }
  };

  const getCurrentImageUrl = () => {
    if (showingIdCard) return oaUrl;
    if (primarySource === "home" && homeUrl) return homeUrl;
    if (primarySource === "oa") return oaUrl;
    return "";
  };

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-28 h-28",
    lg: "w-36 h-36",
    xl: "w-44 h-44",
    "2xl": "w-56 h-56",
    "3xl": "w-72 h-72",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
    "2xl": "w-24 h-24",
    "3xl": "w-28 h-28",
  };

  const showIdButton =
    showIdCardButton &&
    homeImageExists === true &&
    oaImageExists === true &&
    !showingIdCard;

  const showBackButton = showIdCardButton && showingIdCard;

  return (
    <div className="relative">
      <div
        className={`${sizeClasses[size]} rounded-md overflow-hidden bg-muted border border-border flex-shrink-0`}
      >
        {primarySource !== "none" && !currentImageError ? (
          <img
            src={getCurrentImageUrl()}
            alt={name}
            onError={handleImageError}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className={`${iconSizes[size]} text-muted-foreground`} />
          </div>
        )}
      </div>

      {/* ID Card button - shown when both images exist */}
      {showIdButton && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute -bottom-2 -right-2 h-7 px-2 text-xs shadow-md"
          onClick={() => setShowingIdCard(true)}
          title="View ID Card Photo"
        >
          <IdCard className="w-3.5 h-3.5 mr-1" />
          ID
        </Button>
      )}

      {/* Back button - shown when viewing ID card */}
      {showBackButton && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute -bottom-2 -right-2 h-7 px-2 text-xs shadow-md"
          onClick={() => setShowingIdCard(false)}
          title="View Profile Photo"
        >
          <User className="w-3.5 h-3.5 mr-1" />
          DP
        </Button>
      )}
    </div>
  );
}

// Simplified version for small thumbnails (no button)
function StudentThumbnailBase({
  rollNo,
  username,
  name,
}: Omit<StudentImageProps, "size" | "showIdCardButton">) {
  const [imageError, setImageError] = useState(false);
  const [useOa, setUseOa] = useState(false);

  const homeUrl = username ? getHomeImageUrl(username) : "";
  const oaUrl = getOAImageUrl(rollNo);

  // Reset state when student changes
  useEffect(() => {
    setImageError(false);
    setUseOa(false);
  }, [rollNo, username]);

  const handleError = () => {
    if (!useOa && homeUrl) {
      setUseOa(true);
    } else {
      setImageError(true);
    }
  };

  const currentUrl = !homeUrl || useOa ? oaUrl : homeUrl;

  if (imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <User className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={currentUrl}
      alt={name}
      loading="lazy"
      onError={handleError}
      className="w-full h-full object-contain"
    />
  );
}

export const StudentThumbnail = memo(StudentThumbnailBase);
