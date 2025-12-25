import { Link } from 'react-router-dom';
import { Trophy, Star, ArrowSquareOut, TrendUp } from '@phosphor-icons/react';
import { formatMarketValueMillions } from '@/lib/formatMarketValue';

// Full leaderboard data - values in millions EUR (synced with database)
const MARKET_VALUE_LEADERBOARD = [
  { rank: 1, name: "Arda Güler", team: "Real Madrid", value: 55, slug: "arda-guler", tracked: true },
  { rank: 2, name: "Kenan Yıldız", team: "Juventus", value: 45, slug: "kenan-yildiz", tracked: true },
  { rank: 3, name: "Hakan Çalhanoğlu", team: "Inter", value: 42, slug: "hakan-calhanoglu", tracked: true },
  { rank: 4, name: "Ferdi Kadıoğlu", team: "Brighton", value: 35, slug: "ferdi-kadioglu", tracked: true },
  { rank: 5, name: "Semih Kılıçsoy", team: "Beşiktaş", value: 20, slug: "semih-kilicsoy", tracked: true },
  { rank: 6, name: "Deniz Gül", team: "Galatasaray", value: 15, slug: "deniz-gul", tracked: true },
  { rank: 7, name: "Can Uzun", team: "Eintracht Frankfurt", value: 12, slug: "can-uzun", tracked: true },
  { rank: 8, name: "Merih Demiral", team: "Al-Ahli", value: 12, slug: "merih-demiral", tracked: true },
  { rank: 9, name: "Altay Bayındır", team: "Manchester United", value: 9, slug: "altay-bayindir", tracked: true },
  { rank: 10, name: "Atakan Karazor", team: "Stuttgart", value: 8, slug: "atakan-karazor", tracked: true },
  { rank: 11, name: "Salih Özcan", team: "Borussia Dortmund", value: 7, slug: "salih-ozcan", tracked: true },
  { rank: 12, name: "Enes Ünal", team: "Bournemouth", value: 5, slug: "enes-unal", tracked: true },
  { rank: 13, name: "Zeki Çelik", team: "Roma", value: 4, slug: "zeki-celik", tracked: true },
  { rank: 14, name: "Yusuf Akçiçek", team: "Al-Hilal", value: 3, slug: "yusuf-akcicek", tracked: true },
  { rank: 15, name: "İsak Vural", team: "Galatasaray", value: 3, slug: "isak-vural", tracked: true },
  { rank: 16, name: "Berke Özer", team: "Lille", value: 1.5, slug: "berke-ozer", tracked: true },
];

interface MarketValueLeaderboardProps {
  showAll?: boolean; // Show all 20 or just top 10
  compact?: boolean; // Compact mode for sidebar
}

export const MarketValueLeaderboard = ({ 
  showAll = false, 
  compact = false 
}: MarketValueLeaderboardProps) => {
  const displayData = showAll ? MARKET_VALUE_LEADERBOARD : MARKET_VALUE_LEADERBOARD.slice(0, 10);
  const trackedCount = MARKET_VALUE_LEADERBOARD.filter(p => p.tracked).length;

  return (
    <div className={`bg-card border border-border rounded-2xl overflow-hidden ${compact ? 'text-sm' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={20} weight="fill" />
            <h3 className="font-bold">Most Valuable Turkish Players</h3>
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
            Dec 2025
          </span>
        </div>
        <p className="text-xs text-emerald-100 mt-1">
          Tracking {trackedCount} of top 20 • Source: Transfermarkt
        </p>
      </div>

      {/* Leaderboard */}
      <div className="divide-y divide-border">
        {displayData.map((player) => {
          const content = (
            <div 
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                player.tracked 
                  ? 'bg-accent/5 hover:bg-accent/10' 
                  : 'hover:bg-muted/50 opacity-60'
              }`}
            >
              {/* Rank */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                player.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                player.rank === 2 ? 'bg-gray-300 text-gray-700' :
                player.rank === 3 ? 'bg-orange-400 text-orange-900' :
                'bg-muted text-muted-foreground'
              }`}>
                {player.rank}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold truncate ${player.tracked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {player.name}
                  </span>
                  {player.tracked && (
                    <Star size={14} weight="fill" className="text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {player.team}
                </div>
              </div>

              {/* Value */}
              <div className="text-right flex-shrink-0">
                <div className={`font-bold ${player.tracked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                  {formatMarketValueMillions(player.value)}
                </div>
              </div>

              {/* Arrow for tracked players */}
              {player.tracked && (
                <ArrowSquareOut size={16} className="text-accent flex-shrink-0" />
              )}
            </div>
          );

          // Wrap tracked players in Link
          if (player.tracked && player.slug) {
            return (
              <Link key={player.rank} to={`/athlete/${player.slug}`} className="block">
                {content}
              </Link>
            );
          }

          return <div key={player.rank}>{content}</div>;
        })}
      </div>

      {/* Footer */}
      {!showAll && (
        <div className="px-4 py-3 bg-muted/30 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Star size={12} weight="fill" className="text-yellow-500" />
              = Tracked in TST
            </span>
            <Link 
              to="/stats" 
              className="text-accent font-medium flex items-center gap-1 hover:underline"
            >
              View all stats <TrendUp size={12} weight="bold" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact inline version for hero sections
export const MarketValueTicker = () => {
  const top5 = MARKET_VALUE_LEADERBOARD.slice(0, 5);
  
  return (
    <div className="flex items-center gap-4 overflow-x-auto py-2 scrollbar-hide">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex-shrink-0">
        Top Values
      </span>
      {top5.map((player, i) => (
        <Link
          key={player.rank}
          to={player.slug ? `/athlete/${player.slug}` : '#'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm flex-shrink-0 transition-all ${
            player.tracked 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50' 
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <span className="font-medium">{player.name.split(' ')[0]}</span>
          <span className="font-bold">{formatMarketValueMillions(player.value)}</span>
          {player.tracked && <Star size={12} weight="fill" className="text-yellow-500" />}
        </Link>
      ))}
    </div>
  );
};

export default MarketValueLeaderboard;
