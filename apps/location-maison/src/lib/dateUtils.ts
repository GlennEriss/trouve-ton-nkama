// Utilitaires pour la gestion des dates

export function parseDateString(dateString: string): { day: string; month: string; year: string } | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return null;
  }

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear())
  };
}

export function formatDateObject(dateObj: { day: string; month: string; year: string }): string {
  if (!dateObj || !dateObj.day || !dateObj.month || !dateObj.year) {
    return '';
  }
  return `${dateObj.year}-${dateObj.month}-${dateObj.day}`;
}

// Fonction pour calculer l'âge
export function calculateAge(day: string, month: string, year: string): number {
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  
  const birthDate = new Date(yearNum, monthNum - 1, dayNum);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Fonction pour vérifier si une date est valide
export function isValidDate(day: string, month: string, year: string): boolean {
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  
  const date = new Date(yearNum, monthNum - 1, dayNum);
  return date.getFullYear() === yearNum && 
         date.getMonth() === monthNum - 1 && 
         date.getDate() === dayNum;
}

// Fonction pour obtenir le nombre de jours dans un mois
export function getDaysInMonth(month: string, year: string): number {
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  
  if (!monthNum || !yearNum) return 31; // Valeur par défaut
  
  // Février a des jours spéciaux selon l'année bissextile
  if (monthNum === 2) {
    const isLeapYear = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
    return isLeapYear ? 29 : 28;
  }
  
  // Mois avec 30 jours (Avril, Juin, Septembre, Novembre)
  if ([4, 6, 9, 11].includes(monthNum)) {
    return 30;
  }
  
  // Mois avec 31 jours (Janvier, Mars, Mai, Juillet, Août, Octobre, Décembre)
  return 31;
}

// Fonction pour vérifier si une année est bissextile
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
} 