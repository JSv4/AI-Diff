import React, { FC } from 'react';
import DiffViewer, { DiffMethod } from 'react-diff-viewer';
import styled from '@emotion/styled';

/**
 * Props for the RedlineDiff component
 */
interface RedlineDiffProps {
  input: string;
  output: string;
  onLineClick?: (lineNumber: number, type: 'add' | 'remove') => void;
  selectedLines?: string[];
}

const DiffContainer = styled.div`
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  margin: 1rem 0;

  // Style overrides for react-diff-viewer
  .diff-viewer {
    background: #ffffff;
  }

  .diff-container {
    border-radius: 8px;
  }

  .diff-gutter {
    background-color: #f8f9fa;
    color: #6c757d;
    padding: 0 1rem;
  }

  .diff-code {
    padding: 1rem !important;
  }

  .diff-line {
    &:hover {
      background-color: #f8f9fa;
    }
  }

  .highlight-line {
    background-color: rgba(0, 102, 204, 0.1) !important;
    border-left: 3px solid #0066cc !important;
  }

  .diff-add {
    background-color: #e6ffed !important;
    
    .diff-code {
      background-color: #e6ffed !important;
    }
  }

  .diff-remove {
    background-color: #ffe6e6 !important;
    
    .diff-code {
      background-color: #ffe6e6 !important;
    }
  }
`;

/**
 * RedlineDiff component that displays the differences between two text strings using 'react-diff-viewer'
 */
export const RedlineDiff: FC<RedlineDiffProps> = ({
  input,
  output,
  onLineClick,
  selectedLines = [],
}) => {
  /**
   * Handles line click events and invokes the onLineClick callback.
   * @param id - The identifier of the clicked line (e.g., 'L-1' or 'R-1').
   * @param event - The click event.
   */
  const handleLineClick = (
    id: string,
    event: React.MouseEvent<HTMLTableCellElement>
  ) => {
    if (onLineClick) {
      const [side, lineNumberStr] = id.split('-');
      const lineNumber = parseInt(lineNumberStr, 10);
      const type = side === 'L' ? 'remove' : 'add';
      onLineClick(lineNumber, type);
    }
  };

  return (
    <DiffContainer>
      <DiffViewer
        oldValue={input}
        newValue={output}
        splitView={true}
        onLineNumberClick={handleLineClick}
        highlightLines={selectedLines}
        compareMethod={DiffMethod.WORDS}
      />
    </DiffContainer>
  );
};

