export type SceneKey =
  | "coxsbazar"
  | "stmartins"
  | "sundarbans"
  | "sylhet"
  | "ratargul"
  | "jaflong"
  | "bandarban"
  | "rangamati"
  | "sajek"
  | "kuakata"
  | "srimangal"
  | "sonargaon"
  | "paharpur"
  | "dhaka"
  | "khulna";

export interface Scene {
  key: SceneKey;
  label: string;
  /**
   * Real uploaded photo, when the backend has one (Destination.cover_image,
   * DestinationGalleryImage.image, Tour.hero_image, TourGalleryImage.image,
   * BlogPost.cover_image — all of these were already being fetched from the
   * API into api.ts's raw response types, but silently discarded before
   * this: the adapters only ever built a Scene from a slug/name, ignoring
   * any real photo the API actually returned. When set, SceneBackdrop
   * renders this photo instead of the gradient placeholder.
   */
  imageUrl?: string;
  /**
   * Real video, when the backend has one (currently only
   * Destination.cover_video_url). When set, SceneBackdrop renders this
   * instead of the gradient/photo, muted and looping, and falls back to
   * imageUrl (or the gradient) if the video fails to load.
   */
  videoUrl?: string;
}

export interface Destination {
  slug: string;
  name: string;
  bn: string;
  tagline: string;
  region: string;
  description: string;
  cover: Scene;
  gallery: Scene[];
  bestTime: string;
  weather: string;
  attractions: string[];
  accommodation: string;
  travelTips: string[];
  tourSlugs: string[];
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface TourDeparture {
  id: string;
  date: string;
  seatsRemaining: number;
  totalSeats?: number;
  bookedSeats?: string[];
}

export interface Tour {
  id: string;
  slug: string;
  title: string;
  destinationSlug: string;
  duration: string;
  startingPrice: number;
  discount: number;
  advancePercent: number;
  allowPartialPayment?: boolean;
  category: string;
  summary: string;
  description: string;
  cover: Scene;
  gallery: Scene[];
  galleryItems?: TourGalleryItem[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  accommodation: string;
  transportation: string;
  meals: string;
  capacity: number;
  total_seats?: number;
  totalSeats?: number;
  departure: string;
  departures?: TourDeparture[];
  meetingPoint: string;
  pickupPoints?: string[];
  faqs: Faq[];
  featured?: boolean;
  placesToVisit?: string[];
}

export interface TourGalleryItem {
  id?: string;
  image?: string;
  imageUrl?: string;
  title?: string;
  caption?: string;
  location?: string;
  price?: string | number;
  badge?: string;
  watermarkText?: string;
  slot?: string;
  isFeatured?: boolean;
}

export interface JournalBlock {
  heading?: string;
  paragraphs: string[];
}

export interface JournalPost {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  author: string;
  readTime: string;
  cover: Scene;
  body: JournalBlock[];
  isFeatured?: boolean;
}

export interface Review {
  name: string;
  location: string;
  tour: string;
  rating: number;
  text: string;
  /** Testimonial.customer_photo, when the backend has one. */
  photoUrl?: string;
}

export type HomepageBlockType =
  | "hero"
  | "rich_text"
  | "image"
  | "featured_tours"
  | "destination_grid"
  | "testimonials"
  | "cta"
  | "gallery";

export interface HomepageBlock {
  id: string;
  blockType: HomepageBlockType;
  displayOrder: number;
  /** Loosely typed — shape depends on blockType; see cms/models.py's
   * HomepageBlock.content help_text for the exact schema per type. */
  content: Record<string, unknown>;
}

export interface Service {
  title: string;
  description: string;
  icon: string;
}

export interface Offer {
  title: string;
  description: string;
  code: string;
  badge: string;
  expiry: string;
  /** SpecialOffer.banner_image, when the backend has one. */
  bannerUrl?: string;
  tour_id?: string | null;
  tour_slug?: string | null;
  tour_title?: string | null;
}
