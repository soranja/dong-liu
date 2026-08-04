import assert from 'node:assert/strict';
import test from 'node:test';
import { getSectionNavigationTime } from '../src/widgets/track-experience/model/sectionNavigation.ts';

const sectionStarts = [0, 10, 20];

test('navigates by section boundaries', () => {
  assert.equal(getSectionNavigationTime(sectionStarts, 12, 30, 1), 20);
  assert.equal(getSectionNavigationTime(sectionStarts, 10, 30, -1), 0);
  assert.equal(getSectionNavigationTime(sectionStarts, 10.9, 30, -1), 0);
  assert.equal(getSectionNavigationTime(sectionStarts, 11, 30, -1), 10);
  assert.equal(getSectionNavigationTime(sectionStarts, 29, 30, 1), 30);
});
