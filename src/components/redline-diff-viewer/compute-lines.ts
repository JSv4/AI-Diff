/* eslint-disable space-before-blocks */
/* eslint-disable no-useless-concat */
/* eslint-disable no-lonely-if */
/* eslint-disable default-case */
/* eslint-disable brace-style */
/* eslint-disable array-callback-return */
/* eslint-disable no-plusplus */
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-shadow */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-param-reassign */
/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable max-len */
// keploy-react-diff
import * as diff from 'diff';

const jsDiff: { [key: string]: any } = diff;

export enum DiffType {
  DEFAULT = 0,
  ADDED = 1,
  REMOVED = 2,
  NOISED = 3
}

// See https://github.com/kpdecker/jsdiff/tree/v4.0.1#api for more info on the below JsDiff methods
export enum DiffMethod {
  CHARS = 'diffChars',
  WORDS = 'diffWords',
  WORDS_WITH_SPACE = 'diffWordsWithSpace',
  LINES = 'diffLines',
  TRIMMED_LINES = 'diffTrimmedLines',
  SENTENCES = 'diffSentences',
  CSS = 'diffCss',
}

export interface DiffInformation {
  value?: string | DiffInformation[];
  lineNumber?: number;
  type?: DiffType;
}

export interface LineInformation {
  left?: DiffInformation;
  right?: DiffInformation;
}

export interface ComputedLineInformation {
  lineInformation: LineInformation[];
  diffLines: number[];
}
interface DiffChange extends diff.Change {
  noised?: boolean
}

export interface ComputedDiffInformation {
  left?: DiffInformation[];
  right?: DiffInformation[];
}

// See https://github.com/kpdecker/jsdiff/tree/v4.0.1#change-objects for more info on JsDiff
// Change Objects
export interface JsDiffChangeObject {
  added?: boolean;
  removed?: boolean;
  value?: string;
  noised?: boolean
}

/**
 * Splits diff text by new line and computes final list of diff lines based on
 * conditions.
 *
 * @param value Diff text from the js diff module.
 */
const constructLines = (value: string): string[] => {
  if (value === undefined) {
    return [];
  }
  value = value.replace(/\n,/gi, "\n")
  if (value.trim() === ",") {
    value = ""
  }
  const lines = value.split('\n');
  const isAllEmpty = lines.every((val): boolean => !val);
  if (isAllEmpty) {
    // This is to avoid added an extra new line in the UI.
    if (lines.length === 2) {
      return [];
    }
    lines.pop();
    return lines;
  }

  const lastLine = lines[lines.length - 1];
  const firstLine = lines[0];
  // Remove the first and last element if they are new line character. This is
  // to avoid addition of extra new line in the UI.
  if (!lastLine) {
    lines.pop();
  }
  if (!firstLine) {
    lines.shift();
  }
  return lines;
};

/**
 * Computes word diff information in the line.
 * [TODO]: Consider adding options argument for JsDiff text block comparison
 *
 * @param oldValue Old word in the line.
 * @param newValue New word in the line.
 * @param compareMethod JsDiff text diff method from https://github.com/kpdecker/jsdiff/tree/v4.0.1#api
 */
const computeDiff = (
  oldValue: string,
  newValue: string,
  compareMethod: string | ((oldStr: string, newStr: string) => DiffChange[]) = DiffMethod.CHARS,
): ComputedDiffInformation => {
  const diffArray: JsDiffChangeObject[] = ((typeof compareMethod === 'string') ? jsDiff[compareMethod] : compareMethod)(
    oldValue,
    newValue,
  );
  const computedDiff: ComputedDiffInformation = {
    left: [],
    right: [],
  };
  diffArray.forEach(
    ({ added, removed, value }): DiffInformation => {
      const diffInformation: DiffInformation = {};
      if (added) {
        diffInformation.type = DiffType.ADDED;
        diffInformation.value = value;
        computedDiff.right?.push(diffInformation);
      }
      if (removed) {
        diffInformation.type = DiffType.REMOVED;
        diffInformation.value = value;
        computedDiff.left?.push(diffInformation);
      }
      if (!removed && !added) {
        diffInformation.type = DiffType.DEFAULT;
        diffInformation.value = value;
        computedDiff.right?.push(diffInformation);
        computedDiff.left?.push(diffInformation);
      }
      return diffInformation;
    },
  );
  return computedDiff;
};

