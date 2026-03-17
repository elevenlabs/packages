// Based on shader https://reactbits.dev/backgrounds/iridescence
import React from "react";
import {
  Canvas,
  Skia,
  Shader,
  Fill,
  useClock,
} from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import { useWindowDimensions } from "react-native";


const source = Skia.RuntimeEffect.Make(`
uniform vec3 uResolution;
uniform float uTime;

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
  return o;
}
`);

export default function AgentSphereScene(props: {
  paused?: boolean;
  width?: number;
  height?: number;
}) {
  const clock = useClock();
  const pausedTime = useSharedValue(0);
  const lastClock = useSharedValue(0);

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
