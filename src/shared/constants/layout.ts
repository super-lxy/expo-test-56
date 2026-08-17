import { Dimensions } from 'react-native';

const screenHeight = Dimensions.get('window').height;

/** Shared height for the form's floating bottom sheets. */
export const FORM_SHEET_HEIGHT = Math.min(
  520,
  Math.max(440, screenHeight * 0.56),
  screenHeight * 0.72,
);
