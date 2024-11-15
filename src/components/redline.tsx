import React, { FC } from 'react';
import DiffViewer, { DiffMethod, LineNumberPrefix, ReactDiffViewerStylesOverride } from 'react-diff-viewer';
import styled from '@emotion/styled';

/**
 * Props for the RedlineDiff component
 */
interface RedlineDiffProps {
    oldValue: string;
    newValue: string;
    onLineNumberClick: (lineId: string, content: string) => void;
    selectedLines: Set<string>; // e.g., Set of 'L-3', 'R-5'
  }

const DiffContainer = styled.div`
  font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  margin: 1rem 0;

  /* Style overrides for react-diff-viewer */
  .diff-viewer {
    background: #ffffff;
  }

  .diff-container {
    border-radius: 8px;
    width: 100%;
    table-layout: fixed; /* Ensure table takes up the full width */
    border-collapse: collapse;

    & > tbody > tr {
      width: 100%;
      display: table-row;
    }

    td {
      vertical-align: top;
      word-break: break-word;
    }

    .diff-gutter {
      width: 50px; /* Fixed width for line numbers */
      background-color: #f8f9fa;
      color: #6c757d;
      padding: 0 1rem;
    }

    .diff-line-number {
      width: 50px; /* Ensure consistent width for line numbers */
    }

    .marker {
      width: 20px; /* Fixed width for change markers (+, -, etc.) */
      text-align: center;
    }

    .content {
      width: calc(50% - 70px); /* Adjust based on gutter and marker widths */
      padding: 1rem;
    }
  }

  .selected-line {
    background-color: rgba(0, 123, 255, 0.1);
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
  }

  .diff-remove {
    background-color: #ffe6e6 !important;
  }

  .selected-line-number {
    background-color: rgba(0, 102, 204, 0.1);
  }
`;

/**
 * RedlineDiff component that displays the differences between two text strings
 */
export const RedlineDiff: FC<RedlineDiffProps> = ({
    oldValue,
    newValue,
    onLineNumberClick,
    selectedLines,
}) => {

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
        onLineNumberClick={(lineId, event) => {
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

