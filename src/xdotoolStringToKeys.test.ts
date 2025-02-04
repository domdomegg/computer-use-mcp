import {describe, it, expect} from 'vitest';
import {Key} from '@nut-tree-fork/nut-js';
import {toKeys, InvalidKeyError} from './xdotoolStringToKeys.js';

describe('toKeys', () => {
	it('should convert single keys', () => {
		expect(toKeys('a')).toEqual([Key.A]);
		expect(toKeys('Return')).toEqual([Key.Return]);
		expect(toKeys('space')).toEqual([Key.Space]);
	});

	it('should convert key combinations', () => {
		expect(toKeys('Control_L+a')).toEqual([Key.LeftControl, Key.A]);
		expect(toKeys('Shift_L+Return')).toEqual([Key.LeftShift, Key.Return]);
		expect(toKeys('Alt_L+Tab')).toEqual([Key.LeftAlt, Key.Tab]);
		expect(toKeys('Control_L+Alt_L+Delete')).toEqual([Key.LeftControl, Key.LeftAlt, Key.Delete]);
	});

	it('should handle function keys', () => {
		expect(toKeys('F1')).toEqual([Key.F1]);
		expect(toKeys('F12')).toEqual([Key.F12]);
		expect(toKeys('Control_L+F5')).toEqual([Key.LeftControl, Key.F5]);
	});

	it('should handle navigation keys', () => {
		expect(toKeys('Home')).toEqual([Key.Home]);
		expect(toKeys('Left')).toEqual([Key.Left]);
		expect(toKeys('Page_Up')).toEqual([Key.PageUp]);
		expect(toKeys('Prior')).toEqual([Key.PageUp]); // Prior is an alias for Page_Up
	});

	it('should handle keypad keys', () => {
		expect(toKeys('KP_0')).toEqual([Key.NumPad0]);
		expect(toKeys('KP_Add')).toEqual([Key.Add]);
		expect(toKeys('Num_Lock')).toEqual([Key.NumLock]);
	});

	it('should handle case insensitivity', () => {
		expect(toKeys('RETURN')).toEqual([Key.Return]);
		expect(toKeys('Return')).toEqual([Key.Return]);
		expect(toKeys('return')).toEqual([Key.Return]);
		expect(toKeys('CONTROL_L+A')).toEqual([Key.LeftControl, Key.A]);
	});

	it('should handle whitespace', () => {
		expect(toKeys('Control_L + a')).toEqual([Key.LeftControl, Key.A]);
		expect(toKeys(' Return ')).toEqual([Key.Return]);
		expect(toKeys('Control_L + Alt_L + Delete')).toEqual([Key.LeftControl, Key.LeftAlt, Key.Delete]);
	});

	it('should throw InvalidKeyError for invalid keys', () => {
		expect(() => toKeys('')).toThrow(InvalidKeyError);
		expect(() => toKeys('invalid')).toThrow(InvalidKeyError);
		expect(() => toKeys('Control_L+invalid')).toThrow(InvalidKeyError);
		expect(() => toKeys('kp_enter')).toThrow(InvalidKeyError);
	});
});
