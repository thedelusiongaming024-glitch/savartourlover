export interface DbDestination {
  id: string;
  name: string;
  slug: string;
  division: string;
  tagline?: string;
  description: string;
  best_time_to_visit: string;
  weather_notes: string;
  popular_attractions: string[];
  recommended_accommodation: string;
  travel_tips: string;
  permits_required: string;
  cover_image: string | null;
  cover_video_url: string;
  seo_title: string;
  seo_description: string;
  gallery: { id: string; image: string; caption: string }[];
  is_featured: boolean;
  status: "published" | "draft" | "archived";
}
export interface DbTourCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  badge?: string;
  icon?: string;
  is_active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbDeparture {
  id: string;
  departure_date: string;
  seats_remaining: number;
  total_seats?: number;
  booked_seats?: string[];
  is_active: boolean;
}

export interface DbTour {
  id: string;
  title: string;
  slug: string;
  destination_id?: string;
  destination_slug: string;
  destination_name: string;
  category: string;
  short_description: string;
  full_description: string;
  hero_image: string | null;
  duration_days: number;
  duration_nights: number;
  base_price: string;
  discount_type: "flat" | "percent" | "none";
  discount_value: string;
  final_price: string;
  allow_partial_payment: boolean;
  advance_payment_percent: string;
  advance_amount: string;
  inclusions: string[];
  exclusions: string[];
  accommodation_notes: string;
  transportation_notes: string;
  meals_notes: string;
  meeting_point: string;
  pickup_points?: string[];
  departure_schedule: string;
  total_seats: number;
  departures: DbDeparture[];
  itinerary: { day_number: number; title: string; description: string }[];
  gallery: DbTourGalleryItem[];
  faqs: { question: string; answer: string }[];
  is_featured: boolean;
  status: "published" | "draft" | "archived";
}

export interface DbTourGalleryItem {
  id: string;
  image: string;
  caption?: string;
  title?: string;
  location?: string;
  price?: string;
  badge?: string;
  watermarkText?: string;
  slot?: string;
}

export interface DbOffer {
  id: string;
  title: string;
  description: string;
  slug: string;
  code?: string;
  discount_type?: "percent" | "flat";
  discount_value?: string;
  minimum_spend?: string;
  valid_from?: string;
  tour_id?: string | null;
  tour_slug?: string | null;
  tour_title?: string | null;
  valid_until: string;
  banner_image: string | null;
  is_active: boolean;
}

export interface DbTestimonial {
  id: string;
  customer_name: string;
  tour_title: string;
  author_name?: string;
  trip_name?: string;
  author_location?: string;
  author_avatar?: string | null;
  rating: number;
  quote: string;
  customer_photo: string | null;
  is_featured: boolean;
}

export interface DbBlogPost {
  id: string;
  slug: string;
  title: string;
  category: { name: string } | null;
  author_name: string;
  author?: string;
  cover_image: string | null;
  hero_image?: string | null;
  excerpt: string;
  body: string;
  content?: string;
  read_time_minutes?: number;
  tags?: string[];
  published_at: string;
  created_at?: string;
  status: "published" | "draft";
  is_published?: boolean;
  is_featured?: boolean;
}

export interface AboutValueItem {
  icon: string;
  title: string;
  description: string;
}

export interface AboutTeamMember {
  name: string;
  role: string;
  bio: string;
  scene?: string;
  image_url?: string;
}

export interface AboutPageCmsContent {
  // Hero
  hero_eyebrow?: string;
  hero_title?: string;
  hero_subtitle?: string;
  
  // Story & Mission
  story_badge?: string;
  story_title?: string;
  story_paragraphs?: string[];
  mission_title?: string;
  mission_text?: string;
  
  // Core Values
  values?: AboutValueItem[];
  
  // How Booking Works / Why Us
  booking_eyebrow?: string;
  booking_title?: string;
  booking_description?: string;
  
  // Team / Local Hosts
  team_eyebrow?: string;
  team_title?: string;
  team?: AboutTeamMember[];
  
  // Payment & Settlement
  payment_badge?: string;
  payment_title?: string;
  payment_description?: string;
  payment_cta_label?: string;
  payment_cta_href?: string;
  
  // Bottom CTA
  cta_title?: string;
  cta_description?: string;
  cta_label?: string;
  cta_href?: string;
}

export interface WhyUsItem {
  icon: string;
  title: string;
  description: string;
}

export interface ServiceItem {
  icon: string;
  title: string;
  description: string;
  href?: string;
}

