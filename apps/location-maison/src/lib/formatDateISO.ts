export function formatDateISO(dateString?: string): string | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Sépare la date de l'heure et retourne uniquement la partie date
}