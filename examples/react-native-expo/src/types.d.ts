declare module 'react-native-slider' {
  import type { Component } from 'react';
  import type { ViewStyle } from 'react-native';

  interface SliderProps {
    value?: number;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    onValueChange?: (value: number) => void;
    disabled?: boolean;
    style?: ViewStyle;
    thumbStyle?: ViewStyle;
    trackStyle?: ViewStyle;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
  }

  export default class Slider extends Component<SliderProps> {}
}