type WarpRoom = {
  baseHeight: number;
  baseLeft: number;
  baseTop: number;
  baseWidth: number;
  element: HTMLElement;
  rotation: number;
};

type WarpRow = {
  baseHeight: number;
  baseTop: number;
  rooms: WarpRoom[];
};

type WarpBoundary = {
  axis: "horizontal" | "vertical";
  favoredDirection: -1 | 1;
  index: number;
  negativeLimit: number;
  positiveLimit: number;
  priority: number;
};

const HORIZONTAL_PUSH_RATIO = 0.72;
const MIN_ROOM_SPAN_RATIO = 0.16;
const MOVEMENT_FORCE = 0.92;
const ROOM_GROUP_TOLERANCE_PX = 1;
const STAGE_ACTIVE_SHARE = 0.78;
const STAGE_GAP_SHARE = 0.22;
const VERTICAL_PUSH_RATIO = 1.08;

function getRoomNumber(room: HTMLElement, name: string) {
  return Number(room.dataset[name]) || 0;
}

function getRows(root: HTMLElement) {
  const rooms = [...root.querySelectorAll<HTMLElement>("[data-kinetic-warp-room]")]
    .map(
      (element): WarpRoom => ({
        baseHeight: getRoomNumber(element, "baseHeight"),
        baseLeft: getRoomNumber(element, "baseLeft"),
        baseTop: getRoomNumber(element, "baseTop"),
        baseWidth: getRoomNumber(element, "baseWidth"),
        element,
        rotation: getRoomNumber(element, "wordRotation"),
      }),
    )
    .sort((left, right) => left.baseTop - right.baseTop || left.baseLeft - right.baseLeft);
  const rows: WarpRow[] = [];

  rooms.forEach((room) => {
    const row = rows.find((candidate) => Math.abs(candidate.baseTop - room.baseTop) <= ROOM_GROUP_TOLERANCE_PX);
    if (row) {
      row.rooms.push(room);
      return;
    }

    rows.push({ baseHeight: room.baseHeight, baseTop: room.baseTop, rooms: [room] });
  });

  return rows;
}

function easeInQuart(progress: number) {
  return progress * progress * progress * progress;
}

function getRoomPressure(room: WarpRoom) {
  const textLength = room.element.textContent?.trim().length ?? 0;
  const dominantSpan = room.rotation === 0 ? room.baseWidth : room.baseHeight;
  const supportSpan = room.rotation === 0 ? room.baseHeight : room.baseWidth;

  return (
    (Math.pow(Math.max(textLength, 1), 1.18) / Math.max(dominantSpan, 1)) * Math.pow(Math.max(supportSpan, 1), 0.18)
  );
}

function getRowPressure(row: WarpRow) {
  const roomPressures = row.rooms.map(getRoomPressure);
  const strongestRoomPressure = Math.max(...roomPressures);
  const averageRoomPressure = roomPressures.reduce((sum, value) => sum + value, 0) / roomPressures.length;
  const averageRoomBreadth = row.rooms.reduce((sum, room) => sum + room.baseWidth, 0) / Math.max(row.rooms.length, 1);
  const sparseDramaBonus = averageRoomBreadth / Math.max(row.baseHeight, 1) / Math.max(row.rooms.length, 1);

  return strongestRoomPressure + averageRoomPressure * 0.35 + sparseDramaBonus * 0.34;
}

function getStageProgress(progress: number, movementIndex: number, movementCount: number) {
  const stageShare = 1 / movementCount;
  const stageStart = movementIndex * stageShare;
  const stageEnd = stageStart + stageShare * STAGE_ACTIVE_SHARE;
  const stagePauseEnd = stageStart + stageShare * (STAGE_ACTIVE_SHARE + STAGE_GAP_SHARE);
  if (progress <= stageStart) return 0;
  if (progress >= stageEnd) return 1;
  if (progress <= stagePauseEnd) return 1;

  return easeInQuart((progress - stageStart) / Math.max(stageEnd - stageStart, Number.EPSILON));
}