export interface HeroSlideItem {
  id: string;
  image_url: string;
  title: string;
  subtitle?: string;
}

export interface HomePageCmsContent {
  // 1. Hero
  hero_media_type?: "slideshow" | "video";
  hero_video_url?: string;
  hero_slides?: HeroSlideItem[];
  hero_eyebrow?: string;
  hero_headline?: string;
  hero_highlight?: string;
  hero_subheadline?: string;
  hero_primary_cta_label?: string;
  hero_primary_cta_href?: string;
  hero_secondary_cta_label?: string;
  hero_secondary_cta_href?: string;

  // 2. Destinations Section
  destinations_eyebrow?: string;
  destinations_title?: string;
  destinations_description?: string;
  destinations_cta_label?: string;
  destinations_cta_href?: string;
  destinations_hidden?: boolean;

  // 3. Tours Section
  tours_eyebrow?: string;
  tours_title?: string;
  tours_description?: string;
  tours_cta_label?: string;
  tours_cta_href?: string;
  tours_hidden?: boolean;

  // 4. Why Us / Value Proposition
  why_us_eyebrow?: string;
  why_us_title?: string;
  why_us_description?: string;
  why_us_items?: WhyUsItem[];
  why_us_hidden?: boolean;

  // 5. Services Section
  services_eyebrow?: string;
  services_title?: string;
  services_description?: string;
  services_items?: ServiceItem[];
  services_hidden?: boolean;

  // 6. Special Offers Section
  offers_eyebrow?: string;
  offers_title?: string;
  offers_description?: string;
  offers_hidden?: boolean;

  // 7. Testimonials / Reviews Section
  reviews_eyebrow?: string;
  reviews_title?: string;
  reviews_description?: string;
  reviews_hidden?: boolean;

  // 8. Travel Journal Section
  journal_eyebrow?: string;
  journal_title?: string;
  journal_description?: string;
  journal_cta_label?: string;
  journal_cta_href?: string;
  journal_hidden?: boolean;

  // 9. Bottom CTA Banner
  cta_eyebrow?: string;
  cta_title?: string;
  cta_description?: string;
  cta_primary_label?: string;
  cta_primary_href?: string;
  cta_secondary_label?: string;
  cta_secondary_href?: string;
  cta_hidden?: boolean;
}

export interface JournalPageCmsContent {
  header_eyebrow?: string;
  header_title?: string;
  header_description?: string;
  featured_badge?: string;
  empty_title?: string;
  empty_description?: string;
}

export interface DbHomepageBlock {
  id: string;
  block_type:
    | "hero"
    | "rich_text"
    | "image"
    | "featured_tours"
    | "destination_grid"
    | "testimonials"
    | "cta"
    | "gallery"
    | "hero_banner"
    | "service_list"
    | "about_page"
    | "journal_page"
    | "home_page";
  display_order: number;
  content: Record<string, unknown>;
}

export type StaffRole = "super_admin" | "finance_manager" | "operations_staff" | "sales_manager" | "tour_host";

export interface DbStaffUser {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  role: StaffRole;
  phone_number: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  // Unix seconds. Any refresh token whose `iat` is older than this is
  // rejected, so logging out (or an admin forcing a logout) invalidates
  // every refresh token issued before that point, even ones we never saw
  // again. Unset = no tokens have ever been revoked for this user.
  tokens_valid_from?: number;
}

export type BookingStatus =
  | "pending_payment"
  | "pending_cash_approval"
  | "confirmed_advance_paid"
  | "confirmed_fully_paid"
  | "cleared_on_tour_day"
  | "cancelled"
  | "refunded";

export interface DbTraveler {
  id: string;
  full_name: string;
  age?: number;
  nid_or_birth_cert?: string;
  seat_number?: string;
  is_lead_traveler: boolean;
}

