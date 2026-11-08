export const BANGLA_DESTINATION_MAP: Record<string, string> = {
  bandarban: "বান্দরবান",
  sundarbans: "সুন্দরবন",
  sundarban: "সুন্দরবন",
  sajek: "সাজেক",
  "sajek-valley": "সাজেক",
  coxsbazar: "কক্সবাজার",
  "coxs-bazar": "কক্সবাজার",
  "cox's bazar": "কক্সবাজার",
  stmartins: "সেন্টমার্টিন",
  "st-martins": "সেন্টমার্টিন",
  "saint-martin": "সেন্টমার্টিন",
  sylhet: "সিলেট",
  srimangal: "শ্রীমঙ্গল",
  sreemangal: "শ্রীমঙ্গল",
  rangamati: "রাঙ্গামাটি",
  kuakata: "কুয়াকাটা",
  ratargul: "রাতারগুল",
  jaflong: "জাফলং",
  khagrachari: "খাগড়াছড়ি",
  tanguar: "টাঙ্গুয়ার হাওর",
  "tanguar-haor": "টাঙ্গুয়ার হাওর",
  paharpur: "পাহাড়পুর",
  sonargaon: "সোনারগাঁও",
  dhaka: "ঢাকা",
  khulna: "খুলনা",
  chattogram: "চট্টগ্রাম",
  barishal: "বরিশাল",
  rajshahi: "রাজশাহী",
};

export function getBanglaWatermark(
  tourTitle?: string,
  destinationSlug?: string,
  destinationName?: string,
  destinationBn?: string
): string {
  if (destinationBn && destinationBn.trim().length > 0) {
    return destinationBn.trim();
  }

  const slug = (destinationSlug || "").toLowerCase().trim();
  if (slug && BANGLA_DESTINATION_MAP[slug]) {
    return BANGLA_DESTINATION_MAP[slug];
  }

  const destLower = (destinationName || "").toLowerCase();
  for (const [key, val] of Object.entries(BANGLA_DESTINATION_MAP)) {
    if (destLower.includes(key)) {
      return val;
    }
  }

  const titleLower = (tourTitle || "").toLowerCase();
  for (const [key, val] of Object.entries(BANGLA_DESTINATION_MAP)) {
    if (titleLower.includes(key)) {
      return val;
    }
  }

  return destinationName || "ট্যুর";
}
