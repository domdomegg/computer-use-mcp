import { test, expect } from 'vitest';
import { multiply, sum } from './index';

test('adds positive numbers', () => {
  expect(sum(1, 3)).toBe(4);
  expect(sum(10001, 1345)).toBe(11346);
});

test('adds negative numbers', () => {
  expect(sum(-1, -3)).toBe(-4);
  expect(sum(-10001, -1345)).toBe(-11346);
});

test('adds a negative and positive number', () => {
  expect(sum(1, -3)).toBe(-2);
  expect(sum(-10001, 1345)).toBe(-8656);
});

test('multiplies positive numbers', () => {
  expect(multiply(1, 3)).toBe(3);
  expect(multiply(2, 3)).toBe(6);
  expect(multiply(10001, 1345)).toBe(13451345);
});