export interface DbBooking {
  id: string;
  reference: string;
  tour_id: string;
  tour_title: string;
  tour_slug: string;
  destination_slug: string;
  departure_id?: string;
  departure_date?: string;
  traveler_count: number;
  selected_seats?: string[];
  unit_price: string;
  total_price: string;
  final_price: string;
  payment_plan: "full" | "partial";
  payment_method?: "Bkash payment" | "Rocket payment" | "sslcommerz" | "cash_on_hand" | "cash" | string;
  advance_payment_method?: "Bkash payment" | "Rocket payment" | "sslcommerz" | "cash_on_hand" | "cash" | string;
  due_payment_method?: "Bkash payment" | "Rocket payment" | "sslcommerz" | "cash_on_hand" | "host_cash" | "cash" | string;
  cash_approval_expires_at?: string;
  cash_approved_by?: string;
  cash_approved_at?: string;
  due_cash_approval_expires_at?: string;
  due_cash_approved_by?: string;
  due_cash_approved_at?: string;
  advance_required_percent: string;
  advance_amount: string;
  amount_paid: string;
  amount_due: string;
  due_date: string;
  status: BookingStatus;
  customer_id?: string;
  customer_full_name: string;
  customer_phone_number: string;
  customer_email: string;
  pickup_point?: string;
  special_requests?: string;
  promo_code?: string | null;
  discount_amount?: string;
  travelers: DbTraveler[];
  created_at: string;
  updated_at: string;
  transaction_id?: string;
  advance_transaction_id?: string;
  due_transaction_id?: string;
  // Set when a payment confirmed a booking whose seat hold had already
  // expired (2h) and one or more of its seats were, in the meantime,
  // claimed by a different active booking. The payment is still accepted
  // (money already moved), but seating needs a human to sort out — see
  // confirmPaymentSuccessInner in server/db.ts.
  seat_conflict_notice?: string;
}

export interface DbPayment {
  id: string;
  booking_id: string;
  amount: string;
  payment_type: "advance" | "final" | "due" | "full";
  payment_method: "Bkash payment" | "Rocket payment" | "sslcommerz" | "host_cash" | "host_pos" | "customer_self_pay" | "cash_on_hand" | "cash" | string;
  status: "pending" | "pending_cash_approval" | "success" | "failed" | "cancelled";
  tran_id: string;
  gateway_session_key?: string;
  val_id?: string;
  trx_id?: string;
  card_type?: string;
  created_at: string;
  paid_at?: string;
}

export interface DbClearanceTicket {
  id: string;
  booking_id: string;
  token: string;
  token_expires_at: string;
  is_cleared: boolean;
  cleared_at?: string;
  cleared_by_staff_id?: string;
  clearance_method?: "host_verification" | "host_qr_scan" | "customer_self_pay" | "host_cash" | "verification_only";
  created_at: string;
}

export interface DbAlert {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  is_acknowledged: boolean;
  created_at: string;
}

export type ExpenseCategory = "hotel" | "transport" | "guide" | "food" | "marketing" | "office" | "other";

export interface DbExpense {
  id: string;
  category: ExpenseCategory | string;
  amount: string;
  date: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export type SupplierCategory = "hotel" | "transport" | "boat" | "guide" | "food" | "resort" | "other";

export interface DbSupplier {
  id: string;
  name: string;
  category?: SupplierCategory | string;
  contact_person?: string;
  phone?: string;
  email?: string;
  outstanding_balance: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  destination: string;
  dates: string;
  trip_type: string;
  travelers: number;
  message: string;
  status: "new" | "in_progress" | "resolved";
  admin_notes?: string;
  created_at: string;
}

export interface DbCustomerActivity {
  id: string;
  customer_id: string;
  type: "account_created" | "booking_created" | "payment_completed" | "payment_pending" | "qr_cleared" | "profile_updated";
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DbCustomerUser {
  id: string;
  phone_number: string;
  full_name: string;
  email?: string;
  preferred_pickup_point?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  activities?: DbCustomerActivity[];
}

export interface DbAnalyticsEvent {
  id: string;
  event_name:
    | "page_view"
    | "tour_view"
    | "destination_view"
    | "initiate_checkout"
    | "booking_created"
    | "payment_success"
    | "contact_inquiry"
    | "search";
  path?: string;
  title?: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
  session_id?: string;
  visitor_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DatabaseSchema {
  destinations: DbDestination[];
  tours: DbTour[];
  tourCategories?: DbTourCategory[];
  offers: DbOffer[];
  testimonials: DbTestimonial[];
  blogPosts: DbBlogPost[];
  homepageBlocks: DbHomepageBlock[];
  staffUsers: DbStaffUser[];
  customers: DbCustomerUser[];
  bookings: DbBooking[];
  payments: DbPayment[];
  clearanceTickets: DbClearanceTicket[];
  alerts: DbAlert[];
  expenses: DbExpense[];
  suppliers: DbSupplier[];
  contactInquiries: DbContactInquiry[];
  analyticsEvents: DbAnalyticsEvent[];
  deletedEntities?: {
    destinations?: string[];
    tours?: string[];
    offers?: string[];
    testimonials?: string[];
    blogPosts?: string[];
    homepageBlocks?: string[];
    tourCategories?: string[];
    bookings?: string[];
    customers?: string[];
    contactInquiries?: string[];
  };
}

