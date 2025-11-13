import React from "react";

interface TasksAgriIconProps {
  className?: string;
  size?: number;
}

const TasksAgriIcon: React.FC<TasksAgriIconProps> = ({
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
      {/* Clipboard */}
      <path d="M8 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3H16" />
      
      {/* Top clip */}
      <rect x="8" y="2" width="8" height="3" rx="1.5" />
      
      {/* Checkmarks con piccole foglie */}
      <path d="M8 10L10 12L12.5 9.5" />
      <path d="M8 15L10 17L12.5 14.5" />
      
      {/* Piccole foglie agricole accanto ai check */}
      <path d="M14 9.5C14 9.5 14.5 9 15 9.5C15.5 10 15.3 10.5 15 11" strokeWidth="1.2" />
      <path d="M14 14.5C14 14.5 14.5 14 15 14.5C15.5 15 15.3 15.5 15 16" strokeWidth="1.2" />
    </svg>
  );
};

export default TasksAgriIcon;