function noiseDiffArray(expectedObj: any, actualObj: any, key: string): DiffChange[] {
  const result: DiffChange[] = [];
  const expectedLines = constructLines(JSON.stringify(expectedObj, null, 2));
  const actualLines = constructLines(JSON.stringify(actualObj, null, 2));
  
  expectedLines.map((el, elIndex) => {
    if (elIndex < actualLines.length) {
      if (elIndex === 0) {
        actualLines[elIndex] = sanitizeInput(actualLines[elIndex])
        el = sanitizeInput(el)
        result.push({
          count: -2,
          noised: true,
          value: `${key + el}_keploy_|_keploy_${key}${actualLines[elIndex]}`,
          added: false,
          removed: false
        });
      } else {
        actualLines[elIndex] = sanitizeInput(actualLines[elIndex])
        el = sanitizeInput(el)
        result.push({
          count: -2,
          noised: true,
          value: `  ${el}_keploy_|_keploy_  ${actualLines[elIndex]}`,
          added: false,
          removed: false
        });
      }
    } else if (elIndex === 0) {
      el = sanitizeInput(el)
      result.push({
        count: -2,
        noised: true,
        value: `${key + el}_keploy_|_keploy_${key}`,
        added: false,
        removed: true
      });
    } else {
      el = sanitizeInput(el)
      result.push({
        count: -2,
        noised: true,
        value: `  ${el}_keploy_|_keploy_`,
        added: false,
        removed: true
      });
    }
  });

  for (let indx = expectedLines.length; indx < actualLines.length; indx++) {
    if (indx === 0) {
      actualLines[indx] = sanitizeInput(actualLines[indx])
      result.push({
        count: -2,
        noised: true,
        value: `${key}_keploy_|_keploy_${key}${actualLines[indx]}`,
        added: true,
        removed: false
      });
    } else {
      actualLines[indx] = sanitizeInput(actualLines[indx])
      result.push({
        count: -2,
        noised: true,
        value: `_keploy_|_keploy_  ${actualLines[indx]}`,
        added: true,
        removed: false
      });
    }
  }
  return result;
}

