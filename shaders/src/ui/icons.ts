import RANDOM_SVG from "../random.svg?raw";
import SPARKLE_SVG from "../sparkle.svg?raw";
import KEY_SPACE_SVG from "../key-space.svg?raw";
import KEY_R_SVG from "../key-r.svg?raw";
import KEY_BRACKET_SVG from "../key-bracket.svg?raw";
import VALUE_SVG from "../algo-icons/value.svg?raw";
import GRADIENT_SVG from "../algo-icons/gradient.svg?raw";
import RIDGED_SVG from "../algo-icons/ridged.svg?raw";
import BILLOW_SVG from "../algo-icons/billow.svg?raw";
import CELLULAR_SVG from "../algo-icons/cellular.svg?raw";
import BLEND1_SVG from "../algo-icons/blend1-icon.svg?raw";
import BLEND2_SVG from "../algo-icons/blend2-icon.svg?raw";
import BLEND3_SVG from "../algo-icons/blend3-icon.svg?raw";
import BLEND4_SVG from "../algo-icons/blend4-icon.svg?raw";

// The source files are authored with a hard black fill; swapping to
// currentColor lets each use site tint them from CSS.
function inherit(svg: string): string {
    return svg.replace(/fill="black"/g, 'fill="currentColor"');
}

// Noise-type swatches. Unlike the glyph icons these are multi-tone artwork of
// the pattern itself, so they are used verbatim — tinting would flatten them.
export const ALGO_ICONS: Record<string, string> = {
    value: VALUE_SVG,
    gradient: GRADIENT_SVG,
    ridged: RIDGED_SVG,
    billow: BILLOW_SVG,
    cellular: CELLULAR_SVG,
    // blend modes — the lens colour in each diagram is the giveaway:
    // white lens = lightening (dodge), grey = contrast mix (overlay),
    // black = darkening (burn), subtle white = gentle lift (soft light)
    "color dodge": BLEND1_SVG,
    overlay: BLEND2_SVG,
    "color burn": BLEND3_SVG,
    screen: BLEND4_SVG
};

export const ICON_RANDOM = inherit(RANDOM_SVG);
export const ICON_SPARKLE = inherit(SPARKLE_SVG);
export const KEY_SPACE = inherit(KEY_SPACE_SVG);
export const KEY_R = inherit(KEY_R_SVG);
export const KEY_BRACKET = inherit(KEY_BRACKET_SVG);
