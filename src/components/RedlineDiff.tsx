import { FC } from 'react';
import DiffViewer, { DiffMethod, LineNumberPrefix, ReactDiffViewerStylesOverride } from 'react-diff-viewer';
import styled from '@emotion/styled';

interface RedlineDiffProps {
  oldValue: string;
  newValue: string;
  onLineNumberClick: (lineId: string, content: string) => void;
  selectedLines: Set<string>; // e.g., Set of 'L-3', 'R-5'
}

const DiffContainer = styled.div`
  /* Your existing styles */

  /* Highlight selected lines */
  .selected-line {
    background-color: rgba(0, 123, 255, 0.1);
  }
`;

const RedlineDiff: FC<RedlineDiffProps> = ({
  oldValue,
  newValue,
  onLineNumberClick,
  selectedLines,
}) => {
  // Custom styles for highlighting selected lines
  const styles: ReactDiffViewerStylesOverride = {
    variables: {
      light: {
        highlightBackground: 'rgba(0, 123, 255, 0.1)',
      },
      dark: {
        highlightBackground: 'rgba(0, 123, 255, 0.3)',
      },
    },
    lineNumber: {
      '&.selected': {
        background: 'rgba(0, 123, 255, 0.2)',
      },
    },
    content: {
      '&.selected': {
        background: 'rgba(0, 123, 255, 0.1)',
      },
    },
  };

  return (
    <DiffContainer>
      <DiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={true}
        compareMethod={DiffMethod.WORDS}
        renderContent={(source: string) => <pre>{source}</pre>}
        onLineNumberClick={(lineId: string) => {
          // Determine side and line number
          const side = lineId.startsWith(LineNumberPrefix.LEFT) ? 'left' : 'right';
          const lineNumber = parseInt(lineId.substring(2), 10);

          // Get content from the appropriate side
          const lines = side === 'left' ? oldValue.split('\n') : newValue.split('\n');
          const content = lines[lineNumber - 1] || ''; // Adjust for zero-based index

          onLineNumberClick(lineId, content);
        }}
        highlightLines={[...selectedLines]}
        styles={styles}
      />
    </DiffContainer>
  );
};

export default RedlineDiff; 