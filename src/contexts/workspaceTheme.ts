import type { Workspace } from "@/types/workspace";

const DEFAULT_WORKSPACE_COLORS = {
  primary: "#64a42e",
  secondary: "#4a7a22",
  accent: "#8bc34a",
};

const DEFAULT_THEME = {
  "--workspace-primary": DEFAULT_WORKSPACE_COLORS.primary,
  "--workspace-secondary": DEFAULT_WORKSPACE_COLORS.secondary,
  "--workspace-accent": DEFAULT_WORKSPACE_COLORS.accent,
  "--workspace-logo": "/logo.png",
};

const DEFAULT_PALETTE_VARIABLES: Record<string, string> = {
  "--palette-white": "255 255 255",
  "--palette-black": "0 0 0",

  "--palette-agri-green-50": "240 249 240",
  "--palette-agri-green-100": "220 241 220",
  "--palette-agri-green-200": "188 227 188",
  "--palette-agri-green-300": "142 206 142",
  "--palette-agri-green-400": "97 180 97",
  "--palette-agri-green-500": "60 149 60",
  "--palette-agri-green-600": "46 120 46",
  "--palette-agri-green-700": "39 97 39",
  "--palette-agri-green-800": "34 77 34",
  "--palette-agri-green-900": "30 64 30",
  "--palette-agri-green-950": "12 34 12",

  "--palette-green-50": "240 253 244",
  "--palette-green-100": "220 252 231",
  "--palette-green-200": "187 247 208",
  "--palette-green-300": "134 239 172",
  "--palette-green-400": "74 222 128",
  "--palette-green-500": "34 197 94",
  "--palette-green-600": "22 163 74",
  "--palette-green-700": "21 128 61",
  "--palette-green-800": "22 101 52",
  "--palette-green-900": "20 83 45",
  "--palette-green-950": "5 46 22",

  "--palette-amber-50": "255 251 235",
  "--palette-amber-100": "254 243 199",
  "--palette-amber-200": "253 230 138",
  "--palette-amber-300": "252 211 77",
  "--palette-amber-400": "251 191 36",
  "--palette-amber-500": "245 158 11",
  "--palette-amber-600": "217 119 6",
  "--palette-amber-700": "180 83 9",
  "--palette-amber-800": "146 64 14",
  "--palette-amber-900": "120 53 15",
  "--palette-amber-950": "69 26 3",

  "--palette-red-50": "254 242 242",
  "--palette-red-100": "254 226 226",
  "--palette-red-200": "254 202 202",
  "--palette-red-300": "252 165 165",
  "--palette-red-400": "248 113 113",
  "--palette-red-500": "239 68 68",
  "--palette-red-600": "220 38 38",
  "--palette-red-700": "185 28 28",
  "--palette-red-800": "153 27 27",
  "--palette-red-900": "127 29 29",
  "--palette-red-950": "69 10 10",

  "--palette-yellow-50": "254 252 232",
  "--palette-yellow-100": "254 249 195",
  "--palette-yellow-200": "254 240 138",
  "--palette-yellow-300": "253 224 71",
  "--palette-yellow-400": "250 204 21",
  "--palette-yellow-500": "234 179 8",
  "--palette-yellow-600": "202 138 4",
  "--palette-yellow-700": "161 98 7",
  "--palette-yellow-800": "133 77 14",
  "--palette-yellow-900": "113 63 18",
  "--palette-yellow-950": "66 32 6",

  "--palette-orange-50": "255 247 237",
  "--palette-orange-100": "255 237 213",
  "--palette-orange-200": "254 215 170",
  "--palette-orange-300": "253 186 116",
  "--palette-orange-400": "251 146 60",
  "--palette-orange-500": "249 115 22",
  "--palette-orange-600": "234 88 12",
  "--palette-orange-700": "194 65 12",
  "--palette-orange-800": "154 52 18",
  "--palette-orange-900": "124 45 18",
  "--palette-orange-950": "67 20 7",

  "--palette-indigo-50": "238 242 255",
  "--palette-indigo-100": "224 231 255",
  "--palette-indigo-200": "199 210 254",
  "--palette-indigo-300": "165 180 252",
  "--palette-indigo-400": "129 140 248",
  "--palette-indigo-500": "99 102 241",
  "--palette-indigo-600": "79 70 229",
  "--palette-indigo-700": "67 56 202",
  "--palette-indigo-800": "55 48 163",
  "--palette-indigo-900": "49 46 129",
  "--palette-indigo-950": "30 27 75",

  "--palette-purple-50": "250 245 255",
  "--palette-purple-100": "243 232 255",
  "--palette-purple-200": "233 213 255",
  "--palette-purple-300": "216 180 254",
  "--palette-purple-400": "192 132 252",
  "--palette-purple-500": "168 85 247",
  "--palette-purple-600": "147 51 234",
  "--palette-purple-700": "126 34 206",
  "--palette-purple-800": "107 33 168",
  "--palette-purple-900": "88 28 135",
  "--palette-purple-950": "59 7 100",

  "--palette-violet-50": "245 243 255",
  "--palette-violet-100": "237 233 254",
  "--palette-violet-200": "221 214 254",
  "--palette-violet-300": "196 181 253",
  "--palette-violet-400": "167 139 250",
  "--palette-violet-500": "139 92 246",
  "--palette-violet-600": "124 58 237",
  "--palette-violet-700": "109 40 217",
  "--palette-violet-800": "91 33 182",
  "--palette-violet-900": "76 29 149",
  "--palette-violet-950": "46 16 101",

  "--palette-fuchsia-50": "253 244 255",
  "--palette-fuchsia-100": "250 232 255",
  "--palette-fuchsia-200": "245 208 254",
  "--palette-fuchsia-300": "240 171 252",
  "--palette-fuchsia-400": "232 121 249",
  "--palette-fuchsia-500": "217 70 239",
  "--palette-fuchsia-600": "192 38 211",
  "--palette-fuchsia-700": "162 28 175",
  "--palette-fuchsia-800": "134 25 143",
  "--palette-fuchsia-900": "112 26 117",
  "--palette-fuchsia-950": "74 4 78",

  "--palette-pink-50": "253 242 248",
  "--palette-pink-100": "252 231 243",
  "--palette-pink-200": "251 207 232",
  "--palette-pink-300": "249 168 212",
  "--palette-pink-400": "244 114 182",
  "--palette-pink-500": "236 72 153",
  "--palette-pink-600": "219 39 119",
  "--palette-pink-700": "190 24 93",
  "--palette-pink-800": "157 23 77",
  "--palette-pink-900": "131 24 67",
  "--palette-pink-950": "80 7 36",

  "--palette-teal-50": "240 253 250",
  "--palette-teal-100": "204 251 241",
  "--palette-teal-200": "153 246 228",
  "--palette-teal-300": "94 234 212",
  "--palette-teal-400": "45 212 191",
  "--palette-teal-500": "20 184 166",
  "--palette-teal-600": "13 148 136",
  "--palette-teal-700": "15 118 110",
  "--palette-teal-800": "17 94 89",
  "--palette-teal-900": "19 78 74",
  "--palette-teal-950": "4 47 46",

  "--palette-emerald-50": "236 253 245",
  "--palette-emerald-100": "209 250 229",
  "--palette-emerald-200": "167 243 208",
  "--palette-emerald-300": "110 231 183",
  "--palette-emerald-400": "52 211 153",
  "--palette-emerald-500": "16 185 129",
  "--palette-emerald-600": "5 150 105",
  "--palette-emerald-700": "4 120 87",
  "--palette-emerald-800": "6 95 70",
  "--palette-emerald-900": "6 78 59",
  "--palette-emerald-950": "2 44 34",

  "--palette-lime-50": "247 254 231",
  "--palette-lime-100": "236 252 203",
  "--palette-lime-200": "217 249 157",
  "--palette-lime-300": "190 242 100",
  "--palette-lime-400": "163 230 53",
  "--palette-lime-500": "132 204 22",
  "--palette-lime-600": "101 163 13",
  "--palette-lime-700": "77 124 15",
  "--palette-lime-800": "63 98 18",
  "--palette-lime-900": "54 83 20",
  "--palette-lime-950": "26 46 5",

  "--palette-cyan-50": "236 254 255",
  "--palette-cyan-100": "207 250 254",
  "--palette-cyan-200": "165 243 252",
  "--palette-cyan-300": "103 232 249",
  "--palette-cyan-400": "34 211 238",
  "--palette-cyan-500": "6 182 212",
  "--palette-cyan-600": "8 145 178",
  "--palette-cyan-700": "14 116 144",
  "--palette-cyan-800": "21 94 117",
  "--palette-cyan-900": "22 78 99",
  "--palette-cyan-950": "8 51 68",

  "--palette-sky-50": "240 249 255",
  "--palette-sky-100": "224 242 254",
  "--palette-sky-200": "186 230 253",
  "--palette-sky-300": "125 211 252",
  "--palette-sky-400": "56 189 248",
  "--palette-sky-500": "14 165 233",
  "--palette-sky-600": "2 132 199",
  "--palette-sky-700": "3 105 161",
  "--palette-sky-800": "7 89 133",
  "--palette-sky-900": "12 74 110",
  "--palette-sky-950": "8 47 73",

  "--palette-slate-50": "248 250 252",
  "--palette-slate-100": "241 245 249",
  "--palette-slate-200": "226 232 240",
  "--palette-slate-300": "203 213 225",
  "--palette-slate-400": "148 163 184",
  "--palette-slate-500": "100 116 139",
  "--palette-slate-600": "71 85 105",
  "--palette-slate-700": "51 65 85",
  "--palette-slate-800": "30 41 59",
  "--palette-slate-900": "15 23 42",
  "--palette-slate-950": "2 6 23",

  "--palette-zinc-50": "250 250 250",
  "--palette-zinc-100": "244 244 245",
  "--palette-zinc-200": "228 228 231",
  "--palette-zinc-300": "212 212 216",
  "--palette-zinc-400": "161 161 170",
  "--palette-zinc-500": "113 113 122",
  "--palette-zinc-600": "82 82 91",
  "--palette-zinc-700": "63 63 70",
  "--palette-zinc-800": "39 39 42",
  "--palette-zinc-900": "24 24 27",
  "--palette-zinc-950": "9 9 11",

  "--palette-stone-50": "250 250 249",
  "--palette-stone-100": "245 245 244",
  "--palette-stone-200": "231 229 228",
  "--palette-stone-300": "214 211 209",
  "--palette-stone-400": "168 162 158",
  "--palette-stone-500": "120 113 108",
  "--palette-stone-600": "87 83 78",
  "--palette-stone-700": "68 64 60",
  "--palette-stone-800": "41 37 36",
  "--palette-stone-900": "28 25 23",
  "--palette-stone-950": "12 10 9",

  "--palette-rose-50": "255 241 242",
  "--palette-rose-100": "255 228 230",
  "--palette-rose-200": "254 205 211",
  "--palette-rose-300": "253 164 175",
  "--palette-rose-400": "251 113 133",
  "--palette-rose-500": "244 63 94",
  "--palette-rose-600": "225 29 72",
  "--palette-rose-700": "190 18 60",
  "--palette-rose-800": "159 18 57",
  "--palette-rose-900": "136 19 55",
  "--palette-rose-950": "76 5 25",

  "--palette-blue-50": "239 246 255",
  "--palette-blue-100": "219 234 254",
  "--palette-blue-200": "191 219 254",
  "--palette-blue-300": "147 197 253",
  "--palette-blue-400": "96 165 250",
  "--palette-blue-500": "59 130 246",
  "--palette-blue-600": "37 99 235",
  "--palette-blue-700": "29 78 216",
  "--palette-blue-800": "30 64 175",
  "--palette-blue-900": "30 58 138",
  "--palette-blue-950": "23 37 84",

  "--palette-gray-50": "249 250 251",
  "--palette-gray-100": "243 244 246",
  "--palette-gray-200": "229 231 235",
  "--palette-gray-300": "209 213 219",
  "--palette-gray-400": "156 163 175",
  "--palette-gray-500": "107 114 128",
  "--palette-gray-600": "75 85 99",
  "--palette-gray-700": "55 65 81",
  "--palette-gray-800": "31 41 55",
  "--palette-gray-900": "17 24 39",
  "--palette-gray-950": "3 7 18",

  "--palette-neutral-50": "250 250 250",
  "--palette-neutral-100": "245 245 245",
  "--palette-neutral-200": "229 229 229",
  "--palette-neutral-300": "212 212 212",
  "--palette-neutral-400": "163 163 163",
  "--palette-neutral-500": "115 115 115",
  "--palette-neutral-600": "82 82 82",
  "--palette-neutral-700": "64 64 64",
  "--palette-neutral-800": "38 38 38",
  "--palette-neutral-900": "23 23 23",
  "--palette-neutral-950": "10 10 10",
};

