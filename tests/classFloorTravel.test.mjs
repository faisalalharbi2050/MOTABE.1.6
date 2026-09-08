import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../utils/classFloorTravel.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { classroomTravelCost: cost } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const ground = { id: 'g', floorNumber: 0 }, upper = { id: 'u', floorNumber: 2 }, unknown = { id: 'unknown' };
const classes = new Map([ground, upper, unknown].map(c => [c.id, c]));
const lesson = (classId, extra = {}) => ({ teacherId: 't', classId, type: 'lesson', ...extra });
test('prefers staying on the floor over a two-floor return trip', () => {
 const tt = { 't-sunday-1': lesson('g'), 't-sunday-3': lesson('g') };
 assert.equal(cost(tt, classes, 't', 'sunday', 2, ground), 0);
 assert.equal(cost(tt, classes, 't', 'sunday', 2, upper), 6);
});
test('unknown floors, facilities, other teachers and days do not invent travel', () => {
 assert.equal(cost({ 't-sunday-1': lesson('u') }, classes, 't', 'sunday', 2, unknown), 0);
 assert.equal(cost({ 't-sunday-1': lesson('u', { facilityId: 'lab' }) }, classes, 't', 'sunday', 2, ground), 0);
 assert.equal(cost({ 't-monday-1': lesson('u') }, classes, 't', 'sunday', 2, ground), 0);
 assert.equal(cost({ 'other-sunday-1': lesson('u', { teacherId: 'other' }) }, classes, 't', 'sunday', 2, ground), 0);
});
test('counts both neighboring lessons and preserves travel across a free period', () => {
 assert.equal(cost({ 't-sunday-1': lesson('u') }, classes, 't', 'sunday', 3, ground), 2);
 assert.equal(cost({ 't-sunday-3': lesson('u') }, classes, 't', 'sunday', 2, ground), 3);
});
test('does not compare floors in different schools', () => {
 assert.equal(cost({ 't-sunday-1': lesson('u') }, classes, 't', 'sunday', 2, { ...ground, schoolId: 'second' }), 0);
});
