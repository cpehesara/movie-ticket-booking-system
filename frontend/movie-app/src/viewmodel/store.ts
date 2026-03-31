// FILE PATH: src/viewmodel/store.ts

import { configureStore } from '@reduxjs/toolkit';
import authReducer    from './slices/authSlice';
import movieReducer   from './slices/movieSlice';
import seatReducer    from './slices/seatSlice';
import bookingReducer from './slices/bookingSlice';
import checkinReducer from './slices/checkinSlice';
import userReducer    from './slices/userSlice';
import adminReducer   from './slices/adminSlice';
import iotReducer     from './slices/iotSlice';

export const store = configureStore({
  reducer: {
    auth:     authReducer,
    movies:   movieReducer,
    seats:    seatReducer,
    bookings: bookingReducer,
    checkin:  checkinReducer,
    user:     userReducer,
    admin:    adminReducer,
    iot:      iotReducer,
  },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;