class RgbColor {
  public readonly r: number;
  public readonly g: number;
  public readonly b: number;

  constructor(r: number, g: number, b: number) {
    this.r = RgbColor.clampChannel(r);
    this.g = RgbColor.clampChannel(g);
    this.b = RgbColor.clampChannel(b);
  }

  public static fromHex(value: string): RgbColor | null {
    const normalized = value.trim().replace("#", "");
    if (normalized.length === 3) {
      const r = parseInt(normalized[0] + normalized[0], 16);
      const g = parseInt(normalized[1] + normalized[1], 16);
      const b = parseInt(normalized[2] + normalized[2], 16);
      return new RgbColor(r, g, b);
    }

    if (normalized.length === 6) {
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      return new RgbColor(r, g, b);
    }

    return null;
  }

  public mix(other: RgbColor, ratio: number): RgbColor {
    const clampedRatio = Math.min(Math.max(ratio, 0), 1);
    const r = this.r * (1 - clampedRatio) + other.r * clampedRatio;
    const g = this.g * (1 - clampedRatio) + other.g * clampedRatio;
    const b = this.b * (1 - clampedRatio) + other.b * clampedRatio;
    return new RgbColor(Math.round(r), Math.round(g), Math.round(b));
  }

  public toCssChannels(): string {
    return `${this.r} ${this.g} ${this.b}`;
  }

