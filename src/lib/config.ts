// Base path configuration for deployment
export const BASE_PATH = import.meta.env.BASE_URL;

// Helper to get correct asset paths
export function getAssetPath(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE_PATH}${cleanPath}`;
}

// Image URLs
export function getOAImageUrl(rollNo: string): string {
  if (!rollNo) return "";
  return `https://oa.cc.iitk.ac.in/Oa/Jsp/Photo/${rollNo}_0.jpg`;
}

export function getHomeImageUrl(username: string): string {
  if (!username) return "";
  return `http://home.iitk.ac.in/~${username}/dp`;
}

// Alias for backward compatibility
export const getImageUrl = getOAImageUrl;
