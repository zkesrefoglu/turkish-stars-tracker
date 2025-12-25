import { Instagram, ExternalLink } from "lucide-react";

interface InstagramSocialSectionProps {
  instagramUrl: string | null;
  athleteName: string;
}

export const InstagramSocialSection = ({ instagramUrl, athleteName }: InstagramSocialSectionProps) => {
  // Extract username from Instagram URL
  const getUsername = (url: string | null): string | null => {
    if (!url) return null;
    const match = url.match(/instagram\.com\/([^/?]+)/);
    return match ? match[1] : null;
  };

  const username = getUsername(instagramUrl);

  if (!instagramUrl || !username) {
    return null;
  }

  return (
    <section className="bg-black py-12 mt-8">
      <div className="container-custom">
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-orange-900/30 border border-white/10 hover:border-white/20 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                <Instagram className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">@{username}</p>
              <p className="text-gray-400 text-sm">Follow {athleteName} on Instagram</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 group-hover:bg-white/20 rounded-full transition-all">
            <span className="text-white text-sm font-medium">View Profile</span>
            <ExternalLink className="w-4 h-4 text-white" />
          </div>
        </a>
      </div>
    </section>
  );
};