function getMovementBoundaries(sectionId: number, boundaries: WarpBoundary[]) {
  const movementCount = Math.min(2 + (sectionId % 3), boundaries.length);
  if (!movementCount) return [];

  const startOffset = sectionId % boundaries.length;
  const orderedBoundaries = boundaries
    .map((boundary, index) => ({
      boundary,
      score: boundary.priority - ((index - startOffset + boundaries.length) % boundaries.length) * 0.0001,
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ boundary }) => boundary);

  return orderedBoundaries.slice(0, movementCount);
}

function getWarpBoundaries(rows: WarpRow[]) {
  const boundaries: WarpBoundary[] = [];
  let boundaryIndex = 0;

  rows.forEach((row) => {
    row.rooms.slice(0, -1).forEach((room, roomIndex) => {
      const nextRoom = row.rooms[roomIndex + 1];
      const leftPressure = getRoomPressure(room);
      const rightPressure = getRoomPressure(nextRoom);
      const fullLimit = Math.min(room.baseWidth, nextRoom.baseWidth) * HORIZONTAL_PUSH_RATIO;
      const leftSlack = room.baseWidth * (1 - MIN_ROOM_SPAN_RATIO);
      const rightSlack = nextRoom.baseWidth * (1 - MIN_ROOM_SPAN_RATIO);
      boundaries.push({
        axis: "horizontal",
        favoredDirection: leftPressure >= rightPressure ? 1 : -1,
        index: boundaryIndex,
        negativeLimit: Math.min(fullLimit, leftSlack),
        positiveLimit: Math.min(fullLimit, rightSlack),
        priority: Math.max(leftPressure, rightPressure) + Math.abs(leftPressure - rightPressure) * 0.85,
      });
      boundaryIndex += 1;
    });
  });

  rows.slice(0, -1).forEach((row, rowIndex) => {
    const nextRow = rows[rowIndex + 1];
    const upperPressure = getRowPressure(row);
    const lowerPressure = getRowPressure(nextRow);
    const fullLimit = Math.min(row.baseHeight, nextRow.baseHeight) * VERTICAL_PUSH_RATIO;
    const upperSlack = row.baseHeight * (1 - MIN_ROOM_SPAN_RATIO);
    const lowerSlack = nextRow.baseHeight * (1 - MIN_ROOM_SPAN_RATIO);
    boundaries.push({
      axis: "vertical",
      favoredDirection: upperPressure >= lowerPressure ? 1 : -1,
      index: boundaryIndex,
      negativeLimit: Math.min(fullLimit, upperSlack),
      positiveLimit: Math.min(fullLimit, lowerSlack),
      priority: Math.max(upperPressure, lowerPressure) + Math.abs(upperPressure - lowerPressure) * 0.65,
    });
    boundaryIndex += 1;
  });

  return boundaries.sort((left, right) => right.priority - left.priority || left.index - right.index);
}

function getBoundaryTarget(boundary: WarpBoundary) {
  return boundary.favoredDirection * MOVEMENT_FORCE;
}

function getBoundaryShift(boundary: WarpBoundary, movementBoundaries: WarpBoundary[], progress: number) {
  let shift = 0;

  movementBoundaries.forEach((movementBoundary, movementIndex) => {
    if (movementBoundary.index !== boundary.index) return;

    const target = getBoundaryTarget(boundary);
    const stageProgress = getStageProgress(progress, movementIndex, movementBoundaries.length);
    shift = shift + (target - shift) * stageProgress;
  });

  if (shift >= 0) return shift * boundary.positiveLimit;

  return shift * boundary.negativeLimit;
}

function setRoomRect(room: WarpRoom, left: number, top: number, width: number, height: number) {
  const widthRatio = width / room.baseWidth;
  const heightRatio = height / room.baseHeight;
  const scaleX = room.rotation === 0 ? widthRatio : heightRatio;
  const scaleY = room.rotation === 0 ? heightRatio : widthRatio;

  room.element.style.left = `${left}px`;
  room.element.style.top = `${top}px`;
  room.element.style.width = `${width}px`;
  room.element.style.height = `${height}px`;
  room.element.style.setProperty("--warp-room-scale-x", String(scaleX));
  room.element.style.setProperty("--warp-room-scale-y", String(scaleY));
}

