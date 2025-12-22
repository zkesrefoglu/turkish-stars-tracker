// Competition name to logo path mapping
const competitionLogos: Record<string, string> = {
  // Leagues
  "Premier League": "/logos/leagues/premier-league.jpg",
  "La Liga": "/logos/leagues/la-liga.jpg",
  "LaLiga": "/logos/leagues/la-liga.jpg",
  "Serie A": "/logos/leagues/serie-a.jpg",
  "Bundesliga": "/logos/leagues/bundesliga.jpg",
  "Ligue 1": "/logos/leagues/ligue-1.jpg",
  "Süper Lig": "/logos/leagues/super-lig.jpg",
  "Super Lig": "/logos/leagues/super-lig.jpg",
  "Turkish Super Lig": "/logos/leagues/super-lig.jpg",
  "Trendyol Süper Lig": "/logos/leagues/super-lig.jpg",
  "NBA": "/logos/leagues/nba.jpg",
  "Primeira Liga": "/logos/leagues/primeira-liga.png",
  "Liga Portugal": "/logos/leagues/primeira-liga.png",
  "Liga Portugal Betclic": "/logos/leagues/primeira-liga.png",
  "Saudi Pro League": "/logos/leagues/saudi-pro-league.jpg",
  "Roshn Saudi League": "/logos/leagues/saudi-pro-league.jpg",
  "RSL": "/logos/leagues/saudi-pro-league.jpg",
  
  // UEFA Competitions
  "UEFA Champions League": "/logos/cups/champions-league.jpg",
  "Champions League": "/logos/cups/champions-league.jpg",
  "UCL": "/logos/cups/champions-league.jpg",
  "UEFA Europa League": "/logos/cups/europa-league.jpg",
  "Europa League": "/logos/cups/europa-league.jpg",
  "UEL": "/logos/cups/europa-league.jpg",
  "UEFA Conference League": "/logos/cups/conference-league.jpg",
  "Conference League": "/logos/cups/conference-league.jpg",
  "UECL": "/logos/cups/conference-league.jpg",
  "UEFA Nations League": "/logos/cups/nations-league.jpg",
  "Nations League": "/logos/cups/nations-league.jpg",
  "UEFA Super Cup": "/logos/cups/uefa-super-cup.jpg",
  
  // Domestic Cups
  "FA Cup": "/logos/cups/fa-cup.jpg",
  "Emirates FA Cup": "/logos/cups/fa-cup.jpg",
  "Coppa Italia": "/logos/cups/coppa-italia.jpg",
  "Copa del Rey": "/logos/cups/copa-del-rey.png",
  "DFB Pokal": "/logos/cups/dfb-pokal.jpg",
  "DFB-Pokal": "/logos/cups/dfb-pokal.jpg",
  "Coupe de France": "/logos/cups/coupe-de-france.jpg",
  "Türkiye Kupası": "/logos/cups/turkiye-kupasi.jpg",
  "Turkish Cup": "/logos/cups/turkiye-kupasi.jpg",
  "Ziraat Turkish Cup": "/logos/cups/turkiye-kupasi.jpg",
  
  // Super Cups
  "Supercopa de España": "/logos/cups/supercopa-espana.jpg",
  "Spanish Super Cup": "/logos/cups/supercopa-espana.jpg",
  "Intercontinental Cup": "/logos/cups/intercontinental-cup.jpg",
  "FIFA Intercontinental Cup": "/logos/cups/intercontinental-cup.jpg",
};

export const getCompetitionLogo = (competition: string | null | undefined): string | null => {
  if (!competition) return null;
  return competitionLogos[competition] || null;
};

export default competitionLogos;
