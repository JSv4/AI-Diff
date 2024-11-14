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
  font-family: monospace;
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

