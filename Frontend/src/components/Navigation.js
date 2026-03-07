import React from 'react';
import './Navigation.css';

const Navigation = ({ 
  navigationStack, 
  selectionMode,
  selectedCount,
  canUndo,
  onBack, 
  onZoomOut, 
  onDelete,
  onUndo,
  onBreadcrumbClick
}) => {
  const renderBreadcrumb = () => {
    const crumbs = ['Years'];
    
    navigationStack.forEach(item => {
      crumbs.push(item.value);
    });

    return (
      <div className="breadcrumb">
        {crumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="breadcrumb-separator">›</span>}
            <span 
              className={`breadcrumb-item ${index === crumbs.length - 1 ? 'current' : ''}`}
              onClick={() => onBreadcrumbClick(index - 1)}
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="navigation">
      <div className="nav-left">
        {renderBreadcrumb()}
      </div>
      
      <div className="nav-right">
        <button className="nav-button back-button" onClick={onBack}>
          ← Back
        </button>
        
        <span className="nav-divider">|</span>
        
        <button 
          className="nav-button zoom-out-button" 
          onClick={onZoomOut}
          disabled={navigationStack.length === 0}
        >
          Zoom Out
        </button>
        
        <span className="nav-divider">|</span>
        
        <button 
          className="nav-button delete-button" 
          onClick={onDelete}
          disabled={!selectionMode || selectedCount === 0}
        >
          Delete
        </button>
        
        <span className="nav-divider">|</span>
        
        <button 
          className={`nav-button undo-button ${canUndo ? 'active' : ''}`}
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        
        {selectionMode && (
          <>
            <span className="nav-divider">|</span>
            <span className="selection-count">{selectedCount} selected</span>
          </>
        )}
      </div>
    </div>
  );
};

export default Navigation;