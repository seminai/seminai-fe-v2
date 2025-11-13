import React from "react";

interface BarnAgriIconProps {
  className?: string;
  size?: number;
}

const BarnAgriIcon: React.FC<BarnAgriIconProps> = ({
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
      {/* Tetto del fienile */}
      <path d="M4 10L12 4L20 10" />
      
      {/* Struttura principale */}
      <path d="M5 10V19C5 19.5523 5.44772 20 6 20H18C18.5523 20 19 19.5523 19 19V10" />
      
      {/* Porta grande del fienile */}
      <path d="M9 20V14C9 13.4477 9.44772 13 10 13H14C14.5523 13 15 13.4477 15 14V20" />
      
      {/* Dettagli porta */}
      <path d="M12 13V20" strokeWidth="1.2" />
      
      {/* Finestra piccola */}
      <circle cx="12" cy="9" r="1" fill="currentColor" />
      
      {/* Dettagli architettonici */}
      <path d="M7 10V12" strokeWidth="1.2" opacity="0.5" />
      <path d="M17 10V12" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
};

export default BarnAgriIcon;