  private static clampChannel(value: number): number {
    return Math.min(Math.max(Math.round(value), 0), 255);
  }
}

const WHITE_RGB = new RgbColor(255, 255, 255);
const BLACK_RGB = new RgbColor(0, 0, 0);

const SHADE_STOPS: Array<{ shade: number; mix: RgbColor; ratio: number }> = [
  { shade: 50, mix: WHITE_RGB, ratio: 0.92 },
  { shade: 100, mix: WHITE_RGB, ratio: 0.8 },
  { shade: 200, mix: WHITE_RGB, ratio: 0.6 },
  { shade: 300, mix: WHITE_RGB, ratio: 0.4 },
  { shade: 400, mix: WHITE_RGB, ratio: 0.2 },
  { shade: 500, mix: WHITE_RGB, ratio: 0 },
  { shade: 600, mix: BLACK_RGB, ratio: 0.15 },
  { shade: 700, mix: BLACK_RGB, ratio: 0.3 },
  { shade: 800, mix: BLACK_RGB, ratio: 0.45 },
  { shade: 900, mix: BLACK_RGB, ratio: 0.6 },
  { shade: 950, mix: BLACK_RGB, ratio: 0.75 },
];

class ColorScale {
  private readonly base: RgbColor;

  constructor(base: RgbColor) {
    this.base = base;
  }

