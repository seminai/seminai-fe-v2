import React from "react";

interface ChartAgriIconProps {
  className?: string;
  size?: number;
}

const ChartAgriIcon: React.FC<ChartAgriIconProps> = ({
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
      {/* Barre del grafico che sembrano piante che crescono */}
      <path d="M6 20V14" />
      <path d="M10 20V10" />
      <path d="M14 20V12" />
      <path d="M18 20V8" />
      
      {/* Foglioline in cima alle barre */}
      <path d="M5 14C5 14 5.5 13 6.5 13.5C7 13.8 7 14 7 14" strokeWidth="1.2" />
      <path d="M9 10C9 10 9.5 9 10.5 9.5C11 9.8 11 10 11 10" strokeWidth="1.2" />
      <path d="M13 12C13 12 13.5 11 14.5 11.5C15 11.8 15 12 15 12" strokeWidth="1.2" />
      <path d="M17 8C17 8 17.5 7 18.5 7.5C19 7.8 19 8 19 8" strokeWidth="1.2" />
      
      {/* Linea del terreno */}
      <path d="M4 20H20" strokeWidth="2" />
    </svg>
  );
};

export default ChartAgriIcon;

