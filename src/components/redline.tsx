import { FC } from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import styled from '@emotion/styled';

interface RedlineDiffProps {
  input: string;
  output: string;
  onLineClick?: (lineNumber: number, type: 'add' | 'remove') => void;
  selectedChanges?: Array<{
    lineNumber: number;
    type: 'add' | 'remove';
    text: string;
  }>;
}

const DiffContainer = styled.div`
  font-family: monospace;
`;

/**
 * RedlineDiff component that displays the differences between two text strings
 * using react-diff-viewer with line click handling
 * 
 * @param input - The original text string
 * @param output - The modified text string
 * @param onLineClick - Optional callback for when a line is clicked
 * @returns A styled diff view of the changes between input and output
 */
export const RedlineDiff: FC<RedlineDiffProps> = ({ 
  input, 
  output, 
  onLineClick, 
  selectedChanges = [] 
}) => {
  const handleLineNumberClick = (lineId: string) => {
    console.log('Raw lineId received:', lineId);

    // For added (new) lines, react-diff-viewer uses a different format
    // It uses 'undefined-{lineNumber}' for added lines
    if (lineId?.startsWith('undefined-')) {
      const lineNumber = parseInt(lineId.split('-')[1]);
      if (!isNaN(lineNumber)) {
        console.log('Processed add line:', lineNumber);
        onLineClick?.(lineNumber, 'add');
        return;
      }
    }

    // Handle removed (old) lines which use the 'L-{lineNumber}' format
    if (lineId?.startsWith('L-')) {
      const lineNumber = parseInt(lineId.slice(2));
      if (!isNaN(lineNumber)) {
        console.log('Processed remove line:', lineNumber);
        onLineClick?.(lineNumber, 'remove');
        return;
      }
    }

    console.warn('Unhandled lineId format:', lineId);
  };

  // Create highlight lines array - need to handle both formats
  const highlightLines = selectedChanges.map(change => {
    if (change.type === 'remove') {
      return `L-${change.lineNumber}`;
    } else {
      // For added lines, we need to use the 'undefined-{number}' format
      return `undefined-${change.lineNumber}`;
    }
  });

  console.log('Current highlightLines:', highlightLines);

  return (
    <DiffContainer>
      <ReactDiffViewer
        oldValue={input}
        newValue={output}
        splitView={false}
        onLineNumberClick={handleLineNumberClick}
        useDarkTheme={false}
        showDiffOnly={true}
        extraLinesSurroundingDiff={3}
        highlightLines={highlightLines}
        styles={{
          variables: {
            light: {
              highlightBackground: '#ffeb3b40',
              highlightGutterBackground: '#fff59d',
            }
          },
          line: {
            '&[data-line-number]': {
              cursor: 'pointer',
              '&.highlighted': {
                backgroundColor: '#ffeb3b40 !important',
                position: 'relative',
                '&::after': {
                  content: '"✓"',
                  position: 'absolute',
                  right: '8px',
                  color: '#28a745',
                }
              }
            }
          }
        }}
      />
    </DiffContainer>
  );
};
