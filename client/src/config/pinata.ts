// Pinata IPFS Gateway Configuration
// The gateway URL is used to access IPFS content via Pinata's infrastructure
// For production, you might want to use your own gateway or a different IPFS gateway
export const PINATA_CONFIG = {
    gateway: "https://green-lazy-guineafowl-338.mypinata.cloud",
    apiKey: import.meta.env.VITE_PINATA_API_KEY || "",
    secretKey: import.meta.env.VITE_PINATA_SECRET_KEY || "",
  };
  
  /**
   * Get the full IPFS URL for a given CID
   * @param cid - The IPFS content identifier
   * @returns Full URL to access the content via Pinata gateway
   */
  export const getPinataUrl = (cid: string): string => {
    if (!cid) return "";
    
    // Remove any existing IPFS protocol prefixes
    const cleanCid = cid.replace(/^ipfs:\/\//, "");
    
    return `${PINATA_CONFIG.gateway}/ipfs/${cleanCid}`;
  };
  
  /**
   * Get the full IPFS URL for a given CID with fallback
   * @param cid - The IPFS content identifier
   * @param fallbackUrl - Fallback URL if CID is not available
   * @returns Full URL to access the content via Pinata gateway or fallback
   */
  export const getPinataUrlWithFallback = (cid: string, fallbackUrl?: string): string => {
    if (!cid) return fallbackUrl || "";
    
    return getPinataUrl(cid);
  };
  
  /**
   * Get the best available image URL from multiple sources
   * Priority order: mission image > NFT metadata image > fallback URL
   * @param primaryCid - Primary IPFS CID (mission image) - highest priority
   * @param secondaryCid - Secondary IPFS CID (NFT metadata image) - second priority
   * @param fallbackUrl - Fallback URL if no CIDs are available - lowest priority
   * @returns Best available image URL
   */
  export const getBestImageUrl = (
    primaryCid?: string, 
    secondaryCid?: string, 
    fallbackUrl?: string
  ): string => {
    // Try primary CID first (mission image) - highest priority
    if (primaryCid) {
      return getPinataUrl(primaryCid);
    }
    
    // Try secondary CID (NFT metadata image) - second priority
    if (secondaryCid) {
      return getPinataUrl(secondaryCid);
    }
    
    // Use fallback if no CIDs available - lowest priority
    return fallbackUrl || "";
  };
  