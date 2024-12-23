export function firebaseTimestampToDate(seconds?: number, nanoseconds?: number): Date | null {
    if (seconds === undefined || nanoseconds === undefined) {
        return null; // Si l'un des deux est manquant, retourne null
    }
    const milliseconds = seconds * 1000 + Math.floor(nanoseconds / 1e6); // Convertit les nanosecondes en millisecondes
    return new Date(milliseconds);
}