// FILE PATH: src/model/api/iotApi.ts

import axiosInstance from '../services/axiosInstance';

export const iotApi = {
  /**
   * Triggers a full LED resync for a screen.
   * The backend re-publishes a SET_LED MQTT command for every seat in the
   * current showtime, restoring correct colours after an ESP32 reconnects.
   */
  resyncLeds: (screenId: number): Promise<void> =>
    axiosInstance
      .post(`/admin/screens/${screenId}/resync-leds`)
      .then(() => undefined),
};