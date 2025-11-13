import React from "react";

interface SprayAgriIconProps {
  className?: string;
  size?: number;
}

const SprayAgriIcon: React.FC<SprayAgriIconProps> = ({
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
      {/* Spruzzatore */}
      <path d="M8 4H10C10.5523 4 11 4.44772 11 5V7" />
      <path d="M6 7H14C14.5523 7 15 7.44772 15 8V11C15 11.5523 14.5523 12 14 12H6C5.44772 12 5 11.5523 5 11V8C5 7.44772 5.44772 7 6 7Z" />
      
      {/* Manico */}
      <path d="M10 12V16C10 16.5523 9.55228 17 9 17C8.44772 17 8 16.5523 8 16V12" />
      
      {/* Gocce spray */}
      <circle cx="10" cy="19" r="0.75" fill="currentColor" />
      <circle cx="7" cy="20" r="0.75" fill="currentColor" />
      <circle cx="13" cy="20" r="0.75" fill="currentColor" />
      <circle cx="9" cy="21.5" r="0.5" fill="currentColor" />
      <circle cx="11" cy="21.5" r="0.5" fill="currentColor" />
      
      {/* Linee spray */}
      <path d="M6 14V15.5" strokeWidth="1" opacity="0.6" />
      <path d="M14 14V15.5" strokeWidth="1" opacity="0.6" />
    </svg>
  );
};

export default SprayAgriIcon;