// Projects raw (possibly crossed) inner boundary positions back into a valid,
// non-crossing order that preserves a minimum span for every cell. Both neighbors
// of a boundary read the same position, so rooms stay tiled with no overlap or gaps.
function clampBoundaries(rawInner: number[], minSpans: number[], startEdge: number, endEdge: number) {
  const positions = rawInner.slice();

  let previousEdge = startEdge;
  for (let index = 0; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index], previousEdge + minSpans[index]);
    previousEdge = positions[index];
  }

  let nextEdge = endEdge;
  for (let index = positions.length - 1; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index], nextEdge - minSpans[index + 1]);
    nextEdge = positions[index];
  }

  return positions;
}

export function setKineticWarpProgress(slide: HTMLElement | null, progress: number) {
  const root = slide?.querySelector<HTMLElement>("[data-kinetic-warp-root]");
  if (!root) return;

  const sectionId = Number(root.dataset.sectionId) || 0;
  const rows = getRows(root);
  const boundaries = getWarpBoundaries(rows);
  if (!boundaries.length) return;

  const movementBoundaries = getMovementBoundaries(sectionId, boundaries);
  const boundaryByIndex = new Map(boundaries.map((boundary) => [boundary.index, boundary]));
  const horizontalBoundaryCount = rows.reduce((sum, row) => sum + Math.max(0, row.rooms.length - 1), 0);

  const verticalStartEdge = rows[0].baseTop;
  const lastRow = rows[rows.length - 1];
  const verticalEndEdge = lastRow.baseTop + lastRow.baseHeight;
  const verticalMinSpans = rows.map((row) => row.baseHeight * MIN_ROOM_SPAN_RATIO);
  const rawVerticalBoundaries = rows.slice(0, -1).map((row, index) => {
    const boundary = boundaryByIndex.get(horizontalBoundaryCount + index);
    const shift = boundary ? getBoundaryShift(boundary, movementBoundaries, progress) : 0;
    return row.baseTop + row.baseHeight + shift;
  });
  const verticalBoundaries = clampBoundaries(
    rawVerticalBoundaries,
    verticalMinSpans,
    verticalStartEdge,
    verticalEndEdge,
  );

  let horizontalBoundaryIndex = 0;

  rows.forEach((row, rowIndex) => {
    const top = rowIndex === 0 ? verticalStartEdge : verticalBoundaries[rowIndex - 1];
    const bottom = rowIndex === rows.length - 1 ? verticalEndEdge : verticalBoundaries[rowIndex];

    const horizontalShifts = row.rooms.slice(0, -1).map(() => {
      const boundary = boundaryByIndex.get(horizontalBoundaryIndex);
      const shift = boundary ? getBoundaryShift(boundary, movementBoundaries, progress) : 0;
      horizontalBoundaryIndex += 1;
      return shift;
    });

    const horizontalStartEdge = row.rooms[0].baseLeft;
    const lastRoom = row.rooms[row.rooms.length - 1];
    const horizontalEndEdge = lastRoom.baseLeft + lastRoom.baseWidth;
    const horizontalMinSpans = row.rooms.map((room) => room.baseWidth * MIN_ROOM_SPAN_RATIO);
    const rawHorizontalBoundaries = row.rooms
      .slice(0, -1)
      .map((room, roomIndex) => room.baseLeft + room.baseWidth + horizontalShifts[roomIndex]);
    const horizontalBoundaries = clampBoundaries(
      rawHorizontalBoundaries,
      horizontalMinSpans,
      horizontalStartEdge,
      horizontalEndEdge,
    );

    row.rooms.forEach((room, roomIndex) => {
      const left = roomIndex === 0 ? horizontalStartEdge : horizontalBoundaries[roomIndex - 1];
      const right = roomIndex === row.rooms.length - 1 ? horizontalEndEdge : horizontalBoundaries[roomIndex];
      setRoomRect(room, left, top, right - left, bottom - top);
    });
  });
}
