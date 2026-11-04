export type AdminLang = "en" | "bn";

export interface AdminDictionary {
  header: {
    title: string;
    superAdmin: string;
    staff: string;
    cloudStatus: string;
    connected: string;
    site: string;
    refresh: string;
    password: string;
    signOut: string;
  };
  tabs: {
    overview: string;
    tours: string;
    destinations: string;
    users: string;
    bookings: string;
    reports: string;
    cms: string;
    about_cms: string;
    blog: string;
    offers: string;
    reviews: string;
    inquiries: string;
    seo: string;
  };
  overview: {
    quickActionsTitle: string;
    quickActionsSubtitle: string;
    addTour: string;
    reports: string;
    addDest: string;
    editHome: string;
    editAbout: string;
    newPost: string;
    newPromo: string;
    dbTitle: string;
    dbSync: string;
    dbHost: string;
    dbStorage: string;
    dualLayer: string;
    financialSummary: string;
    financialSubtitle: string;
    revenue: string;
    directCosts: string;
    grossMargin: string;
    operatingExp: string;
    netProfit: string;
    capacityTitle: string;
    capacitySubtitle: string;
    totalBookings: string;
    publishedTours: string;
    pendingAdvances: string;
    dueOnTourDay: string;
    trackingTitle: string;
    trackingSubtitle: string;
    trackingActive: string;
    pageViews24h: string;
    totalViews: string;
    uniqueVisitors: string;
    activeSessions: string;
    topRoutes: string;
    noRoutes: string;
    trafficSources: string;
    noSources: string;
    conversionEvents: string;
    bookingsCreated: string;
    paymentsConfirmed: string;
    inquiriesSubmitted: string;
    recentActivity: string;
    alertsTitle: string;
    noAlerts: string;
    ackAlert: string;
  };
  tours: {
    title: string;
    subtitle: string;
    manageCategories: string;
    addTour: string;
    searchPlaceholder: string;
    allCategories: string;
    showingCount: (shown: number | string, total: number | string) => string;
    published: string;
    draft: string;
    days: string;
    nights: string;
    seats: string;
    advanceRequired: string;
    activeDepartures: (count: number | string) => string;
    departuresBtn: string;
    galleryBtn: string;
    editBtn: string;
    deleteBtn: string;
    deleteConfirm: string;
  };
  destinations: {
    title: string;
    subtitle: string;
    addDest: string;
    searchPlaceholder: string;
    allDivisions: string;
    showingCount: (shown: number | string, total: number | string) => string;
    attractions: string;
    bestTimeToVisit: string;
    packagesCount: (count: number | string) => string;
    editBtn: string;
    deleteBtn: string;
    deleteConfirm: string;
  };
  users: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    colName: string;
    colContact: string;
    colBookings: string;
    colSpent: string;
    colDue: string;
    colActions: string;
    viewBookings: string;
    deleteUser: string;
    deleteConfirm: string;
    noUsers: string;
  };
  bookings: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    filterAll: string;
    filterConfirmed: string;
    filterPending: string;
    filterCancelled: string;
    filterCompleted: string;
    colRef: string;
    colTraveler: string;
    colTour: string;
    colDeparture: string;
    colSeats: string;
    colPaid: string;
    colDue: string;
    colStatus: string;
    colActions: string;
    statusConfirmed: string;
    statusPending: string;
    statusCancelled: string;
    statusCompleted: string;
    settleDue: string;
    approveCash: string;
    rejectCash: string;
    updatePickup: string;
    noBookings: string;
  };
  cms: {
    title: string;
    subtitle: string;
    saveChanges: string;
    saving: string;
    heroSection: string;
    whyUsSection: string;
    servicesSection: string;
    featuredSection: string;
  };
  aboutCms: {
    title: string;
    subtitle: string;
    saveChanges: string;
    storySection: string;
    valuesSection: string;
    teamSection: string;
    missionSection: string;
  };
  blog: {
    title: string;
    subtitle: string;
    newPost: string;
    colTitle: string;
    colCategory: string;
    colAuthor: string;
    colPublished: string;
    colStatus: string;
    colActions: string;
    published: string;
    draft: string;
    featured: string;
    editBtn: string;
    deleteBtn: string;
  };
  offers: {
    title: string;
    subtitle: string;
    addOffer: string;
    colCode: string;
    colDiscount: string;
    colValidity: string;
    colStatus: string;
    colActions: string;
    active: string;
    inactive: string;
    editBtn: string;
    deleteBtn: string;
  };
  reviews: {
    title: string;
    subtitle: string;
    addReview: string;
    colTraveler: string;
    colRating: string;
    colQuote: string;
    colTour: string;
    colStatus: string;
    colActions: string;
    published: string;
    hidden: string;
    editBtn: string;
    deleteBtn: string;
  };
  inquiries: {
    title: string;
    subtitle: string;
    colName: string;
    colPhone: string;
    colEmail: string;
    colDates: string;
    colMessage: string;
    colStatus: string;
    colActions: string;
    newStatus: string;
    contacted: string;
    closed: string;
    viewBtn: string;
  };
  seo: {
    title: string;
    subtitle: string;
    saveSeo: string;
    metaTitle: string;
    metaDesc: string;
    targetKeywords: string;
    rankingTips: string;
  };
  modals: {
    tour: {
      newTitle: string;
      editTitle: string;
      basicInfo: string;
      logistics: string;
      placesToVisit: string;
      pricing: string;
      itinerary: string;
      inclusions: string;
      save: string;
      cancel: string;
    };
    departures: {
      title: string;
      addBatch: string;
      save: string;
      cancel: string;
    };
    gallery: {
      title: string;
      addPhoto: string;
      save: string;
      cancel: string;
    };
    categories: {
      title: string;
      addCategory: string;
      save: string;
      cancel: string;
    };
    password: {
      title: string;
      currentPass: string;
      newPass: string;
      confirmPass: string;
      updateBtn: string;
      cancel: string;
    };
  };
  common: {
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    view: string;
    search: string;
    filter: string;
    status: string;
    actions: string;
    loading: string;
    confirm: string;
    success: string;
    error: string;
  };
}

