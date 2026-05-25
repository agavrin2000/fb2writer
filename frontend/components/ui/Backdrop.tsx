'use client';

import React from 'react';

interface BackdropProps {
  onClick?: () => void;
  /** Если true, клик по подложке не вызовет onClick */
  disableCloseOnClick?: boolean;
  className?: string;
}

export const Backdrop: React.FC<BackdropProps> = ({ 
  onClick, 
  disableCloseOnClick = false, 
  className = '' 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Предотвращаем любые побочные эффекты
    e.preventDefault();
    
    // Вызываем закрытие, только если оно не заблокировано и передан колбэк
    if (!disableCloseOnClick && onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        fixed inset-0 z-[90] 
        bg-ui-text/20 backdrop-blur-[2px] 
        transition-all duration-300 ease-out 
        starting:opacity-0 starting:backdrop-blur-0
        ${disableCloseOnClick ? 'cursor-default' : 'cursor-pointer'}
        ${className}
      `}
    />
  );
};
