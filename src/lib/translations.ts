export type Language = "en" | "bn";

export interface TranslationDictionary {
  nav: {
    destinations: string;
    tours: string;
    about: string;
    journal: string;
    contact: string;
    planTrip: string;
    menu: string;
    close: string;
    home: string;
    tagline: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    highlight: string;
    subheadline: string;
    exploreTours: string;
    planTrip: string;
  };
  sections: {
    popularDestinations: string;
    popularDestinationsEyebrow: string;
    popularDestinationsSub: string;
    featuredTours: string;
    featuredToursEyebrow: string;
    featuredToursSub: string;
    specialOffers: string;
    specialOffersEyebrow: string;
    specialOffersSub: string;
    whyUs: string;
    whyUsEyebrow: string;
    whyUsSub: string;
    testimonials: string;
    testimonialsEyebrow: string;
    testimonialsSub: string;
    journal: string;
    journalEyebrow: string;
    journalSub: string;
    viewAllDestinations: string;
    viewAllTours: string;
    viewAllJournal: string;
  };
  card: {
    save: string;
    perPerson: string;
    bookFrom: string;
    advanceBadge: string;
    viewDetails: string;
    days: string;
    nights: string;
    day: string;
    night: string;
  };
  filters: {
    all: string;
    category: string;
    destination: string;
    searchPlaceholder: string;
    filterBy: string;
    packageTour: string;
    carRental: string;
    dayTour: string;
  };
  footer: {
    explore: string;
    company: string;
    support: string;
    destinations: string;
    tourPackages: string;
    travelJournal: string;
    aboutUs: string;
    ourStory: string;
    contact: string;
    planCustomTrip: string;
    specialOffers: string;
    talkToUs: string;
    travelGuides: string;
    howBookingWorks: string;
    paymentQrClearance: string;
    allRightsReserved: string;
    paymentsAccepted: string;
    location: string;
    brandBlurb: string;
    brandSpirit: string;
  };
  about: {
    heroEyebrow: string;
    title: string;
    subtitle: string;
    storyBadge: string;
    storyTitle: string;
    storyParagraphs: string[];
    ourMission: string;
    missionText: string;
    valuesEyebrow: string;
    valuesTitle: string;
    bookingEyebrow: string;
    bookingTitle: string;
    bookingDescription: string;
    hostsEyebrow: string;
    hostsTitle: string;
    paymentBadge: string;
    paymentTitle: string;
    paymentDescription: string;
    paymentCta: string;
    ctaHeadline: string;
    ctaSubheadline: string;
    ctaButton: string;
  };
  journalPage: {
    eyebrow: string;
    title: string;
    description: string;
    featuredBadge: string;
    emptyTitle: string;
    emptyDescription: string;
    readMore: string;
    minRead: string;
    backToJournal: string;
    authorPrefix: string;
    publishedOn: string;
  };
  contact: {
    title: string;
    subtitle: string;
    formTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    tripTypeLabel: string;
    datesLabel: string;
    datesPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    submitButton: string;
    submitting: string;
    successTitle: string;
    successMessage: string;
    officeTitle: string;
    hoursLabel: string;
    hoursValue: string;
  };
  booking: {
    advanceRequired: string;
    dueOnTourDay: string;
    totalAmount: string;
    bookWithAdvance: string;
    qrClearanceNotice: string;
    seatsRemaining: string;
    guaranteedDeparture: string;
  };
  common: {
    currency: string;
    loading: string;
    error: string;
    success: string;
    or: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    nav: {
      destinations: "Destinations",
      tours: "Tours",
      about: "About",
      journal: "Journal",
      contact: "Contact",
      planTrip: "Plan My Trip",
      menu: "Menu",
      close: "Close",
      home: "Home",
      tagline: "domestic tours",
    },
    hero: {
      eyebrow: "Premium domestic tours across Bangladesh",
      headline: "Discover Bangladesh,",
      highlight: "your way",
      subheadline:
        "Curated domestic tours. Trusted local hosts. Book with a small advance and clear the balance on tour day — with complete transparency, every time.",
      exploreTours: "Explore Tours",
      planTrip: "Plan My Trip",
    },
    sections: {
      popularDestinations: "Popular Destinations",
      popularDestinationsEyebrow: "Destinations",
      popularDestinationsSub:
        "Twelve regions. One extraordinary country. Handcrafted routes hosted by verified locals.",
      featuredTours: "Featured Tour Packages",
      featuredToursEyebrow: "Curated Packages",
      featuredToursSub:
        "Guaranteed departures with transparent pricing, verified itineraries, and trusted local hosts.",
      specialOffers: "Limited-Time Offers",
      specialOffersEyebrow: "Special Deals",
      specialOffersSub:
        "Special seasonal discounts and early bird vouchers for your next adventure across Bangladesh.",
      whyUs: "Why Travel With Savar Tour Lover",
      whyUsEyebrow: "The Savar Tour Lover Standard",
      whyUsSub:
        "We built the travel experience we always wanted for ourselves in Bangladesh.",
      testimonials: "Traveler Stories",
      testimonialsEyebrow: "Verified Experiences",
      testimonialsSub:
        "Real stories from travelers who explored the hills, rivers, and shores of Bangladesh with us.",
      journal: "Travel Journal & Guides",
      journalEyebrow: "From the Road",
      journalSub:
        "Field notes, cultural guides, and practical travel advice straight from our local hosts.",
      viewAllDestinations: "All Destinations",
      viewAllTours: "View All Tours",
      viewAllJournal: "Read All Stories",
    },
    card: {
      save: "Save",
      perPerson: "per person",
      bookFrom: "book from",
      advanceBadge: "advance",
      viewDetails: "View Details",
      days: "Days",
      nights: "Nights",
      day: "Day",
      night: "Night",
    },
    filters: {
      all: "All",
      category: "Category",
      destination: "Destination",
      searchPlaceholder: "Search tours, destinations or activities...",
      filterBy: "Filter by",
      packageTour: "Package Tour",
      carRental: "Car / Jeep Rental",
      dayTour: "Day Tour",
    },
    footer: {
      explore: "Explore",
      company: "Company",
      support: "Support",
      destinations: "Destinations",
      tourPackages: "Tour Packages",
      travelJournal: "Travel Journal",
      aboutUs: "About Us",
      ourStory: "Our Story",
      contact: "Contact",
      planCustomTrip: "Plan a Custom Trip",
      specialOffers: "Special Offers",
      talkToUs: "Talk to Us",
      travelGuides: "Travel Guides",
      howBookingWorks: "How Booking Works",
      paymentQrClearance: "Payment & Confirmation",
      allRightsReserved: "All rights reserved.",
      paymentsAccepted: "Payments: bKash · Nagad · Cards",
      location: "Savar, Dhaka, Bangladesh 🇧🇩",
      brandBlurb:
        "Curated domestic tours across Bangladesh — trusted local hosts, transparent pricing, and seamless booking confirmation.",
      brandSpirit: "— আপনার স্বপ্ন উড়তে দিন (Let Your Dreams Fly).",
    },
    about: {
      heroEyebrow: "Our Story",
      title: "Built by people who call Bangladesh home",
      subtitle:
        "Savar Tour Lover was born from a simple belief: Let your dreams fly (আপনার স্বপ্ন উড়তে দিন). Booking a domestic trip shouldn't mean middlemen, vague pricing, and cash changing hands with no record. We host you the way we'd host family.",
      storyBadge: "Where it started",
      storyTitle: "From a shared frustration to a proper agency",
      storyParagraphs: [
        "Most domestic travel in Bangladesh was broken in two ways: either you were on your own navigating erratic transport, unverified hotels, and hidden costs — or you were packed into a thirty-person bus tour with fixed buffets and thirty-minute photo stops.",
        "We wanted something different: trips designed the way an experienced friend would show you their hometown. Small groups, handpicked local hosts, honest pricing, and genuine hospitality.",
        "Today, Savar Tour Lover runs curated journeys across Bangladesh — from the tea valleys of Sreemangal to the hills of Sajek and coral reefs of Saint Martin. Every trip is led by someone who actually lives there.",
      ],
      ourMission: "Our Mission",
      missionText:
        "To connect travelers with authentic, dignified local hosting across every district of Bangladesh — backed by transparent pricing, flexible payments, and human support.",
      valuesEyebrow: "What we stand for",
      valuesTitle: "The values behind every trip",
      bookingEyebrow: "How booking works",
      bookingTitle: "Zero-friction, start to finish",
      bookingDescription:
        "From your first search to your final confirmed payment, every step is designed to remove friction and ambiguity.",
      hostsEyebrow: "The team",
      hostsTitle: "A few of the people who'll host you",
      paymentBadge: "Payment & Confirmation",
      paymentTitle: "How your money is handled, end to end",
      paymentDescription:
        "Pay in full or pay a small advance through bKash, Nagad, Rocket, or card at booking. If you paid partially, the remaining balance is settled on the day of the tour — either online or directly with your local host.",
      paymentCta: "Talk to us",
      ctaHeadline: "Ready to plan your own story?",
      ctaSubheadline:
        "Tell us where you want to go — we'll take it from there, right through to your final confirmed payment.",
      ctaButton: "Plan My Trip",
    },
    journalPage: {
      eyebrow: "Travel Journal",
      title: "Stories from the road",
      description:
        "Field guides, food trails, and honest travel writing from our hosts and guests across Bangladesh.",
      featuredBadge: "Latest story",
      emptyTitle: "No articles published yet",
      emptyDescription:
        "Stories, packing guides, and field notes will appear here once written and published from the Super Admin Panel.",
      readMore: "Read",
      minRead: "min read",
      backToJournal: "Journal",
      authorPrefix: "Author",
      publishedOn: "Published",
    },
    contact: {
      title: "Let's plan your journey.",
      subtitle:
        "Have questions about a destination, want a private custom itinerary, or planning a group retreat? We are here to help.",
      formTitle: "Send an Inquiry",
      nameLabel: "Your Name",
      namePlaceholder: "e.g. Tanvir Ahmed",
      phoneLabel: "Phone Number (WhatsApp preferred)",
      phonePlaceholder: "+880 1XXX-XXXXXX",
      emailLabel: "Email Address",
      emailPlaceholder: "tanvir@example.com",
      tripTypeLabel: "Trip Type",
      datesLabel: "Approximate Travel Dates",
      datesPlaceholder: "e.g. Next month, 3-4 days",
      messageLabel: "Tell us what you have in mind",
      messagePlaceholder: "Destination, group size, special accommodation preferences...",
      submitButton: "Send Inquiry",
      submitting: "Sending...",
      successTitle: "Inquiry Received!",
      successMessage: "Thank you! Our travel planning team will reach out to you on WhatsApp within 2 hours.",
      officeTitle: "Direct Contact",
      hoursLabel: "Support Hours",
      hoursValue: "Every day, 9:00 AM – 9:00 PM (BST)",
    },
    booking: {
      advanceRequired: "Advance Required",
      dueOnTourDay: "Due on Tour Day",
      totalAmount: "Total Amount",
      bookWithAdvance: "Book with Advance",
      qrClearanceNotice: "Pay the remaining balance securely on tour day online or in cash.",
      seatsRemaining: "seats left",
      guaranteedDeparture: "Guaranteed Departure",
    },
    common: {
      currency: "৳",
      loading: "Loading...",
      error: "Something went wrong.",
      success: "Success!",
      or: "or",
    },
  },
  bn: {
    nav: {
      destinations: "গন্তব্য",
      tours: "ট্যুর প্যাকেজ",
      about: "পরিচিতি",
      journal: "ভ্রমণ কথা",
      contact: "যোগাযোগ",
      planTrip: "ভ্রমণ পরিকল্পনা",
      menu: "মেনু",
      close: "বন্ধ",
      home: "মূলপাতা",
      tagline: "অভ্যন্তরীণ ভ্রমণ",
    },
    hero: {
      eyebrow: "সারা বাংলাদেশে প্রিমিয়াম অভ্যন্তরীণ ট্যুর",
      headline: "বাংলাদেশকে আবিষ্কার করুন,",
      highlight: "আপনার মতো করে",
      subheadline:
        "বাছাইকৃত অভ্যন্তরীণ ট্যুর। বিশ্বস্ত স্থানীয় হোস্ট। সামান্য অগ্রিম দিয়ে বুকিং করুন এবং ট্যুরের দিনে বাকি অর্থ পরিশোধ করুন — সম্পূর্ণ স্বচ্ছতায়।",
      exploreTours: "ট্যুর দেখুন",
      planTrip: "পরিকল্পনা করুন",
    },
    sections: {
      popularDestinations: "জনপ্রিয় গন্তব্যসমূহ",
      popularDestinationsEyebrow: "সেরা গন্তব্য",
      popularDestinationsSub:
        "বারোটি অঞ্চল। একটি অনন্য সুন্দর দেশ। স্থানীয় অভিজ্ঞদের তত্ত্বাবধানে সাজানো রুট।",
      featuredTours: "বিশেষ ট্যুর প্যাকেজসমূহ",
      featuredToursEyebrow: "বাছাইকৃত প্যাকেজ",
      featuredToursSub:
        "নিশ্চিত ডিপার্চার, সম্পূর্ণ স্বচ্ছ মূল্য, যাচাইকৃত ভ্রমণসূচি এবং বিশ্বস্ত লোকাল হোস্ট।",
      specialOffers: "বিশেষ অফার ও ছাড়",
      specialOffersEyebrow: "সীমিত সময়ের ডিল",
      specialOffersSub:
        "সারা বাংলাদেশ জুড়ে আপনার পরবর্তী অ্যাডভেঞ্চারের জন্য বিশেষ মৌসুমী ছাড় ও ভাউচার।",
      whyUs: "কেন সাভার ট্যুর লাভার-এর সাথে ভ্রমণ করবেন?",
      whyUsEyebrow: "আমাদের মানদণ্ড",
      whyUsSub:
        "বাংলাদেশে ভ্রমণের ক্ষেত্রে আমরা যেমন নির্ভরযোগ্য সেবা নিজেরা চেয়েছিলাম, সেটাই গড়ে তুলেছি।",
      testimonials: "ভ্রমণকারীদের অভিজ্ঞতা",
      testimonialsEyebrow: "যাচাইকৃত মতামত",
      testimonialsSub:
        "আমাদের সাথে পাহাড়, নদী ও সমুদ্র ঘুরে আসা ভ্রমণকারীদের বাস্তব অভিজ্ঞতার গল্প।",
      journal: "ভ্রমণ গাইড ও ব্লগ",
      journalEyebrow: "পথের গল্প",
      journalSub:
        "স্থানীয় হোস্টদের কাছ থেকে সরাসরি ভ্রমণ টিপস, রুট ও বাস্তব অভিজ্ঞতা।",
      viewAllDestinations: "সব গন্তব্য দেখুন",
      viewAllTours: "সব ট্যুর দেখুন",
      viewAllJournal: "সব গল্প পড়ুন",
    },
    card: {
      save: "সাশ্রয়",
      perPerson: "জনপ্রতি",
      bookFrom: "বুকিং শুরু মাত্র",
      advanceBadge: "অগ্রিমে",
      viewDetails: "বিস্তারিত দেখুন",
      days: "দিন",
      nights: "রাত",
      day: "দিন",
      night: "রাত",
    },
    filters: {
      all: "সব",
      category: "ক্যাটাগরি",
      destination: "গন্তব্য",
      searchPlaceholder: "ট্যুর, গন্তব্য বা রোমাঞ্চকর স্থান খুঁজুন...",
      filterBy: "ফিল্টার করুন",
      packageTour: "প্যাকেজ ট্যুর",
      carRental: "গাড়ি / চাঁন্দের গাড়ি রেন্টাল",
      dayTour: "ডে ট্যুর",
    },
    footer: {
      explore: "এক্সপ্লোর",
      company: "কোম্পানি",
      support: "সহায়তা",
      destinations: "গন্তব্যসমূহ",
      tourPackages: "ট্যুর প্যাকেজ",
      travelJournal: "ভ্রমণ জার্নাল",
      aboutUs: "আমাদের সম্পর্কে",
      ourStory: "আমাদের গল্প",
      contact: "যোগাযোগ",
      planCustomTrip: "কাস্টম ভ্রমণ পরিকল্পনা",
      specialOffers: "বিশেষ অফার",
      talkToUs: "সরাসরি কথা বলুন",
      travelGuides: "ভ্রমণ নির্দেশিকা",
      howBookingWorks: "বুকিং প্রক্রিয়া",
      paymentQrClearance: "পেমেন্ট ও বুকিং নিশ্চিতকরণ",
      allRightsReserved: "সর্বস্বত্ব সংরক্ষিত।",
      paymentsAccepted: "পেমেন্ট মাধ্যম: বিকাশ · নগদ · কার্ডস",
      location: "সাভার, ঢাকা, বাংলাদেশ 🇧🇩",
      brandBlurb:
        "সারা বাংলাদেশে বাছাইকৃত অভ্যন্তরীণ ভ্রমণ — বিশ্বস্ত স্থানীয় হোস্ট, স্বচ্ছ মূল্য এবং নির্বিঘ্ন পেমেন্ট ও বুকিং সুবিধা।",
      brandSpirit: "— আপনার স্বপ্ন উড়তে দিন।",
    },
    about: {
      heroEyebrow: "আমাদের গল্প",
      title: "বাংলাদেশকে ভালোবেসে স্থানীয়দের হাতে গড়া",
      subtitle:
        "সাভার ট্যুর লাভার-এর জন্ম এক সহজ ভাবনা থেকে: আপনার স্বপ্ন উড়তে দিন। দেশে ভ্রমণ করার অর্থ অযথা মধ্যস্থতাকারী, অস্পষ্ট মূল্যতালিকা বা প্রমাণহীন লেনদেন নয়। আমরা আপনাকে ঘরের মানুষের মতোই আতিথেয়তা জানাই।",
      storyBadge: "কোথা থেকে শুরু",
      storyTitle: "একটি সাধারণ অসন্তোষ থেকে এক নির্ভরযোগ্য এজেন্সি",
      storyParagraphs: [
        "বাংলাদেশে সাধারণ অভ্যন্তরীণ ভ্রমণে দুটি সমস্যা প্রধান ছিল: হয় অনিশ্চিত গাড়ি, অপরীক্ষিত হোটেল ও লুকানো খরচে একা ভ্রমণ করতে হতো — অথবা ত্রিশ জনের বাসে নির্ধারিত খাবার আর আধ ঘণ্টার ফটো স্টপে আটকে থাকতে হতো।",
        "আমরা ভিন্ন কিছু চেয়েছিলাম: এমন এক ভ্রমণ, যেখানে একজন অভিজ্ঞ বন্ধু নিজের শহর যেভাবে ঘুরিয়ে দেখান, ঠিক সেভাবে আপনি দেশকে জানবেন। ছোট দল, বাছাইকৃত স্থানীয় হোস্ট, শতভাগ স্বচ্ছ দাম এবং আন্তরিক আতিথেয়তা।",
        "আজ সাভার ট্যুর লাভার সারা বাংলাদেশে যত্নশীল ভ্রমণ পরিচালনা করছে — শ্রীমঙ্গলের চায়ের উপত্যকা থেকে সাজেকের পাহাড় ও সেন্টমার্টিনের প্রবাল দ্বীপ পর্যন্ত। প্রতিটি দলের নেতৃত্ব দেন এমন একজন, যিনি সত্যিকার অর্থে সেই অঞ্চলের মানুষ।",
      ],
      ourMission: "আমাদের লক্ষ্য",
      missionText:
        "বাংলাদেশের প্রতিটি জেলায় ভ্রমণকারীদের সাথে আন্তরিক ও মর্যাদাশীল স্থানীয় হোস্টদের সংযোগ স্থাপন করা — নিশ্চিত স্বচ্ছতা, সহজ পেমেন্ট এবং সার্বক্ষণিক মানবিক সহায়তায়।",
      valuesEyebrow: "আমাদের নীতি",
      valuesTitle: "আমাদের প্রতিটি ট্যুরের মূল ভিত্তি",
      bookingEyebrow: "বুকিং যেভাবে কাজ করে",
      bookingTitle: "সহজ ও ঝামেলামুক্ত অভিজ্ঞতা",
      bookingDescription:
        "প্রথম অনুসন্ধান থেকে শুরু করে কিউআর স্ক্যানে ব্যালেন্স ক্লিয়ারেন্স পর্যন্ত — প্রতিটি ধাপ সাজানো হয়েছে সম্পূর্ণ স্বাচ্ছন্দ্যে।",
      hostsEyebrow: "আমাদের টিম",
      hostsTitle: "ভ্রমণের নেপথ্যে থাকা স্থানীয় হোস্টগণ",
      paymentBadge: "পেমেন্ট ও কিউআর ক্লিয়ারেন্স",
      paymentTitle: "আপনার অর্থের সুরক্ষা ও স্বচ্ছতা",
      paymentDescription:
        "বুকিংয়ের সময় বিকাশ, নগদ, রকেট বা কার্ডে পুরো মূল্য বা ছোট একটি অগ্রিম দিন। বাকি অংশ ট্যুরের দিন কিউআর স্ক্যান বা লগইন করে দিন। সাথে সাথেই উভয় পক্ষ হোয়াটসঅ্যাপ ও ইমেইল নিশ্চয়তা পাবেন।",
      paymentCta: "কথা বলুন",
      ctaHeadline: "নতুন চোখে বাংলাদেশকে দেখতে প্রস্তুত?",
      ctaSubheadline:
        "সাজেকের মেঘের উপত্যকা হোক, সুন্দরবনের রোমাঞ্চ কিংবা সেন্টমার্টিনের নীল জলরাশি — আপনার জন্য চমৎকার রুট প্রস্তুত।",
      ctaButton: "ভ্রমণ পরিকল্পনা করুন",
    },
    journalPage: {
      eyebrow: "ভ্রমণ জার্নাল",
      title: "পথের গল্প ও অভিজ্ঞতা",
      description:
        "আমাদের স্থানীয় হোস্ট ও পর্যটকদের স্বচক্ষে দেখা অভিজ্ঞতা, রোমাঞ্চ, খাদ্য অন্বেষণ ও খাঁটি ফিল্ড নোটস।",
      featuredBadge: "বিশেষ গল্প",
      emptyTitle: "এখনও কোনো গল্প প্রকাশিত হয়নি",
      emptyDescription:
        "সুপার অ্যাডমিন প্যানেল থেকে লেখা ও প্রকাশিত হলে এখানে সব গল্প ও ভ্রমণ নির্দেশিকা দেখা যাবে।",
      readMore: "পড়ুন",
      minRead: "মিনিট পাঠ",
      backToJournal: "ভ্রমণ কথা",
      authorPrefix: "লেখক",
      publishedOn: "প্রকাশের তারিখ",
    },
    contact: {
      title: "চলুন আপনার ভ্রমণের পরিকল্পনা সাজাই।",
      subtitle:
        "কোনো গন্তব্য সম্পর্কে জানতে চান, কাস্টম ট্যুর করতে চান, বা কর্পোরেট ভ্রমণের আয়োজন করছেন? আমরা আপনাকে সাহায্য করতে প্রস্তুত।",
      formTitle: "বার্তা পাঠান",
      nameLabel: "আপনার নাম",
      namePlaceholder: "উদাঃ তানভীর আহমেদ",
      phoneLabel: "ফোন নম্বর (হোয়াটসঅ্যাপ সংযুক্ত)",
      phonePlaceholder: "০১৬২০৫৯২৮৮৪ / ০১৬৪৬৩২৫৩৫০",
      emailLabel: "ইমেইল ঠিকানা",
      emailPlaceholder: "tanvir@example.com",
      tripTypeLabel: "ভ্রমণের ধরন",
      datesLabel: "সম্ভাব্য ভ্রমণের তারিখ",
      datesPlaceholder: "উদাঃ আগামী মাসে, ৩-৪ দিন",
      messageLabel: "আপনার পছন্দের বিস্তারিত বলুন",
      messagePlaceholder: "গন্তব্য, যাত্রীর সংখ্যা, হোটেলের পছন্দ বা বিশেষ কোনো চাওয়া...",
      submitButton: "বার্তা পাঠান",
      submitting: "পাঠানো হচ্ছে...",
      successTitle: "বার্তা পাওয়া গেছে!",
      successMessage: "ধন্যবাদ! আমাদের ট্রাভেল টিম দ্রুত আপনার সাথে হোয়াটসঅ্যাপে যোগাযোগ করবে।",
      officeTitle: "সরাসরি যোগাযোগ",
      hoursLabel: "সহায়তার সময়",
      hoursValue: "প্রতিদিন, সকাল ৯:০০ – রাত ১০:০০",
    },
    booking: {
      advanceRequired: "প্রয়োজনীয় অগ্রিম",
      dueOnTourDay: "ট্যুরের দিনে বাকি প্রদেয়",
      totalAmount: "সর্বমোট মূল্য",
      bookWithAdvance: "অগ্রিম পরিশোধ করে বুক করুন",
      qrClearanceNotice: "ট্যুরের দিনে অনলাইনে অথবা সরাসরি হোস্টকে বাকি অর্থ নিরাপদে পরিশোধ করুন।",
      seatsRemaining: "আসন বাকি",
      guaranteedDeparture: "নিশ্চিত ডিপার্চার",
    },
    common: {
      currency: "৳",
      loading: "লোড হচ্ছে...",
      error: "একটি ত্রুটি ঘটেছে।",
      success: "সফল হয়েছে!",
      or: "অথবা",
    },
  },
};

const BENGALI_DIGITS: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export function toBengaliNumber(val: number | string): string {
  return String(val).replace(/[0-9]/g, (digit) => BENGALI_DIGITS[digit] || digit);
}
