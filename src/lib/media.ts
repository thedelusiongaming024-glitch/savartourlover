/**
 * Media normalization utilities.
 *
 * Automatically transforms various raw links (including Google Drive share links)
 * into direct, high-speed CDN URLs suitable for <img> and <video>/<iframe> tags.
 */

/**
 * Normalizes an image URL.
 * If a Google Drive share link is passed, it automatically converts it into
 * Google's high-resolution thumbnail/CDN endpoint (sz=w1920) so it renders directly.
 *
 * Requirements for Google Drive links:
 * - The file in Drive must be shared as "Anyone with the link can view".
 */
export function normalizeImageUrl(url?: string | null): string {
  if (!url) return "";
  let trimmed = url.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return "";

  // Dropbox: convert share link to direct downloadable image
  if (trimmed.includes("dropbox.com")) {
    trimmed = trimmed.replace(/[?&]dl=0/, "").replace(/[?&]raw=1/, "");
    trimmed += (trimmed.includes("?") ? "&" : "?") + "raw=1";
    return trimmed;
  }

  // Google Drive Pattern 1: https://drive.google.com/file/d/FILE_ID/... or docs.google.com/file/d/FILE_ID/...
  const driveFileMatch = trimmed.match(/(?:drive|docs)\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveFileMatch[1]}&sz=w1920`;
  }

  // Google Drive Pattern 2: https://drive.google.com/open?id=FILE_ID or /uc?id=FILE_ID or /thumbnail?id=FILE_ID
  const driveIdMatch = trimmed.match(/(?:drive|docs)\.google\.com\/(?:open|uc|thumbnail).*?[?&]id=([a-zA-Z0-9_-]+)/i);
  if (driveIdMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveIdMatch[1]}&sz=w1920`;
  }

  // Google Drive Pattern 3: https://lh3.googleusercontent.com/d/FILE_ID
  const driveShortMatch = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i);
  if (driveShortMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveShortMatch[1]}&sz=w1920`;
  }

  // Google Drive Pattern 4: Any Google Drive thumbnail endpoint already present, ensure high-res
  if (trimmed.includes("drive.google.com/thumbnail?id=")) {
    if (!trimmed.includes("sz=")) {
      trimmed += "&sz=w1920";
    }
    return trimmed;
  }

  return trimmed;
}

export interface VideoSource {
  url: string;
  isIframe: boolean;
  youtubeId?: string;
}

/**
 * Normalizes a video URL.
 * If a Google Drive share link is passed, it converts it to the embeddable
 * /preview iframe URL because Drive does not allow raw byte-range streaming
 * on standard sharing URLs without rate limiting or cookies.
 */
export function normalizeVideoUrl(url?: string | null): VideoSource {
  if (!url) return { url: "", isIframe: false };
  const trimmed = url.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return { url: "", isIframe: false };

  // 1. Google Drive video
  const driveFileMatch = trimmed.match(/(?:drive|docs)\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  const driveIdMatch = trimmed.match(/(?:drive|docs)\.google\.com\/(?:open|uc|file).*?[?&]id=([a-zA-Z0-9_-]+)/i);
  const driveFileId = driveFileMatch?.[1] || driveIdMatch?.[1];

  if (driveFileId) {
    return {
      url: `https://drive.google.com/file/d/${driveFileId}/preview`,
      isIframe: true,
    };
  }

  // 2. YouTube (standard watch, embed, short link, and YouTube Shorts)
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/i);
  if (ytMatch?.[1]) {
    const videoId = ytMatch[1];
    return {
      url: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`,
      isIframe: true,
      youtubeId: videoId,
    };
  }

  // 3. Vimeo (vimeo.com/123456 or player.vimeo.com/video/123456)
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)([0-9]+)/i);
  if (vimeoMatch?.[1]) {
    const vimeoId = vimeoMatch[1];
    return {
      url: `https://player.vimeo.com/video/${vimeoId}?autoplay=1&loop=1&muted=1&background=1&autopause=0`,
      isIframe: true,
    };
  }

  // 4. Dropbox (convert share link to direct media stream)
  if (trimmed.includes("dropbox.com")) {
    let drop = trimmed.replace(/[?&]dl=0/, "").replace(/[?&]raw=1/, "");
    drop += (drop.includes("?") ? "&" : "?") + "raw=1";
    return {
      url: drop,
      isIframe: false,
    };
  }

  // 5. Standard direct video URL (.mp4, .webm, .ogg, .mov, etc.)
  return {
    url: trimmed,
    isIframe: false,
  };
}
