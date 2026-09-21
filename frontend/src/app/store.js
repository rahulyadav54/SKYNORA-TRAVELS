import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import flightReducer from "../features/flightComponents/flightSlice";
import flightBookingReducer from "../features/flightBookingComponents/flightBookingSlice";
import { authReducer } from "../features/auth/auth.reducer";
import hotelReducer from "../HotelsSecondPage/hotelSlice";
import hotelBookingReducer from "../features/Hotel/hotelBooking";
import aiBookingReducer from "../features/AIChat/aiBookingSlice";
import localStorageMiddleware from "../middleware/localStorageMiddleware";

export const store = configureStore({
  reducer: {
    flight: flightReducer,
    flightBooking: flightBookingReducer,
    hotelBooking: hotelBookingReducer,
    aiBooking: aiBookingReducer,
    auth: authReducer,
    hotel: hotelReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});

console.log(store.getState());
