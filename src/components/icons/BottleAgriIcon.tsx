import React from "react";

interface BottleAgriIconProps {
  className?: string;
  size?: number;
}

const BottleAgriIcon: React.FC<BottleAgriIconProps> = ({
  className = "",
  size = 24,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Bottiglia/contenitore prodotto */}
      <path d="M9 3H15" />
      <path d="M10 3V5" />
      <path d="M14 3V5" />
      
      {/* Corpo della bottiglia */}
      <path d="M10 5H14L15 8V19C15 19.5523 14.5523 20 14 20H10C9.44772 20 9 19.5523 9 19V8L10 5Z" />
      
      {/* Livello del liquido */}
      <path d="M9.2 12H14.8" strokeWidth="1.2" opacity="0.6" />
      
      {/* Etichetta sulla bottiglia con piccola foglia */}
      <rect x="10" y="10" width="4" height="5" rx="0.5" strokeWidth="1" opacity="0.3" />
      
      {/* Piccola foglia sull'etichetta */}
      <path d="M11.5 12C11.5 12 12 11.5 12.5 12C13 12.5 12.8 13 12.5 13.3" strokeWidth="0.8" />
      <path d="M11.8 12.3L12.5 13" strokeWidth="0.8" />
    </svg>
  );
};

export default BottleAgriIcon;

