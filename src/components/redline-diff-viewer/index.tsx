import * as React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { Change } from 'diff';

import {
  computeLineInformation,
  LineInformation,
  DiffInformation,
  DiffType,
  DiffMethod,
} from './compute-lines';
import computeStyles, {
  ReactDiffViewerStyles,
  ReactDiffViewerStylesOverride,
} from './styles';

import memoize from 'memoize-one';

export enum LineNumberPrefix {
  LEFT = 'L',
  RIGHT = 'R',
}

export interface ReactDiffViewerProps {
	// Old value to compare.
	oldValue: string;
	// New value to compare.
	newValue: string;
	noise: string[];
	// Enable/Disable split view.
	splitView?: boolean;
	// Set line Offset
	linesOffset?: number;
	// Enable/Disable word diff.
	disableWordDiff?: boolean;
	// JsDiff text diff method from https://github.com/kpdecker/jsdiff/tree/v4.0.1#api
	compareMethod?: DiffMethod | ((oldStr: string, newStr: string) => Change[]);
	// Number of unmodified lines surrounding each line diff.
	extraLinesSurroundingDiff?: number;
	// Show/hide line number.
	hideLineNumbers?: boolean;
	// Show only diff between the two values.
	showDiffOnly?: boolean;
	// Render prop to format final string before displaying them in the UI.
	renderContent?: (source: string) => JSX.Element;
	// Render prop to format code fold message.
  onLineRender?: (lineInformation: LineInformation[]) => void;
  // Precomputed line information (for review use cases where user built up final changes)
  lineInformation?: LineInformation[]; // New optional prop


	codeFoldMessageRenderer?: (
		totalFoldedLines: number,
		leftStartLineNumber: number,
		rightStartLineNumber: number,
	) => JSX.Element;
	// Event handler for line number click.
	onLineNumberClick?: (
		lineId: string,
		event: React.MouseEvent<HTMLTableCellElement>,
	) => void;
  //renderGutter
  renderGutter?: (data: {
    lineNumber: number;
    type: DiffType;
    prefix: LineNumberPrefix;
    value: string | DiffInformation[];
    additionalLineNumber: number;
    additionalPrefix: LineNumberPrefix;
    styles: ReactDiffViewerStyles;
  }) => JSX.Element;
	// Array of line ids to highlight lines.
	highlightLines?: string[];
	// Style overrides.
	styles?: ReactDiffViewerStylesOverride;
	// Use dark theme.
	useDarkTheme?: boolean;
	// Title for left column
	leftTitle?: string | JSX.Element;
	// Title for left column
	rightTitle?: string | JSX.Element;
}

export interface ReactDiffViewerState {
  // Array holding the expanded code folding.
  expandedBlocks: number[];
}

class DiffViewer extends React.Component<
  ReactDiffViewerProps,
  ReactDiffViewerState
