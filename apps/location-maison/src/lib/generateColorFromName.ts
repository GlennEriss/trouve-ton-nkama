export function generateColorFromName(name: string | undefined): string {
    if (!name) return '#ccc'; // Couleur par défaut si aucun nom
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 80%)`; // Couleur en HSL pour des tons pastel
    return color;
}

export function nameToColorHex(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Gamme de teintes (exclut rouge, jaune, vert, blanc)
    const allowedHues = [200, 220, 240, 260, 280, 300]; // bleu-violet-cyan
    const hue = allowedHues[Math.abs(hash) % allowedHues.length];

    // HSL → RGB → HEX
    const saturation = 0.6;
    const lightness = 0.6;

    function hslToRgb(h: number, s: number, l: number) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (h < 60) [r, g, b] = [c, x, 0];
        else if (h < 120) [r, g, b] = [x, c, 0];
        else if (h < 180) [r, g, b] = [0, c, x];
        else if (h < 240) [r, g, b] = [0, x, c];
        else if (h < 300) [r, g, b] = [x, 0, c];
        else [r, g, b] = [c, 0, x];

        const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return hslToRgb(hue, saturation, lightness);
}