function CompareJSON(expectedStr: string, actualStr: string, noise: string[], flattenKeyPath: string): DiffChange[] {
  const result: DiffChange[] = [];
  const expectedJSON = JSON.parse(expectedStr);
  const actualJSON = JSON.parse(actualStr);

  // expectedJSON and actualJSON are not of same data types
  if (typeof expectedJSON !== typeof actualJSON) {
    if (!noise.includes(flattenKeyPath)) {
      result.push({ count: -1, removed: true, added: false, value: JSON.stringify(expectedJSON, null, 2) });
      result.push({ count: -1, added: true, removed: false, value: JSON.stringify(actualJSON, null, 2) });
      return result;
    }

    // console.log(expectedStr, actualStr);
    const output = noiseDiffArray(expectedJSON, actualJSON, '');
    output.map((el) => {
      result.push({ ...el, noised: true });
    });

    return result
    // result.push({count: -2, value: expectedStr+"_keploy_|_keploy_"+actualStr})
  }

  // expectedJSON and actualJSON are of same datatypes
  switch (typeof expectedJSON) {
    case 'string': {
      // matches
      if (expectedJSON === actualJSON) {
        result.push({ count: -1, value: expectedJSON, added: false, removed: false });
        return result;
      }
      // not matched and ignored because its value of noise field
      if (noise.includes(flattenKeyPath)) {
        const output = noiseDiffArray(expectedJSON, actualJSON, '');
        output.map((el) => {
          result.push({ ...el, noised: true });
        });
        // result.push({count: -2, value: expectedStr+"_keploy_|_keploy_"+actualStr})
      }
      // not matches and not noisy field's value
      else {
        result.push({ count: -1, removed: true, added: false, value: expectedJSON });
        result.push({ count: -1, added: true, removed: false, value: actualJSON });
        return result;
      }
      break;
    }
    case 'number': {
      // matches
      if (expectedJSON === actualJSON) {
        result.push({ count: -1, value: expectedStr, added: false, removed: false });
        return result;
      }
      // not matched and ignored because its value of noise field
      if (noise.includes(flattenKeyPath)) {
        const output = noiseDiffArray(expectedJSON, actualJSON, '');

        output.map((el) => {
          result.push({ ...el, noised: true });
        });
        // result.push({count: -2, value: expectedStr+"_keploy_|_keploy_"+actualStr})
      }
      // not matches and not noisy field's value
      else {
        result.push({ count: -1, removed: true, added: false, value: expectedStr });
        result.push({ count: -1, added: true, removed: false, value: actualStr });
        return result;
      }
      break;
    }
    case 'boolean': {
      // matches
      if (expectedStr === actualStr) {
        result.push({ count: -1, value: expectedStr, added: false, removed: false });
        return result;
      }
      // not matched and ignored because its value of noise field
      if (noise.includes(flattenKeyPath)) {
        const output = noiseDiffArray(expectedJSON, actualJSON, '');
        output.map((el) => {
          result.push({ ...el, noised: true });
        });
        // result.push({count: -2, value: expectedStr+"_keploy_|_keploy_"+actualStr})
      }
      // not matches and not noisy field's value
      else {
        result.push({ count: -1, removed: true, added: false, value: expectedStr });
        result.push({ count: -1, added: true, removed: false, value: actualStr });
        return result;
      }
      break;
    }
    case 'object': {
      // this is the value of a noise field therefore, it should be of type default.
      if (noise.includes(flattenKeyPath)) {
        const output = noiseDiffArray(expectedJSON, actualJSON, '');
        output.map((el) => {
          result.push({ ...el, noised: true });
        });
        return result;
      }
      // when both are arrays
      if (Array.isArray(expectedJSON) && Array.isArray(actualJSON)) {
        result.push({ count: -1, value: '[', added: false, removed: false });

        expectedJSON.map((el, elIndx) => {

          // comparing common length elements in both arrays
          if (elIndx < actualJSON.length) {
            const output = CompareJSON(JSON.stringify(el, null, 2), JSON.stringify(actualJSON[elIndx], null, 2), noise, flattenKeyPath);
            output.map((res) => {
              res.value = `  ${res.value}`;
              if (res.count === -2) {
                const tagStartIndex = res.value.indexOf('_keploy_|_keploy_');
                const tagLength = '_keploy_|_keploy_'.length;
                res.value = res.value.substring(0, tagStartIndex) + "_keploy_|_keploy_  " + res.value.substring(tagStartIndex + tagLength);
              }

              if (res.value[res.value.length - 1] != ',' && res.value.trim() !== "{" && !res.value.endsWith("_keploy_|_keploy_")) {
                res.value += ',';
              }
              result.push(res);
            });
          }
          // handling extra elements of expectedStr as of type removed
          else {
            const lines = constructLines(JSON.stringify(el, null, 2));
            lines.map((line, _lineIndex) => {
              line = `  ${line}`;
              if (line.trim() !== "{") {
                line = line + ","
              }
              result.push({ count: -1, removed: true, added: false, value: line });
            });
            // result.push({count: -1, removed: true, value: JSON.stringify(el, null, 2)+","})
          }

        });

        // handling extra elements of actualStr as added type
        for (let indx = expectedJSON.length; indx < actualJSON.length; indx++) {
          // if last element of result is of removed type than there should be gap between added otherwise it will be considered as modification.
          if (result[result.length - 1].removed) {
            result.push({ count: -3, value: "", added: false, removed: false })
          }

          const lines = constructLines(JSON.stringify(actualJSON[indx], null, 2));
          lines.map((line, _lineIndex) => {
            line = `  ${line}`;
            if (line.trim() !== "{") {
              line = line + ","
            }
            result.push({ count: -1, added: true, removed: false, value: line });
          });
          // result.push({count: -1, added: true, value: JSON.stringify(actualJSON[indx], null, 2)+","})
        }

        result.push({ count: -1, value: ']', added: false, removed: false });
      }
      // both are objects and not null
      else if (expectedJSON !== null && expectedJSON !== undefined && actualJSON !== null && actualJSON !== undefined && !Array.isArray(expectedJSON) && !Array.isArray(actualJSON)) {
        result.push({ count: -1, value: '{', added: false, removed: false });

        for (const key in expectedJSON) {

          // key present in both
          if (key in actualJSON) {
            const valueExpectedObj = expectedJSON[key];
            const valueActualObj = actualJSON[key];
            // type of value in expectedJSON for key is of same type as value in actualJSON.
            if (typeof valueActualObj === typeof valueExpectedObj) {
              var nextPath: string = ``;
              if (flattenKeyPath === "") {
                nextPath = `${key}`;
              } else {
                nextPath = `${flattenKeyPath}.${key}`;
              }
              const output = CompareJSON(JSON.stringify(valueExpectedObj, null, 2), JSON.stringify(valueActualObj, null, 2), noise, nextPath);

              // values of keys in expectedJSON and actualJSON are null.
              if (valueActualObj == null && valueExpectedObj == null) {
                result.push({ count: -1, value: `  ${key}: ${JSON.stringify(null)},`, added: false, removed: false });
              }
              // type of one is array and other is object.
              else if (typeof valueExpectedObj === 'object' && (Array.isArray(valueExpectedObj) ? !Array.isArray(valueActualObj) : Array.isArray(valueActualObj))) {
                // if (flattenKeyPath === "") {
                if (nextPath === "") {
                  if (noise.includes(`${key}`)) {
                    const output = noiseDiffArray(valueExpectedObj, valueActualObj, `  ${key}: `);
                    output.map((el) => {
                      result.push({ ...el, noised: true });
                    });
                  }
                }
                // else if (noise.includes(`${flattenKeyPath}.${key}`)){
                else if (noise.includes(nextPath)) {
                  const output = noiseDiffArray(valueExpectedObj, valueActualObj, `  ${key}: `);
                  output.map((el) => {
                    result.push({ ...el, noised: true });
                  });
                }
                else {
                  result.push({ count: -1, removed: true, added: false, value: `  ${key}: ${JSON.stringify(valueExpectedObj, null, 2)},` });
                  result.push({ count: -1, added: true, removed: false, value: `  ${key}: ${JSON.stringify(valueActualObj, null, 2)},` });
                }
              }
              // both values of key-value pairs are of array datatype.
              else if (typeof valueExpectedObj === 'object' && Array.isArray(valueExpectedObj)) {
                result.push({ count: -1, value: `  ${key}: [\n`, added: false, removed: false });

                output.map((res, resIndx) => {
                  if (resIndx > 0) {
                    res.value = `  ${res.value}`;
                    if (res.count === -2) {
                      const tagStartIndex = res.value.indexOf('_keploy_|_keploy_');
                      const tagLength = '_keploy_|_keploy_'.length;
                      res.value = res.value.substring(0, tagStartIndex) + "_keploy_|_keploy_  " + res.value.substring(tagStartIndex + tagLength);
                    }
                    result.push(res);
                  }
                });

              }
              // both values are objects.
              else if (typeof valueExpectedObj === 'object') {
                result.push({ count: -1, value: `  ${key}: {\n`, added: false, removed: false });

                output.map((res, resIndx) => {
                  if (resIndx > 0) {

                    if (res.count === -2) {
                      const tagStartIndex = res.value.indexOf('_keploy_|_keploy_');
                      const tagLength = '_keploy_|_keploy_'.length;
                      res.value = `  ${res.value.substring(0, tagStartIndex)}_keploy_|_keploy_  ${res.value.substring(tagStartIndex + tagLength)}`
                    }
                    else {
                      res.value = `  ${res.value}`;
                    }

                    result.push(res);
                  }
                });

              } else {

                if (output.length === 1) {

                  if (output[0].count === -1) {
                    result.push({ count: -1, value: `  ${key}: ${output[0].value},`, added: false, removed: false });
                  } else {
                    const tagStartIndex = output[0].value.indexOf('_keploy_|_keploy_');
                    const tagLength = '_keploy_|_keploy_'.length;
                    result.push({ count: -2, noised: true, value: `  ${key}: ${output[0].value.substring(0, tagStartIndex)},_keploy_|_keploy_` + `  ${key}: ${output[0].value.substring(tagStartIndex + tagLength)},`, added: false, removed: false });
                  }

                }
                else {
                  result.push({
                    count: output[0].count,
                    removed: output[0].removed,
                    added: output[0].added,
                    value: `  ${key}: ${output[0].value},`,
                    noised: output[0].noised
                  });
                  result.push({
                    count: output[1].count,
                    removed: output[1].removed,
                    added: output[1].added,
                    value: `  ${key}: ${output[1].value},`,
                    noised: output[1].noised
                  });
                }

              }
            } else {

              if (!noise.includes(`${flattenKeyPath}.${key}`)) {
                result.push({ count: -1, removed: true, added: false, value: `  ${key}: ${JSON.stringify(valueExpectedObj, null, 2)},` });
                result.push({ count: -1, added: true, removed: false, value: `  ${key}: ${JSON.stringify(valueActualObj, null, 2)},` });
              } else {
                var output = noiseDiffArray(valueExpectedObj, valueActualObj, "  " + key + ": ");
                output.map(function (el) {
                  result.push({ ...el, noised: true });
                });
              }

            }
          } else {
            result.push({ count: -1, removed: true, added: false, value: `  ${key}: ${JSON.stringify(expectedJSON[key], null, 2)},` });
          }
        }
        // keys not present in expectedJSON are of added type
        for (const key in actualJSON) {
          // if last element of result is of removed type than there should be gap between added otherwise it will be considered as modification.
          if (result[result.length - 1].removed) {
            result.push({ count: -3, value: "", added: false, removed: false })
          }
          if (!(key in expectedJSON)) {
            result.push({ count: -1, added: true, removed: false, value: `  ${key}: ${JSON.stringify(actualJSON[key], null, 2)},` });
          }
        }
        result.push({ count: -1, value: '}', added: false, removed: false });
      }
      else if (expectedJSON == null && actualJSON == null) {
        result.push({ count: -1, value: JSON.stringify(expectedJSON, null, 2), added: false, removed: false });
      }
      else {
        result.push({ count: -1, removed: true, added: false, value: JSON.stringify(expectedJSON, null, 2) });
        result.push({ count: -1, added: true, removed: false, value: JSON.stringify(actualJSON, null, 2) });
      }

      break;
    }
  }
  return result;
}

