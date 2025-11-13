import React from "react";

interface PlantGrowAgriIconProps {
  className?: string;
  size?: number;
}

const PlantGrowAgriIcon: React.FC<PlantGrowAgriIconProps> = ({
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
      {/* Gambo principale */}
      <path d="M12 20V9" />
      
      {/* Foglia sinistra grande */}
      <path d="M12 12C12 12 8 11 7 13C6 15 8 16 9 16C10 16 12 15 12 15" />
      
      {/* Foglia destra grande */}
      <path d="M12 13C12 13 16 12 17 14C18 16 16 17 15 17C14 17 12 16 12 16" />
      
      {/* Foglia sinistra piccola */}
      <path d="M12 10C12 10 9.5 9.5 9 11C8.5 12 9.5 12.5 10 12.5C10.5 12.5 12 11.5 12 11.5" strokeWidth="1.3" />
      
      {/* Foglia superiore */}
      <path d="M12 9C12 9 10 7 12 5C14 7 12 9 12 9Z" />
      
      {/* Terreno */}
      <path d="M8 20C8 20 9 19 12 19C15 19 16 20 16 20" strokeWidth="2" />
    </svg>
  );
};

export default PlantGrowAgriIcon;

