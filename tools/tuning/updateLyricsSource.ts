import * as ts from 'typescript';
import { DEFAULT_SECTION_WIDTH_PERCENT } from '../../src/shared/config/tuning';
import type { AnimationChange, AnimationSetting, TuningTarget } from './types';

type TextEdit = { end: number; start: number; text: string };

function getPropertyName(property: ts.ObjectLiteralElementLike) {
  if (!ts.isPropertyAssignment(property)) return null;
  const name = property.name;

  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}

function findLyricsArray(sourceFile: ts.SourceFile, lyricsExport: string) {
  let lyricsArray: ts.ArrayLiteralExpression | undefined;
  const visit = (node: ts.Node) => {
    if (lyricsArray) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === lyricsExport &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      lyricsArray = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (!lyricsArray) throw new Error(`${lyricsExport} array not found`);

  return lyricsArray;
}

function findProperty(section: ts.ObjectLiteralExpression, propertyName: string) {
  return section.properties.find((property) => getPropertyName(property) === propertyName);
}

function getSectionId(section: ts.ObjectLiteralExpression) {
  const property = findProperty(section, 'sectionId');

  return property && ts.isPropertyAssignment(property) && ts.isNumericLiteral(property.initializer)
    ? Number(property.initializer.text)
    : null;
}

function getLineStart(text: string, position: number) {
  return text.lastIndexOf('\n', position - 1) + 1;
}

function getLineEnd(text: string, position: number) {
  const newlineIndex = text.indexOf('\n', position);

  return newlineIndex === -1 ? text.length : newlineIndex + 1;
}

function getEndIncludingComma(text: string, position: number) {
  let cursor = position;
  while (/\s/.test(text[cursor] ?? '')) cursor += 1;

  return text[cursor] === ',' ? cursor + 1 : position;
}

function queuePropertyEdit(
  sourceFile: ts.SourceFile,
  source: string,
  section: ts.ObjectLiteralExpression,
  sectionId: number,
  propertyName: string,
  value: string | null,
  edits: TextEdit[],
) {
  const existing = findProperty(section, propertyName);
  if (existing && value === null) {
    edits.push({
      end: getLineEnd(source, getEndIncludingComma(source, existing.end)),
      start: getLineStart(source, existing.getStart(sourceFile)),
      text: '',
    });
    return;
  }
  if (value === null) return;
  if (existing) {
    edits.push({
      end: getEndIncludingComma(source, existing.end),
      start: existing.getStart(sourceFile),
      text: `${propertyName}: ${value},`,
    });
    return;
  }

  const sectionIdProperty = findProperty(section, 'sectionId');
  if (!sectionIdProperty) throw new Error(`sectionId property missing for section ${sectionId}`);

  const insertAt = getLineEnd(source, sectionIdProperty.end);
  const indent = /^\s*/.exec(source.slice(getLineStart(source, sectionIdProperty.getStart(sourceFile))))?.[0] ?? '';
  edits.push({ end: insertAt, start: insertAt, text: `${indent}${propertyName}: ${value},\n` });
}

function formatAnimation(animation: AnimationSetting) {
  if (animation.variant === 'instant') return '{ variant: "instant" }';

  const wordStarts = animation.wordStartPercents
    ? `, wordStartPercents: [${animation.wordStartPercents.join(', ')}]`
    : '';
  return `{ variant: "range", startPercent: ${animation.startPercent}, endPercent: ${animation.endPercent}, animationLengthPercent: ${animation.animationLengthPercent}${wordStarts} }`;
}

function updateTimestamp(
  sourceFile: ts.SourceFile,
  section: ts.ObjectLiteralExpression,
  sectionId: number,
  timestamp: string,
  edits: TextEdit[],
) {
  const existing = findProperty(section, 'timestamp');
  if (!existing || !ts.isPropertyAssignment(existing) || !ts.isStringLiteral(existing.initializer)) {
    throw new Error(`timestamp property missing for section ${sectionId}`);
  }

  edits.push({
    end: existing.initializer.end,
    start: existing.initializer.getStart(sourceFile),
    text: JSON.stringify(timestamp),
  });
}

function updateSection(
  sourceFile: ts.SourceFile,
  source: string,
  section: ts.ObjectLiteralExpression,
  change: AnimationChange,
  edits: TextEdit[],
) {
  const { sectionId } = change;
  const update = (propertyName: string, value: string | null) =>
    queuePropertyEdit(sourceFile, source, section, sectionId, propertyName, value, edits);

  if (change.timestamp !== undefined) updateTimestamp(sourceFile, section, sectionId, change.timestamp, edits);
  if (change.hasContinuing) update('continuing', change.continuing ? 'true' : null);
  if (change.hasIllustrationKind) {
    if (!change.illustrationKind) throw new Error(`illustrationKind missing for section ${sectionId}`);
    update('illustrationKind', JSON.stringify(change.illustrationKind));
  }
  if (change.hasIllustrationFadeIn) {
    update('illustrationFadeInMs', change.illustrationFadeInMs ? String(change.illustrationFadeInMs) : null);
  }
  if (change.hasIllustrationFadeOut) {
    update('illustrationFadeOutMs', change.illustrationFadeOutMs ? String(change.illustrationFadeOutMs) : null);
  }
  if (change.hasIllustrationVisibility) {
    if (!change.illustrationVisibility) throw new Error(`illustrationVisibility missing for section ${sectionId}`);
    update('illustrationVisibility', JSON.stringify(change.illustrationVisibility));
  }
  if (change.hasOverlay) update('isOverlay', change.isOverlay ? 'true' : null);
  if (change.hasSectionWidth) {
    update(
      'sectionWidthPercent',
      change.sectionWidthPercent === DEFAULT_SECTION_WIDTH_PERCENT ? null : String(change.sectionWidthPercent),
    );
  }
  if (change.hasIllustrationAnimation) {
    update(
      'illustrationAnimation',
      change.illustrationAnimation ? formatAnimation(change.illustrationAnimation) : null,
    );
  }
}

export function updateLyricsSource(source: string, changes: AnimationChange[], target: TuningTarget) {
  const sourceFile = ts.createSourceFile(target.lyricsFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lyricsArray = findLyricsArray(sourceFile, target.lyricsExport);
  const edits: TextEdit[] = [];

  changes.forEach((change) => {
    const section = lyricsArray.elements.find(
      (element): element is ts.ObjectLiteralExpression =>
        ts.isObjectLiteralExpression(element) && getSectionId(element) === change.sectionId,
    );
    if (!section) throw new Error(`Section ${change.sectionId} not found`);

    updateSection(sourceFile, source, section, change, edits);
  });

  return edits
    .map((edit, index) => ({ ...edit, index }))
    .sort((left, right) => right.start - left.start || right.end - left.end || right.index - left.index)
    .reduce((current, edit) => current.slice(0, edit.start) + edit.text + current.slice(edit.end), source);
}