/**
 * [TODO]: Think about moving common left and right value assignment to a
 * common place. Better readability?
 *
 * Computes line wise information based in the js diff information passed. Each
 * line contains information about left and right section. Left side denotes
 * deletion and right side denotes addition.
 *
 * @param oldString Old string to compare.
 * @param newString New string to compare with old string.
 * @param disableWordDiff Flag to enable/disable word diff.
 * @param compareMethod JsDiff text diff method from https://github.com/kpdecker/jsdiff/tree/v4.0.1#api
 * @param linesOffset line number to start counting from
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/\\n/g, '\n')
    .replace(/\r\n|\r/g, '\n') // Normalize line endings to '\n'
    .replace(/\\t/g, '\t')
    .replace(/\\/g, '')
    .trimRight();
};

const computeLineInformation = (
  oldString: string,
  newString: string,
  noise: string[],
  disableWordDiff: boolean = false,
  compareMethod: string | ((oldStr: string, newStr: string) => DiffChange[]) = DiffMethod.CHARS,
  linesOffset: number = 0,
): ComputedLineInformation => {

  oldString = sanitizeInput(oldString);
  newString = sanitizeInput(newString);

  // let noiseTmp:string[] = []
  // for(let i=0; i<noise.length ;i++){
  // 	noiseTmp.push(noise[i])
  // }
  // let expectedStr =  addNoiseTags(oldString, "keploy.noise.l", noiseTmp, false)[0] as string
  // let actualStr = addNoiseTags(newString, "keploy.noise.r", noise, false)[0]  as string

  let diffArray: DiffChange[]
  var validJSON: string = "plain"
  if (noise === null || noise === undefined) {
    noise = []
  }
  try {
    JSON.parse(oldString)
    JSON.parse(newString)
    // if (noise === null || noise === undefined){
    //   noise = []
    // }
    // diffArray = CompareJSON(
    //   oldString.trimRight(),
    //   newString.trimRight(),
    //   noise,
    //   "body",
    // )
    validJSON = "JSON"
  }
  catch (e) {
    // if ( noise==null || noise.length==0 || (noise.length>0 && !noise.includes("body"))){
    //   diffArray = diff.diffLines(
    //     oldString.trimRight(),
    //     newString.trimRight(),
    //     {
    //       newlineIsToken: true,
    //       ignoreWhitespace: false,
    //       ignoreCase: false,
    //     },
    //   )
    //   if (diffArray.length ===1 ){
    //     diffArray[0].count = -1
    //   }
    // }
    // else{
    //   diffArray = noiseDiffArray(oldString, newString, "")
    // }

  }
  if (validJSON === 'plain') {
    if (noise == null || noise.length == 0 || (noise.length > 0 && !noise.includes("body"))) {
      diffArray = diff.diffLines(
        oldString.trimRight(),
        newString.trimRight(),
        {
          newlineIsToken: true,
          ignoreWhitespace: false,
          ignoreCase: false,
        },
      )
      if (diffArray.length === 1) {
        diffArray[0].count = -1
      }
    }
    else {
      diffArray = noiseDiffArray(oldString, newString, "")
    }
  }
  else {
    diffArray = CompareJSON(
      oldString.trimRight(),
      newString.trimRight(),
      noise,
      "",
    )
  }

  // const diffArray = CompareJSON(
  // 	 oldString.trimRight(),
  // 	 newString.trimRight(),
  // 	 noise,
  // 	 'body',
  //   // {
  //   // 	newlineIsToken: true,
  //   // 	ignoreWhitespace: false,
  //   // 	ignoreCase: false,
  //   // },
  // );
  // [
  // 	{
  // 		added: Boolean,
  // 		removed: Boolean,
  // 		count: 1234,
  // 		value: "{ "name": "ritik,"\n "age ": 21"
  // 	},
  // 	{
  // 		removed: true,
  // 		count: 1,
  // 		value: "contact: "keploy.noise.l78278782892", \n"
  // 	},
  // 	{
  // 		added: true,
  // 		count: 1,
  // 		value: "contact: "keploy.noise.r7827212052", \n"
  // 	},
  // ]
  // console.log(diffArray);
  // diffArray.forEach((element, elIndex) => {
  // 	if (element.value.includes("keploy.noise")){
  // 		element.added = undefined
  // 		element.removed = undefined
  // 	}
  // });
  // console.log(noise);
  let rightLineNumber = linesOffset;
  let leftLineNumber = linesOffset;
  let lineInformation: LineInformation[] = [];
  let counter = 0;
  const diffLines: number[] = [];
  const ignoreDiffIndexes: string[] = [];
  const getLineInformation = (
    value: string,
    diffIndex: number,
    added?: boolean,
    removed?: boolean,
    noised?: boolean,
    evaluateOnlyFirstLine?: boolean,
  ): LineInformation[] => {
    const lines = constructLines(value);
    return lines.map((line: string, lineIndex): LineInformation | undefined => {
      const left: DiffInformation = {};
      const right: DiffInformation = {};
      if (ignoreDiffIndexes.includes(`${diffIndex}-${lineIndex}`)
        || (evaluateOnlyFirstLine && lineIndex !== 0) || diffArray[diffIndex].count === -3) {
        return undefined;
      }
      if (added || removed) { // Include noised in the condition
        if (!diffLines.includes(counter)) {
          diffLines.push(counter);
        }
        if (removed) {
          leftLineNumber += 1;
          left.lineNumber = leftLineNumber;
          left.type = DiffType.REMOVED;
          left.value = line || ' ';
          const nextDiff = diffArray[diffIndex + 1];
          if (nextDiff && nextDiff.added) {
            const nextDiffLines = constructLines(nextDiff.value)[lineIndex];
            if (lineIndex < constructLines(nextDiff.value).length && lineIndex === lines.length - 1) {
              lines.push(' ');
            }
            if (nextDiffLines) {
              const rightInfo = getLineInformation(
                nextDiff.value,
                diffIndex,
                true,
                false,
                nextDiff.noised
              )[lineIndex]?.right;

              if (rightInfo) {
                const {
                  value: rightValue,
                  lineNumber,
                  type,
                } = rightInfo;
                ignoreDiffIndexes.push(`${diffIndex + 1}-${lineIndex}`);
                right.lineNumber = lineNumber;
                right.type = type;
                if (disableWordDiff) {
                  right.value = rightValue;
                } else {
                  const computedDiff = computeDiff(
                    line,
                    rightValue as string,
                    compareMethod,
                  );
                  right.value = computedDiff.right;
                  left.value = computedDiff.left;
                }
              }
            }
          }
        } else {
          rightLineNumber += 1;
          right.lineNumber = rightLineNumber;
          right.type = DiffType.ADDED;
          right.value = line;
        }
      } else {
        const currentDiff = diffArray[diffIndex];
        if (currentDiff && (currentDiff.count !== undefined && (currentDiff.count === -1 || currentDiff.count >= 0))) {
          leftLineNumber += 1;
          rightLineNumber += 1;
          left.lineNumber = leftLineNumber;
          left.type = DiffType.DEFAULT;
          right.lineNumber = rightLineNumber;
          right.type = DiffType.DEFAULT;
          left.value = line;
          right.value = line;
          if (noised) {
            left.type = DiffType.NOISED
            right.type = DiffType.NOISED
          }
        } else if (currentDiff && currentDiff.count === -2) {
          const tagStartIndex = value.indexOf('_keploy_|_keploy_');
          const tagLength = '_keploy_|_keploy_'.length;
          leftLineNumber += 1;
          rightLineNumber += 1;
          left.lineNumber = leftLineNumber;
          left.type = DiffType.DEFAULT;
          right.lineNumber = rightLineNumber;
          right.type = DiffType.DEFAULT;
          left.value = line.substring(0, tagStartIndex);
          right.value = line.substring(tagStartIndex + tagLength);
          if (noised) {
            left.type = DiffType.NOISED
            right.type = DiffType.NOISED
          }
        }
      }
      counter += 1;
      return { right, left };
    }).filter((item): item is LineInformation => item !== undefined);
  };


  diffArray.forEach(({ added, removed, value, noised }: DiffChange, index): void => {
    lineInformation = [
      ...lineInformation,
      ...getLineInformation(value, index, added, removed, noised),
    ];
  });
  // if (lineInformation.length === 1) {
  //   lineInformation.push({left: {value: "", lineNumber: 2, type:DiffType.DEFAULT}})
  // }
  return {
    lineInformation,
    diffLines,
  };
};

export { computeLineInformation };
