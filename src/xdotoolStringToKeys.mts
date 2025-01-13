import { Key } from '@nut-tree-fork/nut-js';

const keyMap: Record<string, Key> = {
  // Function keys
  f1: Key.F1,
  f2: Key.F2,
  f3: Key.F3,
  f4: Key.F4,
  f5: Key.F5,
  f6: Key.F6,
  f7: Key.F7,
  f8: Key.F8,
  f9: Key.F9,
  f10: Key.F10,
  f11: Key.F11,
  f12: Key.F12,
  f13: Key.F13,
  f14: Key.F14,
  f15: Key.F15,
  f16: Key.F16,
  f17: Key.F17,
  f18: Key.F18,
  f19: Key.F19,
  f20: Key.F20,
  f21: Key.F21,
  f22: Key.F22,
  f23: Key.F23,
  f24: Key.F24,

  // Navigation
  home: Key.Home,
  left: Key.Left,
  up: Key.Up,
  right: Key.Right,
  down: Key.Down,
  page_up: Key.PageUp,
  pageup: Key.PageUp,
  prior: Key.PageUp,
  page_down: Key.PageDown,
  pagedown: Key.PageDown,
  next: Key.PageDown,
  end: Key.End,

  // Editing
  return: Key.Return,
  enter: Key.Return,
  tab: Key.Tab,
  space: Key.Space,
  backspace: Key.Backspace,
  delete: Key.Delete,
  del: Key.Delete,
  escape: Key.Escape,
  esc: Key.Escape,
  insert: Key.Insert,
  ins: Key.Insert,

  // Modifiers
  shift_l: Key.LeftShift,
  shift_r: Key.RightShift,
  l_shift: Key.LeftShift,
  r_shift: Key.RightShift,
  shift: Key.LeftShift,

  control_l: Key.LeftControl,
  control_r: Key.RightControl,
  l_control: Key.LeftControl,
  r_control: Key.RightControl,
  control: Key.LeftControl,
  ctrl_l: Key.LeftControl,
  ctrl_r: Key.RightControl,
  l_ctrl: Key.LeftControl,
  r_ctrl: Key.RightControl,
  ctrl: Key.LeftControl,

  alt_l: Key.LeftAlt,
  alt_r: Key.RightAlt,
  l_alt: Key.LeftAlt,
  r_alt: Key.RightAlt,
  alt: Key.LeftAlt,

  super_l: Key.LeftSuper,
  super_r: Key.RightSuper,
  l_super: Key.LeftSuper,
  r_super: Key.RightSuper,
  super: Key.LeftSuper,
  win_l: Key.LeftSuper,
  win_r: Key.RightSuper,
  l_win: Key.LeftSuper,
  r_win: Key.RightSuper,
  win: Key.LeftSuper,
  meta_l: Key.LeftSuper,
  meta_r: Key.RightSuper,
  l_meta: Key.LeftSuper,
  r_meta: Key.RightSuper,
  meta: Key.LeftSuper,
  command: Key.LeftSuper,
  command_l: Key.LeftSuper,
  l_command: Key.LeftSuper,
  command_r: Key.RightSuper,
  r_command: Key.RightSuper,
  cmd: Key.LeftSuper,
  cmd_l: Key.LeftSuper,
  l_cmd: Key.LeftSuper,
  cmd_r: Key.RightSuper,
  r_cmd: Key.RightSuper,

  caps_lock: Key.CapsLock,
  capslock: Key.CapsLock,
  caps: Key.CapsLock,

  // Keypad
  kp_0: Key.NumPad0,
  kp_1: Key.NumPad1,
  kp_2: Key.NumPad2,
  kp_3: Key.NumPad3,
  kp_4: Key.NumPad4,
  kp_5: Key.NumPad5,
  kp_6: Key.NumPad6,
  kp_7: Key.NumPad7,
  kp_8: Key.NumPad8,
  kp_9: Key.NumPad9,
  kp_divide: Key.Divide,
  kp_multiply: Key.Multiply,
  kp_subtract: Key.Subtract,
  kp_add: Key.Add,
  kp_decimal: Key.Decimal,
  kp_equal: Key.NumPadEqual,
  num_lock: Key.NumLock,
  numlock: Key.NumLock,

  // Letters
  a: Key.A,
  b: Key.B,
  c: Key.C,
  d: Key.D,
  e: Key.E,
  f: Key.F,
  g: Key.G,
  h: Key.H,
  i: Key.I,
  j: Key.J,
  k: Key.K,
  l: Key.L,
  m: Key.M,
  n: Key.N,
  o: Key.O,
  p: Key.P,
  q: Key.Q,
  r: Key.R,
  s: Key.S,
  t: Key.T,
  u: Key.U,
  v: Key.V,
  w: Key.W,
  x: Key.X,
  y: Key.Y,
  z: Key.Z,

  // Numbers
  0: Key.Num0,
  1: Key.Num1,
  2: Key.Num2,
  3: Key.Num3,
  4: Key.Num4,
  5: Key.Num5,
  6: Key.Num6,
  7: Key.Num7,
  8: Key.Num8,
  9: Key.Num9,

  // Punctuation
  minus: Key.Minus,
  equal: Key.Equal,
  bracketleft: Key.LeftBracket,
  bracketright: Key.RightBracket,
  bracket_l: Key.LeftBracket,
  bracket_r: Key.RightBracket,
  l_bracket: Key.LeftBracket,
  r_bracket: Key.RightBracket,
  backslash: Key.Backslash,
  semicolon: Key.Semicolon,
  semi: Key.Semicolon,
  quote: Key.Quote,
  grave: Key.Grave,
  comma: Key.Comma,
  period: Key.Period,
  slash: Key.Slash,

  // Media keys
  audio_mute: Key.AudioMute,
  mute: Key.AudioMute,
  audio_vol_down: Key.AudioVolDown,
  voldown: Key.AudioVolDown,
  vol_down: Key.AudioVolDown,
  audio_vol_up: Key.AudioVolUp,
  volup: Key.AudioVolUp,
  vol_up: Key.AudioVolUp,
  audio_play: Key.AudioPlay,
  play: Key.AudioPlay,
  audio_stop: Key.AudioStop,
  stop: Key.AudioStop,
  audio_pause: Key.AudioPause,
  pause: Key.AudioPause,
  audio_prev: Key.AudioPrev,
  audio_next: Key.AudioNext,
};

export class InvalidKeyError extends Error {
  constructor(key: string) {
    super(`Invalid key: ${key}`);
    this.name = 'InvalidKeyError';
  }
}

export const toKeys = (xdotoolString: string): Key[] => {
  if (!xdotoolString) {
    throw new InvalidKeyError('Empty string');
  }

  return xdotoolString.split('+').map((keyStr) => {
    const key = keyStr.trim().toLowerCase();
    const mappedKey = keyMap[key];

    if (mappedKey === undefined) {
      throw new InvalidKeyError(key);
    }

    return mappedKey;
  });
};