  public toPaletteVariables(prefix: string): Record<string, string> {
    return SHADE_STOPS.reduce<Record<string, string>>((acc, stop) => {
      const mixed = this.base.mix(stop.mix, stop.ratio);
      acc[`--palette-${prefix}-${stop.shade}`] = mixed.toCssChannels();
      return acc;
    }, {});
  }

  public getShade(shade: number): RgbColor {
    const stop = SHADE_STOPS.find((s) => s.shade === shade);
    if (!stop) {
      return this.base;
    }
    return this.base.mix(stop.mix, stop.ratio);
  }
}

export class WorkspaceThemeController {
  private workspace: Workspace | null;

  constructor(workspace: Workspace | null) {
    this.workspace = workspace;
  }

  public getThemeVariables(): Record<string, string> {
    if (!this.workspace) {
      return {
        ...DEFAULT_THEME,
        ...DEFAULT_PALETTE_VARIABLES,
      };
    }

    const primary = this.getWorkspaceColor(
      this.workspace.primaryColor,
      DEFAULT_WORKSPACE_COLORS.primary
    );
    const primaryScale = new ColorScale(primary);
    const paletteVars = primaryScale.toPaletteVariables("agri-green");

    // Generate accent colors from primary color scale
    // accent = light background (100 shade)
    // accent-foreground = dark text (700 shade)
    const accentRgb = primaryScale.getShade(100);
    const accentForegroundRgb = primaryScale.getShade(700);

    return {
      "--workspace-primary":
        this.workspace.primaryColor ?? DEFAULT_THEME["--workspace-primary"],
      "--workspace-secondary":
        this.workspace.secondaryColor ?? DEFAULT_THEME["--workspace-secondary"],
      "--workspace-accent":
        this.workspace.accentColor ?? DEFAULT_THEME["--workspace-accent"],
      "--workspace-logo":
        this.workspace.logoUrl ?? DEFAULT_THEME["--workspace-logo"],
      // Set accent colors for focus states using RGB format
      "--accent": `rgb(${accentRgb.toCssChannels()})`,
      "--accent-foreground": `rgb(${accentForegroundRgb.toCssChannels()})`,
      ...paletteVars,
    };
  }


  private getWorkspaceColor(
    value: string | null | undefined,
    fallback: string
  ): RgbColor {
    const parsed = value ? RgbColor.fromHex(value) : null;
    if (parsed) {
      return parsed;
    }

    return RgbColor.fromHex(fallback) ?? new RgbColor(0, 0, 0);
  }
}
