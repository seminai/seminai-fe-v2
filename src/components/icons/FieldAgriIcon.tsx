import React from "react";

interface FieldAgriIconProps {
  className?: string;
  size?: number;
}

const FieldAgriIcon: React.FC<FieldAgriIconProps> = ({
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
      {/* Campi divisi */}
      <rect x="3" y="4" width="8" height="7" rx="1.5" />
      <rect x="13" y="4" width="8" height="7" rx="1.5" />
      <rect x="3" y="13" width="8" height="7" rx="1.5" />
      <rect x="13" y="13" width="8" height="7" rx="1.5" />
      
      {/* Solchi/file di semina */}
      <path d="M5 6.5H9" strokeWidth="1" opacity="0.5" />
      <path d="M5 8.5H9" strokeWidth="1" opacity="0.5" />
      
      <path d="M15 6.5H19" strokeWidth="1" opacity="0.5" />
      <path d="M15 8.5H19" strokeWidth="1" opacity="0.5" />
      
      <path d="M5 15.5H9" strokeWidth="1" opacity="0.5" />
      <path d="M5 17.5H9" strokeWidth="1" opacity="0.5" />
      
      <path d="M15 15.5H19" strokeWidth="1" opacity="0.5" />
      <path d="M15 17.5H19" strokeWidth="1" opacity="0.5" />
    </svg>
  );
};

export default FieldAgriIcon;

