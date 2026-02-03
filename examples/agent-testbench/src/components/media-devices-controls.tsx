import { useCallback, useEffect } from "react";

export function MediaDevicesControls() {
  /*
    const { mediaDevices } = navigator;

    const handleDeviceChange = useCallback(() => {
        console.log('devicechange');
    }, []);

    useEffect(() => {
        mediaDevices.addEventListener('devicechange', handleDeviceChange);

        navigator.permissions.query({ name: 'microphone' }).then((result) => {
            console.log('permission result', result);
            result.addEventListener('change', () => {
                console.log('permission change', result);
            });
        });

        return () => {
            mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        };
    }, [handleDeviceChange]);
    */

  return (
    <div>
      <h1>Media Devices Controls</h1>
    </div>
  );
}