export const adminI18n: Record<AdminLang, AdminDictionary> = {
  en: {
    header: {
      title: "Savar Tour Lover",
      superAdmin: "Super Admin",
      staff: "Staff",
      cloudStatus: "Supabase Cloud",
      connected: "Connected",
      site: "Site",
      refresh: "Refresh",
      password: "Password",
      signOut: "Sign Out",
    },
    tabs: {
      overview: "Overview",
      tours: "Tours",
      destinations: "Destinations",
      users: "Users / Travelers",
      bookings: "Bookings",
      reports: "Reports & Manifest",
      cms: "Homepage CMS",
      about_cms: "About Page CMS",
      blog: "Travel Journal",
      offers: "Special Offers",
      reviews: "Testimonials",
      inquiries: "Inquiries",
      seo: "🔍 SEO & BD Ranking",
    },
    overview: {
      quickActionsTitle: "Quick Actions",
      quickActionsSubtitle: "Fast shortcuts to add new packages or update homepage configuration",
      addTour: "+ Add Tour",
      reports: "📊 Reports",
      addDest: "+ Add Dest",
      editHome: "Edit Home",
      editAbout: "Edit About",
      newPost: "+ New Post",
      newPromo: "+ New Promo Code",
      dbTitle: "Online Database: Supabase Connected",
      dbSync: "Active Cloud Sync",
      dbHost: "Host",
      dbStorage: "Storage",
      dualLayer: "Dual-Layer Persistence",
      financialSummary: "Financial Summary",
      financialSubtitle: "Operational revenue, costs, and current margins",
      revenue: "Revenue",
      directCosts: "Direct Costs",
      grossMargin: "Gross Margin",
      operatingExp: "Operating Exp.",
      netProfit: "Net Profit",
      capacityTitle: "Receivables & Operational Capacity",
      capacitySubtitle: "Booking counts, pending advances, and balance due on tour day",
      totalBookings: "Total Bookings",
      publishedTours: "Published Tours",
      pendingAdvances: "Pending Advances",
      dueOnTourDay: "Due On Tour Day",
      trackingTitle: "Server-Side Traffic & Conversion Tracking",
      trackingSubtitle: "First-party server analytics immune to browser ad-blockers",
      trackingActive: "Live Event Ingestion Active",
      pageViews24h: "24h Page Views",
      totalViews: "Total Views Tracked",
      uniqueVisitors: "Unique Visitors",
      activeSessions: "Active Sessions",
      topRoutes: "Top Visited Routes",
      noRoutes: "No pageviews recorded yet.",
      trafficSources: "Traffic Sources / UTM",
      noSources: "No referral traffic recorded yet.",
      conversionEvents: "Server Conversion Events",
      bookingsCreated: "Bookings Created",
      paymentsConfirmed: "Payments Confirmed",
      inquiriesSubmitted: "Inquiries Submitted",
      recentActivity: "Recent System Events",
      alertsTitle: "Operational Alerts",
      noAlerts: "No active alerts. All operations running smoothly.",
      ackAlert: "Acknowledge",
    },
    tours: {
      title: "Tour Packages",
      subtitle: "Manage departures, pricing, advance payment requirements, and detailed itineraries",
      manageCategories: "Manage Categories",
      addTour: "+ Add Tour Package",
      searchPlaceholder: "Search by tour title or destination…",
      allCategories: "All Categories",
      showingCount: (shown, total) => `Showing ${shown} of ${total} tours`,
      published: "Published",
      draft: "Draft",
      days: "Days",
      nights: "Nights",
      seats: "Seats",
      advanceRequired: "advance required",
      activeDepartures: (count) => `${count} active scheduled departure(s)`,
      departuresBtn: "🚌 Departures",
      galleryBtn: "📸 Gallery",
      editBtn: "Edit Details",
      deleteBtn: "Delete",
      deleteConfirm: "Are you sure you want to delete this tour package?",
    },
    destinations: {
      title: "Destinations Management",
      subtitle: "Configure tourist spots, scenic highlights, divisions, and seasonal tips",
      addDest: "+ Add Destination",
      searchPlaceholder: "Search destinations by name or location…",
      allDivisions: "All Divisions",
      showingCount: (shown, total) => `Showing ${shown} of ${total} destinations`,
      attractions: "Key Attractions",
      bestTimeToVisit: "Best Time to Visit",
      packagesCount: (count) => `${count} tour package(s) available`,
      editBtn: "Edit Destination",
      deleteBtn: "Delete",
      deleteConfirm: "Are you sure you want to delete this destination?",
    },
    users: {
      title: "Registered Users & Travelers",
      subtitle: "Monitor user profiles, booking history, lifetime spend, and outstanding balances",
      searchPlaceholder: "Search by traveler name, email, or phone…",
      colName: "Customer / Traveler",
      colContact: "Contact Information",
      colBookings: "Bookings",
      colSpent: "Total Spent",
      colDue: "Total Due",
      colActions: "Actions",
      viewBookings: "View Bookings",
      deleteUser: "Delete",
      deleteConfirm: "Are you sure you want to delete this customer record?",
      noUsers: "No travelers found matching your criteria.",
    },
    bookings: {
      title: "Customer Bookings",
      subtitle: "Verify bank/bKash/cash transactions, issue invoices, and track traveler boarding",
      searchPlaceholder: "Search by reference code, guest name, or phone number…",
      filterAll: "All Bookings",
      filterConfirmed: "Confirmed",
      filterPending: "Pending / Under Review",
      filterCancelled: "Cancelled",
      filterCompleted: "Completed",
      colRef: "Reference / Date",
      colTraveler: "Traveler Details",
      colTour: "Tour Package & Batch",
      colDeparture: "Departure",
      colSeats: "Seats",
      colPaid: "Paid Advance",
      colDue: "Due on Tour Day",
      colStatus: "Status",
      colActions: "Actions",
      statusConfirmed: "Confirmed",
      statusPending: "Pending",
      statusCancelled: "Cancelled",
      statusCompleted: "Completed",
      settleDue: "Settle Due",
      approveCash: "Approve Cash",
      rejectCash: "Reject Cash",
      updatePickup: "Update Boarding",
      noBookings: "No bookings found matching your search.",
    },
    cms: {
      title: "Homepage Visual CMS Editor",
      subtitle: "Live preview and modification of homepage hero banners, highlights, and promotions",
      saveChanges: "Save CMS Configuration",
      saving: "Saving Changes…",
      heroSection: "Hero Slide Banners",
      whyUsSection: "Why Choose Us Highlights",
      servicesSection: "Core Travel Services",
      featuredSection: "Featured Tours Grid",
    },
    aboutCms: {
      title: "About Page Content Management",
      subtitle: "Customize brand story, mission, core values, leadership team, and credentials",
      saveChanges: "Save About Page Content",
      storySection: "Brand Journey & Story",
      valuesSection: "Core Values & Guarantees",
      teamSection: "Leadership & Tour Guides",
      missionSection: "Our Mission & Vision",
    },
    blog: {
      title: "Travel Journal & Articles",
      subtitle: "Publish travel stories, packing guides, and destination insights for travelers",
      newPost: "+ New Blog Post",
      colTitle: "Article Title",
      colCategory: "Category",
      colAuthor: "Author",
      colPublished: "Publish Date",
      colStatus: "Status",
      colActions: "Actions",
      published: "Published",
      draft: "Draft",
      featured: "Featured",
      editBtn: "Edit",
      deleteBtn: "Delete",
    },
    offers: {
      title: "Special Offers & Promo Codes",
      subtitle: "Create seasonal discounts, festival coupon codes, and bundle promotions",
      addOffer: "+ Add Promo Code",
      colCode: "Promo Code",
      colDiscount: "Discount Value",
      colValidity: "Valid Until",
      colStatus: "Status",
      colActions: "Actions",
      active: "Active",
      inactive: "Expired / Disabled",
      editBtn: "Edit",
      deleteBtn: "Delete",
    },
    reviews: {
      title: "Testimonials & Feedback",
      subtitle: "Manage authentic customer reviews, ratings, and traveler testimonials",
      addReview: "+ Add Testimonial",
      colTraveler: "Traveler Name",
      colRating: "Rating",
      colQuote: "Review Excerpt",
      colTour: "Tour Package",
      colStatus: "Status",
      colActions: "Actions",
      published: "Visible",
      hidden: "Hidden",
      editBtn: "Edit",
      deleteBtn: "Delete",
    },
    inquiries: {
      title: "Contact Inquiries & Custom Tour Requests",
      subtitle: "Review incoming client messages, requested dates, and traveler inquiries",
      colName: "Guest Name",
      colPhone: "Phone / WhatsApp",
      colEmail: "Email",
      colDates: "Preferred Dates",
      colMessage: "Message / Requirements",
      colStatus: "Status",
      colActions: "Actions",
      newStatus: "New",
      contacted: "Contacted",
      closed: "Resolved",
      viewBtn: "View Details",
    },
    seo: {
      title: "Bangladesh & Bangla Search Engine Optimization",
      subtitle: "Fine-tune ranking keywords, meta tags, and structured schema for top search visibility in Bangladesh",
      saveSeo: "Save SEO Settings",
      metaTitle: "Meta Title",
      metaDesc: "Meta Description",
      targetKeywords: "Primary Keywords",
      rankingTips: "Local BD Ranking Guide",
    },
    modals: {
      tour: {
        newTitle: "Create New Tour Package",
        editTitle: "Edit Tour Package Details",
        basicInfo: "Basic Information",
        logistics: "Tour Logistics & Boarding",
        placesToVisit: "Places You'll Visit",
        pricing: "Pricing & Advance Payment",
        itinerary: "Day-by-Day Itinerary",
        inclusions: "Inclusions & Exclusions",
        save: "Save Tour Package",
        cancel: "Cancel",
      },
      departures: {
        title: "Manage Scheduled Departures & Batches",
        addBatch: "+ Add Departure Date",
        save: "Save Departures",
        cancel: "Cancel",
      },
      gallery: {
        title: "Tour Photo Gallery (Bento Grid)",
        addPhoto: "+ Add Photo",
        save: "Save Gallery",
        cancel: "Cancel",
      },
      categories: {
        title: "Manage Tour Categories",
        addCategory: "+ Add Category",
        save: "Save Category",
        cancel: "Cancel",
      },
      password: {
        title: "Change Admin Password",
        currentPass: "Current Password",
        newPass: "New Password",
        confirmPass: "Confirm New Password",
        updateBtn: "Update Password",
        cancel: "Cancel",
      },
    },
    common: {
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      close: "Close",
      view: "View",
      search: "Search",
      filter: "Filter",
      status: "Status",
      actions: "Actions",
      loading: "Loading…",
      confirm: "Confirm",
      success: "Saved successfully!",
      error: "An error occurred.",
    },
  },
  bn: {
    header: {
      title: "সাভার ট্যুর লাভার",
      superAdmin: "সুপার অ্যাডমিন",
      staff: "স্টাফ",
      cloudStatus: "সুপাব্যাস ক্লাউড",
      connected: "সংযুক্ত",
      site: "ওয়েবসাইট",
      refresh: "রিফ্রেশ",
      password: "পাসওয়ার্ড",
      signOut: "লগআউট",
    },
    tabs: {
      overview: "ওভারভিউ",
      tours: "ট্যুর প্যাকেজ",
      destinations: "গন্তব্যসমূহ",
      users: "ভ্রমণকারী ও ইউজার",
      bookings: "বুকিং সমূহ",
      reports: "রিপোর্ট ও ট্রাভেলার্স",
      cms: "হোমপেজ সিএমএস",
      about_cms: "সম্পর্কে পেজ সিএমএস",
      blog: "ভ্রমণ জার্নাল",
      offers: "স্পেশাল অফার",
      reviews: "রিভিউ ও মতামত",
      inquiries: "ইনকোয়ারি ও বার্তা",
      seo: "🔍 এসইও ও র‍্যাংকিং",
    },
    overview: {
      quickActionsTitle: "দ্রুত অ্যাকশন",
      quickActionsSubtitle: "নতুন প্যাকেজ যোগ বা ওয়েবসাইট কনফিগারেশনের দ্রুত শর্টকাট",
      addTour: "+ নতুন ট্যুর যোগ",
      reports: "📊 রিপোর্ট ও তালিকা",
      addDest: "+ নতুন গন্তব্য",
      editHome: "হোমপেজ এডিট",
      editAbout: "সম্পর্কে পেজ এডিট",
      newPost: "+ নতুন ব্লগ পোস্ট",
      newPromo: "+ নতুন প্রোমো কোড",
      dbTitle: "অনলাইন ডেটাবেজ: সুপাব্যাস ক্লাউড সংযুক্ত",
      dbSync: "সক্রিয় ক্লাউড সিঙ্ক",
      dbHost: "হোস্ট",
      dbStorage: "স্টোরেজ",
      dualLayer: "দ্বৈত-স্তর ব্যাকআপ",
      financialSummary: "আর্থিক সারসংক্ষেপ",
      financialSubtitle: "পরিচালন রাজস্ব, খরচ এবং বর্তমান মুনাফা মার্জিন",
      revenue: "মোট রাজস্ব",
      directCosts: "প্রত্যক্ষ খরচ",
      grossMargin: "মোট মুনাফা",
      operatingExp: "পরিচালন খরচ",
      netProfit: "নিট মুনাফা",
      capacityTitle: "বকেয়া ও অপারেশন সক্ষমতা",
      capacitySubtitle: "বুকিং সংখ্যা, বকেয়া অগ্রিম এবং ট্যুরের দিনে প্রদেয় বাকি অর্থ",
      totalBookings: "মোট বুকিং",
      publishedTours: "প্রকাশিত ট্যুর",
      pendingAdvances: "বকেয়া অগ্রিম",
      dueOnTourDay: "ট্যুরের দিনে প্রদেয়",
      trackingTitle: "ওয়েবসাইট ট্র্যাফিক ও কনভার্সন ট্র্যাকিং",
      trackingSubtitle: "ফার্স্ট-পার্টি সার্ভার অ্যানালিটিক্স (অ্যাড-ব্লকার প্রতিরোধী)",
      trackingActive: "লাইভ ইভেন্ট ট্র্যাকিং চালু",
      pageViews24h: "২৪ ঘণ্টার পেজ ভিউ",
      totalViews: "মোট ট্র্যাকড ভিউ",
      uniqueVisitors: "ইউনিক ভিজিটর",
      activeSessions: "সক্রিয় সেশন",
      topRoutes: "সর্বাধিক পরিদর্শনকৃত পেজ",
      noRoutes: "এখনো কোনো পেজভিউ রেকর্ড হয়নি।",
      trafficSources: "ট্র্যাফিক সোর্স / ইউটিএম",
      noSources: "এখনো কোনো রেফারেল ট্র্যাফিক রেকর্ড হয়নি।",
      conversionEvents: "সার্ভার কনভার্সন ইভেন্ট",
      bookingsCreated: "তৈরিকৃত বুকিং",
      paymentsConfirmed: "নিশ্চিত পেমেন্ট",
      inquiriesSubmitted: "প্রাপ্ত বার্তা ও ইনকোয়ারি",
      recentActivity: "সাম্প্রতিক সিস্টেম কার্যক্রম",
      alertsTitle: "সিস্টেম অ্যালার্ট ও সতর্কতা",
      noAlerts: "কোনো সক্রিয় অ্যালার্ট নেই। সব কার্যক্রম স্বাভাবিক চলছে।",
      ackAlert: "দেখা হয়েছে",
    },
    tours: {
      title: "ট্যুর প্যাকেজসমূহ",
      subtitle: "ডিপার্চার তারিখ, প্যাকেজ মূল্য, প্রয়োজনীয় অগ্রিম ও বিস্তারিত ভ্রমণসূচি পরিচালনা করুন",
      manageCategories: "ক্যাটাগরি পরিচালনা",
      addTour: "+ নতুন ট্যুর প্যাকেজ",
      searchPlaceholder: "ট্যুরের নাম বা গন্তব্য দিয়ে খুঁজুন…",
      allCategories: "সকল ক্যাটাগরি",
      showingCount: (shown, total) => `${total} টির মধ্যে ${shown} টি ট্যুর দেখানো হচ্ছে`,
      published: "প্রকাশিত",
      draft: "ড্রাফট",
      days: "দিন",
      nights: "রাত",
      seats: "আসন",
      advanceRequired: "অগ্রিম প্রয়োজন",
      activeDepartures: (count) => `${count} টি সক্রিয় ডিপার্চার ব্যাচ`,
      departuresBtn: "🚌 ডিপার্চার ব্যাচ",
      galleryBtn: "📸 ছবির গ্যালারি",
      editBtn: "বিস্তারিত এডিট",
      deleteBtn: "মুছুন",
      deleteConfirm: "আপনি কি নিশ্চিতভাবে এই ট্যুর প্যাকেজটি মুছে ফেলতে চান?",
    },
    destinations: {
      title: "গন্তব্যসমূহ পরিচালনা",
      subtitle: "পর্যটন স্পট, প্রাকৃতিক সৌন্দর্য, বিভাগ এবং সেরা ভ্রমণের সময় কনফিগার করুন",
      addDest: "+ নতুন গন্তব্য যোগ",
      searchPlaceholder: "গন্তব্যের নাম বা স্থান দিয়ে খুঁজুন…",
      allDivisions: "সকল বিভাগ",
      showingCount: (shown, total) => `${total} টির মধ্যে ${shown} টি গন্তব্য দেখানো হচ্ছে`,
      attractions: "প্রধান আকর্ষণসমূহ",
      bestTimeToVisit: "ভ্রমণের সেরা সময়",
      packagesCount: (count) => `${count} টি ট্যুর প্যাকেজ উপলব্ধ`,
      editBtn: "গন্তব্য এডিট",
      deleteBtn: "মুছুন",
      deleteConfirm: "আপনি কি নিশ্চিতভাবে এই গন্তব্যটি মুছে ফেলতে চান?",
    },
    users: {
      title: "নিবন্ধিত কাস্টমার ও ভ্রমণকারী",
      subtitle: "ভ্রমণকারীদের প্রোফাইল, বুকিং ইতিহাস, মোট খরচ এবং বকেয়া মনিটর করুন",
      searchPlaceholder: "ভ্রমণকারীর নাম, ইমেইল বা ফোন দিয়ে খুঁজুন…",
      colName: "ভ্রমণকারী / গ্রাহক",
      colContact: "যোগাযোগ তথ্য",
      colBookings: "বুকিং সংখ্যা",
      colSpent: "মোট খরচ",
      colDue: "মোট বকেয়া",
      colActions: "অ্যাকশন",
      viewBookings: "বুকিং দেখুন",
      deleteUser: "মুছুন",
      deleteConfirm: "আপনি কি নিশ্চিতভাবে এই কাস্টমার রেকর্ডটি মুছে ফেলতে চান?",
      noUsers: "কোনো ভ্রমণকারী খুঁজে পাওয়া যায়নি।",
    },
    bookings: {
      title: "গ্রাহকদের বুকিং তালিকা",
      subtitle: "পেমেন্ট লেনদেন যাচাই, ভাউচার প্রস্তুত এবং ভ্রমণকারীদের বোর্ডিং মনিটর করুন",
      searchPlaceholder: "রেফারেন্স নম্বর, নাম বা ফোন দিয়ে খুঁজুন…",
      filterAll: "সকল বুকিং",
      filterConfirmed: "নিশ্চিত (Confirmed)",
      filterPending: "অপেক্ষমান (Pending)",
      filterCancelled: "বাতিলকৃত (Cancelled)",
      filterCompleted: "সম্পন্ন (Completed)",
      colRef: "রেফারেন্স ও তারিখ",
      colTraveler: "ভ্রমণকারীর বিবরণ",
      colTour: "ট্যুর প্যাকেজ ও ব্যাচ",
      colDeparture: "ডিপার্চার তারিখ",
      colSeats: "আসন সংখ্যা",
      colPaid: "পরিশোধিত অগ্রিম",
      colDue: "ট্যুরের দিনে প্রদেয়",
      colStatus: "স্ট্যাটাস",
      colActions: "অ্যাকশন",
      statusConfirmed: "নিশ্চিত",
      statusPending: "অপেক্ষমান",
      statusCancelled: "বাতিল",
      statusCompleted: "সম্পন্ন",
      settleDue: "বাকি পরিশোধ",
      approveCash: "ক্যাশ অনুমোদন",
      rejectCash: "ক্যাশ বাতিল",
      updatePickup: "বোর্ডিং পয়েন্ট",
      noBookings: "কোনো বুকিং খুঁজে পাওয়া যায়নি।",
    },
    cms: {
      title: "হোমপেজ ভিজ্যুয়াল সিএমএস এডিটর",
      subtitle: "হোমপেজের ব্যানার, হাইলাইটস ও অফারসমূহের সরাসরি প্রিভিউ ও পরিবর্তন",
      saveChanges: "সিএমএস সেটিংস সংরক্ষণ করুন",
      saving: "সংরক্ষণ করা হচ্ছে…",
      heroSection: "হিরো স্লাইড ব্যানার",
      whyUsSection: "কেন আমাদের বেছে নেবেন",
      servicesSection: "আমাদের বিশেষ সেবাসমূহ",
      featuredSection: "জনপ্রিয় ট্যুর প্যাকেজ",
    },
    aboutCms: {
      title: "আমাদের সম্পর্কে পেজ সিএমএস",
      subtitle: "ব্র্যান্ডের গল্প, লক্ষ্য, মূল অঙ্গীকার, টিম মেম্বার ও তথ্যাবলি পরিবর্তন করুন",
      saveChanges: "তথ্য সংরক্ষণ করুন",
      storySection: "আমাদের গল্প ও পটভূমি",
      valuesSection: "মূল মূল্যবোধ ও অঙ্গীকার",
      teamSection: "টিম মেম্বার ও ট্যুর গাইড",
      missionSection: "আমাদের মিশন ও ভিশন",
    },
    blog: {
      title: "ভ্রমণ জার্নাল ও ব্লগ পোস্ট",
      subtitle: "ভ্রমণকারীদের জন্য তথ্যবহুল আর্টিকেল, ভ্রমণের গাইড ও অভিজ্ঞতা প্রকাশ করুন",
      newPost: "+ নতুন ব্লগ পোস্ট",
      colTitle: "পোস্টের শিরোনাম",
      colCategory: "ক্যাটাগরি",
      colAuthor: "লেখক",
      colPublished: "প্রকাশের তারিখ",
      colStatus: "স্ট্যাটাস",
      colActions: "অ্যাকশন",
      published: "প্রকাশিত",
      draft: "ড্রাফট",
      featured: "ফিচার্ড",
      editBtn: "এডিট",
      deleteBtn: "মুছুন",
    },
    offers: {
      title: "স্পেশাল অফার ও প্রোমো কোড",
      subtitle: "উৎসবকালীন ছাড়, কুপন কোড ও বিশেষ প্যাকেজ ডিসকাউন্ট তৈরি করুন",
      addOffer: "+ নতুন প্রোমো কোড",
      colCode: "প্রোমো কোড",
      colDiscount: "ছাড়ের পরিমাণ",
      colValidity: "মেয়াদ শেষ",
      colStatus: "স্ট্যাটাস",
      colActions: "অ্যাকশন",
      active: "সক্রিয়",
      inactive: "মেয়াদোত্তীর্ণ / বন্ধ",
      editBtn: "এডিট",
      deleteBtn: "মুছুন",
    },
    reviews: {
      title: "গ্রাহকদের রিভিউ ও প্রশংসাপত্র",
      subtitle: "ভ্রমণকারীদের আসল অভিজ্ঞতা, রেটিং ও রিভিউ প্রকাশ ও পরিচালনা করুন",
      addReview: "+ নতুন রিভিউ যোগ",
      colTraveler: "ভ্রমণকারীর নাম",
      colRating: "রেটিং",
      colQuote: "মতামতের অংশ",
      colTour: "ট্যুর প্যাকেজ",
      colStatus: "স্ট্যাটাস",
      colActions: "অ্যাকশন",
      published: "দৃশ্যমান",
      hidden: "লুকায়িত",
      editBtn: "এডিট",
      deleteBtn: "মুছুন",
    },
    inquiries: {
      title: "যোগাযোগ ও কাস্টম ট্যুর ইনকোয়ারি",
      subtitle: "গ্রাহকদের বার্তা, পছন্দের তারিখ ও বিশেষ ভ্রমণের চাহিদাসমূহ পর্যবেক্ষণ করুন",
      colName: "গ্রাহকের নাম",
      colPhone: "ফোন / হোয়াটসঅ্যাপ",
      colEmail: "ইমেইল",
      colDates: "পছন্দের তারিখ",
      colMessage: "বার্তা / চাহিদা",
      colStatus: "স্ট্যাটাস",
      colActions: "অ্যাকশন",
      newStatus: "নতুন",
      contacted: "যোগাযোগ করা হয়েছে",
      closed: "সম্পন্ন",
      viewBtn: "বিস্তারিত দেখুন",
    },
    seo: {
      title: "বাংলাদেশ ও বাংলা সার্চ ইঞ্জিন অপ্টিমাইজেশন",
      subtitle: "বাংলাদেশে সার্চ রেজাল্টে শীর্ষে থাকতে মেটা ট্যাগ, কিওয়ার্ড ও স্কিমা টিউন করুন",
      saveSeo: "এসইও সেটিংস সংরক্ষণ করুন",
      metaTitle: "মেটা টাইটেল",
      metaDesc: "মেটা ডেসক্রিপশন",
      targetKeywords: "টার্গেট কিওয়ার্ডসমূহ",
      rankingTips: "বাংলাদেশের শীর্ষ র‍্যাংকিং গাইড",
    },
    modals: {
      tour: {
        newTitle: "নতুন ট্যুর প্যাকেজ তৈরি করুন",
        editTitle: "ট্যুর প্যাকেজ বিবরণ সম্পাদনা করুন",
        basicInfo: "প্রাথমিক তথ্য",
        logistics: "লজিস্টিকস ও বোর্ডিং পয়েন্ট",
        placesToVisit: "যে স্থানগুলো ঘুরে দেখবেন",
        pricing: "মূল্য ও প্রয়োজনীয় অগ্রিম",
        itinerary: "দিন অনুযায়ী ভ্রমণসূচি",
        inclusions: "অন্তর্ভুক্ত ও বহির্ভূত বিষয়সমূহ",
        save: "প্যাকেজ সংরক্ষণ করুন",
        cancel: "বাতিল",
      },
      departures: {
        title: "ডিপার্চার তারিখ ও ব্যাচ পরিচালনা",
        addBatch: "+ নতুন ডিপার্চার যোগ",
        save: "ডিপার্চার সংরক্ষণ করুন",
        cancel: "বাতিল",
      },
      gallery: {
        title: "ছবির গ্যালারি (বেন্টো লেআউট)",
        addPhoto: "+ নতুন ছবি যোগ",
        save: "গ্যালারি সংরক্ষণ করুন",
        cancel: "বাতিল",
      },
      categories: {
        title: "ট্যুর ক্যাটাগরি পরিচালনা",
        addCategory: "+ নতুন ক্যাটাগরি",
        save: "ক্যাটাগরি সংরক্ষণ করুন",
        cancel: "বাতিল",
      },
      password: {
        title: "অ্যাডমিন পাসওয়ার্ড পরিবর্তন করুন",
        currentPass: "বর্তমান পাসওয়ার্ড",
        newPass: "নতুন পাসওয়ার্ড",
        confirmPass: "নতুন পাসওয়ার্ড নিশ্চিত করুন",
        updateBtn: "পাসওয়ার্ড আপডেট করুন",
        cancel: "বাতিল",
      },
    },
    common: {
      save: "সংরক্ষণ করুন",
      saving: "সংরক্ষণ হচ্ছে…",
      cancel: "বাতিল",
      delete: "মুছুন",
      edit: "সম্পাদনা",
      close: "বন্ধ করুন",
      view: "দেখুন",
      search: "অনুসন্ধান",
      filter: "ফিল্টার",
      status: "স্ট্যাটাস",
      actions: "অ্যাকশন",
      loading: "লোড হচ্ছে…",
      confirm: "নিশ্চিত করুন",
      success: "সফলভাবে সংরক্ষিত হয়েছে!",
      error: "একটি ত্রুটি ঘটেছে।",
    },
  },
};
