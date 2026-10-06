import React from 'react';
import { Languages } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const LanguageToggle = ({ className = '', compact = false }) => {
  const { language, setLanguage } = useAppContext();

  return (
    <div 
      className={`inline-flex items-center bg-slate-100/90 border border-slate-300/80 rounded-lg p-0.5 shadow-2xs select-none transition-all ${className}`}
      title={language === 'en' ? 'भाषा बदलें (हिंदी / English)' : 'Switch Language (English / हिंदी)'}
    >
      <div className="flex items-center px-1.5 text-slate-500">
        <Languages size={compact ? 13 : 15} className="text-teal-700" />
      </div>

      <div className="flex items-center space-x-0.5">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            language === 'en'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-teal-900 hover:bg-slate-200/60'
          }`}
        >
          English
        </button>

        <button
          type="button"
          onClick={() => setLanguage('hi')}
          className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            language === 'hi'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-teal-900 hover:bg-slate-200/60'
          }`}
        >
          हिंदी
        </button>
      </div>
    </div>
  );
};

export default LanguageToggle;
