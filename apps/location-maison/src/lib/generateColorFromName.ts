export function generateColorFromName(name: string | undefined): string {
    if (!name) return '#ccc'; // Couleur par défaut si aucun nom
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 80%)`; // Couleur en HSL pour des tons pastel
    return color;
}