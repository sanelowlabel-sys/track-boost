import React from 'react';
import { ArrowLeft, Home, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JamBoostLogo } from './JamBoostLogo';
import { PageSeo } from './PageSeo';

interface NotFoundProps {
  onHome?: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onHome }) => {
  const navigate = useNavigate();
  const handleHome = () => {
    if (onHome) onHome();
    else navigate('/');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 text-center">
      <PageSeo
        title="404 – Page Not Found | JamBoost"
        description="The requested page could not be found on JamBoost."
      />
      <div className="max-w-md w-full bg-[#181818] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#82C321]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6">
            <JamBoostLogo size="sm" className="h-7" />
          </div>

          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-6 shadow-inner">
            <Search className="w-8 h-8 text-gray-500" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-gray-400 mb-4 font-semibold">
            404 • Not Found
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
            Page Not Found
          </h1>

          <p className="text-sm text-gray-400 leading-relaxed mb-8">
            The page you are looking for does not exist, has been removed, or is temporarily unavailable.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <button
              onClick={handleHome}
              className="w-full sm:flex-1 h-12 bg-[#82C321] hover:bg-[#8fd524] text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] cursor-pointer shadow-lg shadow-[#82C321]/20"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  window.history.back();
                } else {
                  handleHome();
                }
              }}
              className="w-full sm:w-auto h-12 px-5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer border border-white/10 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
