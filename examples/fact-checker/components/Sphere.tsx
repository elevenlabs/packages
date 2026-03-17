// Based on shader https://reactbits.dev/backgrounds/iridescence
import React from "react";
import {
  Canvas,
  Skia,
  Shader,
  Fill,
  useClock,
} from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import { useWindowDimensions } from "react-native";

const source = Skia.RuntimeEffect.Make(`
uniform vec3 uResolution;
uniform float uTime;
uniform float uHue;
uniform float uSaturation;

vec3 hueToRGB(float h) {
  float r = clamp(abs(h * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  float g = clamp(2.0 - abs(h * 6.0 - 2.0), 0.0, 1.0);
  float b = clamp(2.0 - abs(h * 6.0 - 4.0), 0.0, 1.0);
  return vec3(r, g, b);
}

vec4 main(vec2 FC) {
  vec4 o = vec4(0);
  vec2 p = vec2(0), c=p, u=FC.xy*2.-uResolution.xy;
  float a;
  for (float i=0; i<1e2; i++) {
    a = i/5e1-1.;
    p = cos(i*9.6+uTime+vec2(0,11))*sqrt(1.-a*a);
    c = u/uResolution.y+vec2(p.x,a)/(p.y+2.);
    o += (cos(i+vec4(0,2,4,0))+1.)/dot(c,c)*(1.-p.y)/7.5e3;
  }
  float lum = dot(o.rgb, vec3(0.299, 0.587, 0.114));
  vec3 tint = hueToRGB(uHue);
  vec3 colored = mix(vec3(lum), tint * lum, uSaturation);
  return vec4(colored, o.a);
}
`);

export default function Sphere(props: {
  paused?: boolean;
  /** 0 = red, 0.5 = yellow, 1 = green */
  hue?: number;
  /** 0 = grayscale, 1 = fully saturated (default 1) */
  saturation?: number;
  width?: number;
  height?: number;
}): React.JSX.Element {
  const clock = useClock();
  const pausedTime = useSharedValue(0);
  const lastClock = useSharedValue(0);
  const hue = useSharedValue(props.hue ?? 0.33);
  hue.value = withTiming(props.hue ?? 0.33, { duration: 300 });
  const saturation = useSharedValue(props.saturation ?? 1);
  saturation.value = withTiming(props.saturation ?? 1, { duration: 300 });

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const width = props.width ?? screenWidth;
  const height = props.height ?? screenHeight;

  const uniforms = useDerivedValue(() => {
    if (!props.paused) {
      pausedTime.value += clock.value - lastClock.value;
    }
    lastClock.value = clock.value;
    return {
      uResolution: [width, height, width / height],
      uTime: pausedTime.value / 3000,
      uHue: hue.value,
      uSaturation: saturation.value,
    };
  }, [clock, width, height, props.paused]);

  return (
    <Canvas style={{ flex: 1, backgroundColor: "black" }}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
