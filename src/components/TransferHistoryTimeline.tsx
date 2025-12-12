import { format } from "date-fns";
import { ArrowRight, Euro } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Transfer {
  id: string;
  athlete_id: string;
  transfer_date: string;
  from_club: string;
  to_club: string;
  transfer_fee: number | null;
  transfer_type: string | null;
  from_club_logo_url: string | null;
  to_club_logo_url: string | null;
}

interface TransferHistoryTimelineProps {
  transfers: Transfer[];
}

const formatFee = (fee: number | null, type: string | null): string => {
  if (type === 'loan') return 'Loan';
  if (type === 'free' || fee === 0) return 'Free Transfer';
  if (!fee) return 'Undisclosed';
  
  if (fee >= 1000000) {
    return `€${(fee / 1000000).toFixed(1)}M`;
  } else if (fee >= 1000) {
    return `€${(fee / 1000).toFixed(0)}K`;
  }
  return `€${fee}`;
};

const getTransferTypeBadge = (type: string | null) => {
  switch (type) {
    case 'loan':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'free':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    default:
      return 'bg-accent/20 text-accent border-accent/30';
  }
};

export const TransferHistoryTimeline = ({ transfers }: TransferHistoryTimelineProps) => {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transfer history available.
      </div>
    );
  }

  // Sort by date descending
  const sortedTransfers = [...transfers].sort(
    (a, b) => new Date(b.transfer_date).getTime() - new Date(a.transfer_date).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedTransfers.map((transfer, index) => (
        <div 
          key={transfer.id} 
          className="relative pl-6 pb-4 border-l-2 border-border last:border-l-transparent"
        >
          {/* Timeline dot */}
          <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-accent" />
          
          {/* Transfer card */}
          <div className="bg-secondary/50 rounded-lg p-4">
            {/* Date and type */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {format(new Date(transfer.transfer_date), "MMMM d, yyyy")}
              </span>
              <Badge className={`${getTransferTypeBadge(transfer.transfer_type)} border capitalize text-xs`}>
                {transfer.transfer_type || 'Transfer'}
              </Badge>
            </div>
            
            {/* Clubs */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 text-right">
                <div className="flex items-center justify-end gap-2">
                  {transfer.from_club_logo_url && (
                    <img 
                      src={transfer.from_club_logo_url} 
                      alt={transfer.from_club}
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <span className="font-medium text-foreground truncate">
                    {transfer.from_club}
                  </span>
                </div>
              </div>
              
              <ArrowRight className="w-5 h-5 text-accent flex-shrink-0" />
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {transfer.to_club_logo_url && (
                    <img 
                      src={transfer.to_club_logo_url} 
                      alt={transfer.to_club}
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <span className="font-medium text-foreground truncate">
                    {transfer.to_club}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Fee */}
            <div className="flex items-center gap-2 text-sm">
              <Euro className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {formatFee(transfer.transfer_fee, transfer.transfer_type)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