> {
  private styles: ReactDiffViewerStyles;
  private lineInformation: LineInformation[] = [];

	public static defaultProps: Partial<ReactDiffViewerProps> = {
		oldValue: '',
		newValue: '',
		noise: [],
		splitView: true,
		highlightLines: [],
		disableWordDiff: false,
		compareMethod: DiffMethod.CHARS,
		styles: {},
    onLineRender: () => {},
		hideLineNumbers: false,
		extraLinesSurroundingDiff: 3,
		showDiffOnly: true,
		useDarkTheme: false,
		linesOffset: 0,
	};

	public static propTypes = {
		oldValue: PropTypes.string.isRequired,
		newValue: PropTypes.string.isRequired,
		noise: PropTypes.arrayOf(PropTypes.string),
		splitView: PropTypes.bool,
		disableWordDiff: PropTypes.bool,
		compareMethod: PropTypes.oneOfType([PropTypes.oneOf(Object.values(DiffMethod)), PropTypes.func]),
		renderContent: PropTypes.func,
		onLineNumberClick: PropTypes.func,
		extraLinesSurroundingDiff: PropTypes.number,
		styles: PropTypes.object,
    onLineRender: PropTypes.func,
		hideLineNumbers: PropTypes.bool,
		showDiffOnly: PropTypes.bool,
		highlightLines: PropTypes.arrayOf(PropTypes.string),
		leftTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
		rightTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
		linesOffset: PropTypes.number,
		renderGutter: PropTypes.func,
	};

  public constructor(props: ReactDiffViewerProps) {
    super(props);

    this.state = {
      expandedBlocks: [],
    };

    this.styles = computeStyles(props.styles || {}, props.useDarkTheme || false);
  }

  /**
   * Resets code block expand to the initial stage.
   * Will be exposed to the parent component via refs.
   */
  public resetCodeBlocks = (): boolean => {
    if (this.state.expandedBlocks.length > 0) {
      this.setState({
        expandedBlocks: [],
      });
      return true;
    }
    return false;
  };

  /**
   * Pushes the target expanded code block to the state.
   * During the re-render, this value is used to expand/fold unmodified code.
   * @param id Code fold block id.
   */
  private onBlockExpand = (id: number): void => {
    const prevState = [...this.state.expandedBlocks, id];
    this.setState({
      expandedBlocks: prevState,
    });
  };

  /**
   * Computes final styles for the diff viewer.
   * It combines the default styles with the user supplied overrides.
   * The computed styles are cached with performance in mind.
   */
  private computeStyles = memoize(
    (styles: ReactDiffViewerStylesOverride, useDarkTheme: boolean) =>
      computeStyles(styles, useDarkTheme)
  );

  /**
   * Returns a function with clicked line number in the closure.
   * Returns a no-op function when no onLineNumberClick handler is supplied.
   * @param id Line id of a line.
   */
  private onLineNumberClickProxy =
    (id: string) => (e: React.MouseEvent<HTMLTableCellElement>): void => {
      if (this.props.onLineNumberClick) {
        this.props.onLineNumberClick(id, e);
      }
    };

  /**
   * Maps over the word diff and constructs the required React elements to show word diff.
   * @param diffArray Word diff information derived from line information.
   * @param renderer Optional renderer to format diff words. Useful for syntax highlighting.
   */
  private renderWordDiff = (
    diffArray: DiffInformation[],
    renderer?: (chunk: string) => JSX.Element
  ): JSX.Element[] => {
    return diffArray.map((wordDiff, i) => {
      const word = wordDiff.value as string;
      const content = renderer ? renderer(word) : word;
      return (
        <span
          key={i}
          className={cn(this.styles.wordDiff, {
            [(this.styles.wordAdded) as string]: wordDiff.type === DiffType.ADDED,
            [(this.styles.wordRemoved) as string]: wordDiff.type === DiffType.REMOVED,
            [(this.styles.wordNoised) as string]: wordDiff.type === DiffType.NOISED,
          })}
        >
          {content}
        </span>
      );
    });
  };

  /**
   * Maps over the line diff and constructs the required React elements to show line diff.
   * It calls renderWordDiff when encountering word diff.
   * This takes care of both inline and split view line renders.
   */
  private renderLine = (
    lineNumber: number | null,
    type: DiffType,
    prefix: LineNumberPrefix,
    value: string | DiffInformation[],
    additionalLineNumber?: number | null,
    additionalPrefix?: LineNumberPrefix
  ): JSX.Element => {
    const lineNumberTemplate = `${prefix}-${lineNumber}`;
    const additionalLineNumberTemplate =
      additionalPrefix && additionalLineNumber
        ? `${additionalPrefix}-${additionalLineNumber}`
        : undefined;
    const highlightLine =
      (lineNumber &&
        this.props.highlightLines?.includes(lineNumberTemplate)) ||
      (additionalLineNumber &&
        additionalLineNumberTemplate &&
        this.props.highlightLines?.includes(additionalLineNumberTemplate));
    const added = type === DiffType.ADDED;
    const removed = type === DiffType.REMOVED;
    const noised = type === DiffType.NOISED;
    let content: JSX.Element | string | null = null;
    if (Array.isArray(value)) {
      content = <>{this.renderWordDiff(value, this.props.renderContent)}</>;
    } else if (this.props.renderContent) {
      content = this.props.renderContent(value as string);
    } else {
      content = value as string;
    }

    return (
      <>
        {!this.props.hideLineNumbers && (
          <td
            onClick={
              lineNumber ? this.onLineNumberClickProxy(lineNumberTemplate) : undefined
            }
            className={cn(this.styles.gutter, {
              [this.styles.emptyGutter as string]: !lineNumber,
              [this.styles.diffAdded as string]: added,
              [this.styles.diffRemoved as string]: removed,
              [this.styles.diffNoised as string]: noised,
              [this.styles.highlightedGutter as string]: highlightLine,
            })}
          >
            <pre className={this.styles.lineNumber}>
              {lineNumber !== null ? lineNumber : ''}
            </pre>
          </td>
        )}
        {!this.props.splitView && !this.props.hideLineNumbers && (
          <td
            onClick={
              additionalLineNumber
                ? this.onLineNumberClickProxy(additionalLineNumberTemplate || '')
                : undefined
            }
            className={cn(this.styles.gutter, {
              [this.styles.emptyGutter as string]: !additionalLineNumber,
              [this.styles.diffAdded as string]: added,
              [this.styles.diffRemoved as string]: removed,
              [this.styles.diffNoised as string]: noised,
              [this.styles.highlightedGutter as string]: highlightLine,
            })}
          >
            <pre className={this.styles.lineNumber}>
              {additionalLineNumber !== null ? additionalLineNumber : ''}
            </pre>
          </td>
        )}
        {this.props.renderGutter
          ? this.props.renderGutter({
              lineNumber: lineNumber || 0,
              type,
              prefix: prefix as LineNumberPrefix,
              value,
              additionalLineNumber: additionalLineNumber || 0,
              additionalPrefix: additionalPrefix as LineNumberPrefix,
              styles: this.styles,
            })
          : null}
        <td
          className={cn(this.styles.marker, {
            [this.styles.emptyLine as string]: !content,
            [this.styles.diffAdded as string]: added,
            [this.styles.diffRemoved as string]: removed,
            [this.styles.diffNoised as string]: noised,
            [this.styles.highlightedLine as string]: highlightLine,
          })}
        >
          <pre>
            {added && '+'}
            {removed && '-'}
          </pre>
        </td>
        <td
          className={cn(this.styles.content, {
            [this.styles.emptyLine as string]: !content,
            [this.styles.diffAdded as string]: added,
            [this.styles.diffRemoved as string]: removed,
            [this.styles.diffNoised as string]: noised,
            [this.styles.highlightedLine as string]: highlightLine,
          })}
        >
          <pre
            className={cn(this.styles.contentText, {
              [this.styles.wordNoised as string]: noised,
            })}
          >
            {content}
          </pre>
        </td>
      </>
    );
  };

  /**
   * Generates lines for split view.
   */
  private renderSplitView = ({ left, right }: LineInformation, index: number): JSX.Element => {
    this.lineInformation[index] = { left, right };

    return (
      <tr key={index} className={this.styles.line}>
        {this.renderLine(
          left?.lineNumber || null,
          left?.type || DiffType.DEFAULT,
          LineNumberPrefix.LEFT,
          left?.value || '',
          null,
          undefined
        )}
        {this.renderLine(
          right?.lineNumber || null,
          right?.type || DiffType.DEFAULT,
          LineNumberPrefix.RIGHT,
          right?.value || '',
          null,
          undefined
        )}
      </tr>
    );
  };

  /**
   * Generates lines for inline view.
   */
  private renderInlineView = (
    { left, right }: LineInformation,
    index: number
  ): JSX.Element | null => {
    this.lineInformation[index] = { left, right };

    if (left?.type === DiffType.REMOVED && right?.type === DiffType.ADDED) {
      return (
        <React.Fragment key={index}>
          <tr className={this.styles.line}>
            {this.renderLine(
              left.lineNumber || null,
              left.type,
              LineNumberPrefix.LEFT,
              left.value || '',
              null,
              undefined
            )}
          </tr>
          <tr className={this.styles.line}>
            {this.renderLine(
              right.lineNumber || null,
              right.type,
              LineNumberPrefix.RIGHT,
              right.value || '',
              null,
              undefined
            )}
          </tr>
        </React.Fragment>
      );
    }
    if (left?.type === DiffType.REMOVED) {
      return (
        <tr key={index} className={this.styles.line}>
          {this.renderLine(
            left.lineNumber || null,
            left.type,
            LineNumberPrefix.LEFT,
            left.value || '',
            null,
            undefined
          )}
        </tr>
      );
    }
    if (right?.type === DiffType.ADDED) {
      return (
        <tr key={index} className={this.styles.line}>
          {this.renderLine(
            null,
            right.type,
            LineNumberPrefix.RIGHT,
            right.value || '',
            right.lineNumber,
            undefined
          )}
        </tr>
      );
    }
    if (left?.type === DiffType.DEFAULT) {
      return (
        <tr key={index} className={this.styles.line}>
          {this.renderLine(
            left.lineNumber || null,
            left.type,
            LineNumberPrefix.LEFT,
            left.value || '',
            right?.lineNumber || null,
            LineNumberPrefix.RIGHT
          )}
        </tr>
      );
    }
    return null;
  };

  /**
   * Returns a function with clicked block number in the closure.
   */
  private onBlockClickProxy = (id: number) => (): void => {
    this.onBlockExpand(id);
  };

  /**
   * Generates code fold block.
   */
  private renderSkippedLineIndicator = (
    num: number,
    blockNumber: number,
    leftBlockLineNumber: number,
    rightBlockLineNumber: number
  ): JSX.Element => {
    const { hideLineNumbers, splitView } = this.props;
    const message = this.props.codeFoldMessageRenderer ? (
      this.props.codeFoldMessageRenderer(
        num,
        leftBlockLineNumber,
        rightBlockLineNumber
      )
    ) : (
      <pre className={this.styles.codeFoldContent}>
        Expand {num} lines ...
      </pre>
    );
    const content = (
      <td>
        <a onClick={this.onBlockClickProxy(blockNumber)} tabIndex={0}>
          {message}
        </a>
      </td>
    );
    const isUnifiedViewWithoutLineNumbers = !splitView && !hideLineNumbers;
    return (
      <tr
        key={`${leftBlockLineNumber}-${rightBlockLineNumber}`}
        className={this.styles.codeFold}
      >
        {!hideLineNumbers && <td className={this.styles.codeFoldGutter} />}
        {this.props.renderGutter && <td className={this.styles.codeFoldGutter} />}
        <td
          className={cn(
            isUnifiedViewWithoutLineNumbers ? this.styles.codeFoldGutter : undefined
          )}
        />
        {isUnifiedViewWithoutLineNumbers ? (
          <>
            <td />
            {content}
          </>
        ) : (
          <>
            {content}
            {this.props.renderGutter && <td />}
            <td />
          </>
        )}
        <td />
        <td />
      </tr>
    );
  };

  /**
   * Generates the entire diff view.
   */
  private renderDiff = (): (JSX.Element | null)[] => {
    const {
      oldValue,
      newValue,
      noise,
      splitView,
      disableWordDiff,
      compareMethod,
      linesOffset,
      lineInformation: propLineInformation,
    } = this.props;

    const diffLines: number[] = [];
    this.lineInformation = [];

    if (propLineInformation && propLineInformation.length > 0) {
      this.lineInformation = propLineInformation;
    } else {
      const result = computeLineInformation(
        oldValue || '',
        newValue || '',
        noise || [],
        disableWordDiff || false,
        compareMethod || DiffMethod.CHARS,
        linesOffset || 0
      );
      this.lineInformation = result.lineInformation;
      diffLines.push(...result.diffLines);
    }
  
    const extraLines =
      this.props.extraLinesSurroundingDiff && this.props.extraLinesSurroundingDiff > 0
        ? this.props.extraLinesSurroundingDiff
        : 0;
    let skippedLines: number[] = [];

    return this.lineInformation.map((line, i) => {
      const diffBlockStart = diffLines[0];
      const currentPosition = diffBlockStart - i;
      if (this.props.showDiffOnly) {
        if (currentPosition === -extraLines) {
          skippedLines = [];
          diffLines.shift();
        }
        if (
          line.left?.type === DiffType.DEFAULT &&
          (currentPosition > extraLines || typeof diffBlockStart === 'undefined') &&
          !this.state.expandedBlocks.includes(diffBlockStart)
        ) {
          skippedLines.push(i + 1);
          if (i === this.lineInformation.length - 1 && skippedLines.length > 1) {
            return this.renderSkippedLineIndicator(
              skippedLines.length,
              diffBlockStart,
              line.left?.lineNumber || 0,
              line.right?.lineNumber || 0
            );
          }
          return null;
        }
      }

      const diffNodes = splitView
        ? this.renderSplitView(line, i)
        : this.renderInlineView(line, i);

      if (currentPosition === extraLines && skippedLines.length > 0) {
        const skippedLinesCount = skippedLines.length;
        skippedLines = [];
        return (
          <React.Fragment key={i}>
            {this.renderSkippedLineIndicator(
              skippedLinesCount,
              diffBlockStart,
              line.left?.lineNumber || 0,
              line.right?.lineNumber || 0
            )}
            {diffNodes}
          </React.Fragment>
        );
      }
      return diffNodes;
    });
  };

  componentDidMount() {
    if (this.props.onLineRender) {
      this.props.onLineRender(this.lineInformation);
    }
  }
  
  componentDidUpdate(prevProps: ReactDiffViewerProps) {
    if (
      this.props.onLineRender &&
      (prevProps.oldValue !== this.props.oldValue || prevProps.newValue !== this.props.newValue)
    ) {
      this.props.onLineRender(this.lineInformation);
    }
  }

  public render = (): JSX.Element => {
    const {
      oldValue,
      newValue,
      useDarkTheme,
      leftTitle,
      rightTitle,
      splitView,
      hideLineNumbers,
    } = this.props;

    if (typeof oldValue !== 'string' || typeof newValue !== 'string') {
      throw new Error('"oldValue" and "newValue" should be strings');
    }

    this.styles = this.computeStyles(this.props.styles || {}, useDarkTheme || false);
    const nodes = this.renderDiff();
    const colSpanOnSplitView = hideLineNumbers ? 2 : 3;
    const colSpanOnInlineView = hideLineNumbers ? 2 : 4;
    const columnExtension = this.props.renderGutter ? 1 : 0;

    const title = (leftTitle || rightTitle) && (
      <tr>
        <td
          colSpan={
            (splitView ? colSpanOnSplitView : colSpanOnInlineView) + columnExtension
          }
          className={this.styles.titleBlock}
        >
          <pre className={this.styles.contentText}>{leftTitle}</pre>
        </td>
        {splitView && (
          <td
            colSpan={colSpanOnSplitView + columnExtension}
            className={this.styles.titleBlock}
          >
            <pre className={this.styles.contentText}>{rightTitle}</pre>
          </td>
        )}
      </tr>
    );

    return (
      <table
        className={cn(this.styles.diffContainer, {
          [this.styles.splitView as string]: splitView,
        })}
      >
        <tbody>
          {title}
          {nodes}
        </tbody>
      </table>
    );
  };
}

export default DiffViewer;
export { DiffMethod };
