import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isTimelineSectionResident,
  TIMELINE_WINDOW_SIZE,
} from '../src/widgets/track-experience/model/timelineWindow.ts';

test('keeps a bounded timeline window around the active section', () => {
  const resident = (activeIndex: number) =>
    Array.from({ length: 100 }, (_, index) => index).filter((index) =>
      isTimelineSectionResident(index, activeIndex, 100),
    );

  assert.deepEqual(
    resident(0),
    Array.from({ length: TIMELINE_WINDOW_SIZE }, (_, index) => index),
  );
  assert.deepEqual(
    resident(50),
    Array.from({ length: TIMELINE_WINDOW_SIZE }, (_, index) => index + 45),
  );
  assert.deepEqual(
    resident(99),
    Array.from({ length: TIMELINE_WINDOW_SIZE }, (_, index) => index + 80),
  );
});
