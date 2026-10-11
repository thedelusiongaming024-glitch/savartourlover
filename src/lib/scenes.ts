import type { SceneKey } from "@/lib/types";

export interface SceneDefinition {
  key: SceneKey;
  name: string;
  /** CSS background for the atmosphere scene */
  background: string;
  /** Accent colour used for decorative overlays */
  accent: string;
  /** Secondary accent used in the gradient composition */
  accentAlt: string;
  /** Optional subtle motif label shown on the scene */
  motif?: string;
}

export const scenes: Record<SceneKey, SceneDefinition> = {
  coxsbazar: {
    key: "coxsbazar",
    name: "Cox's Bazar",
    background:
      "linear-gradient(135deg, #F9B44C 0%, #F07B4F 32%, #C94B5E 58%, #7B4B7A 80%, #3F5E7E 100%)",
    accent: "#F9B44C",
    accentAlt: "#C94B5E",
    motif: "Sea & Sunset",
  },
  stmartins: {
    key: "stmartins",
    name: "Saint Martin's Island",
    background:
      "linear-gradient(160deg, #6BD5E1 0%, #4FB3D8 34%, #3C8FC8 62%, #2E6FA8 86%, #3A5E8C 100%)",
    accent: "#6BD5E1",
    accentAlt: "#2E6FA8",
    motif: "Coral Island",
  },
  sundarbans: {
    key: "sundarbans",
    name: "Sundarbans",
    background:
      "linear-gradient(140deg, #7FBE6B 0%, #4E8F5A 30%, #2F6B4F 55%, #1E4E44 78%, #17382F 100%)",
    accent: "#7FBE6B",
    accentAlt: "#1E4E44",
    motif: "Mangrove Kingdom",
  },
  sylhet: {
    key: "sylhet",
    name: "Sylhet",
    background:
      "linear-gradient(150deg, #B7D98B 0%, #7FBF72 28%, #4E9E63 52%, #2F7D56 76%, #245C4A 100%)",
    accent: "#B7D98B",
    accentAlt: "#2F7D56",
    motif: "Tea Gardens",
  },
  ratargul: {
    key: "ratargul",
    name: "Ratargul Swamp Forest",
    background:
      "linear-gradient(150deg, #9AD0B2 0%, #5FAF8D 30%, #3A8A74 55%, #2A665A 80%, #1D4F47 100%)",
    accent: "#9AD0B2",
    accentAlt: "#3A8A74",
    motif: "Swamp Forest",
  },
  jaflong: {
    key: "jaflong",
    name: "Jaflong",
    background:
      "linear-gradient(145deg, #B8E0C8 0%, #7EC79A 30%, #4FA274 58%, #3A7A5C 82%, #2C5A48 100%)",
    accent: "#B8E0C8",
    accentAlt: "#4FA274",
    motif: "River & Stones",
  },
  bandarban: {
    key: "bandarban",
    name: "Bandarban",
    background:
      "linear-gradient(150deg, #A9C7C2 0%, #7FA79F 28%, #55807C 52%, #3B5F60 78%, #2C4A4F 100%)",
    accent: "#A9C7C2",
    accentAlt: "#55807C",
    motif: "Hill Tracts",
  },
  rangamati: {
    key: "rangamati",
    name: "Rangamati",
    background:
      "linear-gradient(145deg, #8FCEB8 0%, #54A890 32%, #32826F 58%, #25605A 82%, #1D4A47 100%)",
    accent: "#8FCEB8",
    accentAlt: "#32826F",
    motif: "Lake City",
  },
  sajek: {
    key: "sajek",
    name: "Sajek Valley",
    background:
      "linear-gradient(155deg, #BFC7CF 0%, #93A7B6 24%, #6E8CA4 46%, #4F6E86 68%, #3B5468 88%, #2E4252 100%)",
    accent: "#BFC7CF",
    accentAlt: "#6E8CA4",
    motif: "Kingdom of Clouds",
  },
  kuakata: {
    key: "kuakata",
    name: "Kuakata",
    background:
      "linear-gradient(140deg, #F6C86B 0%, #E79A4F 28%, #C96A4E 55%, #8F4A5E 80%, #5C4A66 100%)",
    accent: "#F6C86B",
    accentAlt: "#C96A4E",
    motif: "Sea of Sunsets",
  },
  srimangal: {
    key: "srimangal",
    name: "Srimangal",
    background:
      "linear-gradient(150deg, #C2DE93 0%, #8CC474 30%, #5AA566 56%, #3B8058 80%, #2A5F4A 100%)",
    accent: "#C2DE93",
    accentAlt: "#5AA566",
    motif: "Tea Capital",
  },
  sonargaon: {
    key: "sonargaon",
    name: "Sonargaon",
    background:
      "linear-gradient(150deg, #E4C17B 0%, #C9A062 30%, #9E7C58 55%, #705A50 80%, #51454A 100%)",
    accent: "#E4C17B",
    accentAlt: "#9E7C58",
    motif: "Lost Capital",
  },
  paharpur: {
    key: "paharpur",
    name: "Paharpur",
    background:
      "linear-gradient(150deg, #D99A64 0%, #B97A52 28%, #8F5E4A 52%, #6B4A44 78%, #4F3B3E 100%)",
    accent: "#D99A64",
    accentAlt: "#8F5E4A",
    motif: "Ancient Monastery",
  },
  dhaka: {
    key: "dhaka",
    name: "Dhaka",
    background:
      "linear-gradient(150deg, #E2B24B 0%, #C4893F 26%, #965E4A 50%, #6B4A58 76%, #4A3E5E 100%)",
    accent: "#E2B24B",
    accentAlt: "#965E4A",
    motif: "City of Rickshaws",
  },
  khulna: {
    key: "khulna",
    name: "Khulna Delta",
    background:
      "linear-gradient(150deg, #9CC58E 0%, #6BA46F 30%, #437E5C 55%, #2D5F4C 80%, #1F463C 100%)",
    accent: "#9CC58E",
    accentAlt: "#437E5C",
    motif: "Delta Gateway",
  },
};

export function getScene(key: SceneKey): SceneDefinition {
  return scenes[key];
}
